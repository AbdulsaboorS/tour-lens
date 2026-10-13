import { z } from "zod";

import { records } from "./records";

const API = "https://api.openai.com/v1";

const models = {
  vision: "gpt-4.1-mini",
  answer: "gpt-4.1-mini",
  transcribe: "gpt-4o-mini-transcribe",
  speech: "gpt-4o-mini-tts",
};

export type Turn = { question: string; answer: string };

const checkKeys = records.flatMap((record) => (record.check ? [record.check.key] : []));

const observationSchema = z.strictObject({
  seen: z.string(),
  recordIds: z.array(z.enum(records.map((record) => record.id))),
  checks: z.strictObject(
    Object.fromEntries(checkKeys.map((key) => [key, z.boolean().nullable()])),
  ),
  wantsHold: z.boolean(),
});

// OpenAI's strict mode rejects the $schema keyword that zod adds.
const { $schema: _schema, ...observationJsonSchema } = z.toJSONSchema(observationSchema);

export type Observation = z.infer<typeof observationSchema>;

async function post(key: string, path: string, body: BodyInit, json: boolean) {
  const headers = new Headers({ Authorization: `Bearer ${key}` });

  if (json) headers.set("Content-Type", "application/json");

  const response = await fetch(`${API}${path}`, { method: "POST", headers, body });

  if (!response.ok) throw new Error(`OpenAI ${path} ${response.status}: ${await response.text()}`);

  return response;
}

const chatSchema = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string() }) })).min(1),
});

async function chat(key: string, request: string) {
  const response = await post(key, "/chat/completions", request, true);

  return chatSchema.parse(await response.json()).choices[0].message.content;
}

export async function transcribe(key: string, audio: File) {
  const form = new FormData();

  form.set("model", models.transcribe);
  form.set("file", audio);
  form.set("prompt", "A renter on an apartment tour asking about the unit.");

  const response = await post(key, "/audio/transcriptions", form, false);

  return z.object({ text: z.string() }).parse(await response.json()).text;
}

// The model only routes: it says what it sees and which records apply. It never states facts.
export async function observe(key: string, image: string, question: string, history: Turn[]) {
  const menu = records.map((record) => `- ${record.id}: ${record.about}`).join("\n");

  const checks = records.flatMap((record) =>
    record.check ? [`- ${record.check.key}: ${record.check.question}`] : [],
  );

  const recent = history.map((turn) => `Renter: ${turn.question}\nAgent: ${turn.answer}`).join("\n");

  const request = JSON.stringify({
    model: models.vision,
    temperature: 0,
    response_format: {
      type: "json_schema",
      json_schema: { name: "observation", strict: true, schema: observationJsonSchema },
    },
    messages: [
      {
        role: "system",
        content: [
          "You route questions on a self-guided apartment tour. Look at the camera frame and the renter's question.",
          "seen: one short phrase naming what the camera is pointed at, plain words.",
          "recordIds: the records needed to answer, most relevant first, at most 3. Empty if none apply.",
          `Records:\n${menu}`,
          "checks: answer each visual check from the frame only. null if the frame can't tell you.",
          `Checks:\n${checks.join("\n")}`,
          "wantsHold: true only if the renter asks to hold, reserve or take this unit.",
          recent ? `Conversation so far:\n${recent}` : "",
        ].join("\n\n"),
      },
      {
        role: "user",
        content: [
          { type: "text", text: question },
          { type: "image_url", image_url: { url: image, detail: "low" } },
        ],
      },
    ],
  });

  return observationSchema.parse(JSON.parse(await chat(key, request)));
}

export async function phrase(key: string, question: string, seen: string, briefing: string) {
  const request = JSON.stringify({
    model: models.answer,
    temperature: 0.4,
    messages: [
      {
        role: "system",
        content: [
          "You are the voice of a self-guided apartment tour. Answer out loud in one to three short sentences.",
          "Use only the facts in the briefing. Never add a number, brand, price or policy that isn't there.",
          "If the briefing lists a mismatch, lead with it plainly and say you've flagged it for the leasing team.",
          "If the facts don't answer the question, say the records don't cover it and offer to text the leasing team.",
          "No lists, no markdown, no greetings.",
        ].join(" "),
      },
      { role: "user", content: `Camera sees: ${seen}\nQuestion: ${question}\n\n${briefing}` },
    ],
  });

  return chat(key, request);
}

export async function speak(key: string, text: string) {
  const response = await post(
    key,
    "/audio/speech",
    JSON.stringify({
      model: models.speech,
      voice: "coral",
      input: text,
      instructions: "Warm, upbeat and concise, like a friendly leasing agent walking beside the renter.",
      response_format: "mp3",
    }),
    true,
  );

  return response.arrayBuffer();
}
