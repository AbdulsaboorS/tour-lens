import { z } from "zod";

import { records } from "./records";

const models = {
  chat: "@cf/mistralai/mistral-small-3.1-24b-instruct",
  transcribe: "@cf/openai/whisper-large-v3-turbo",
  speech: "@cf/deepgram/aura-1",
} as const;

export type Turn = { question: string; answer: string };

const checks = records.flatMap((record) => record.checks ?? []);

const checkKeys = checks.map((check) => check.key);

const unknownChecks = Object.fromEntries(checkKeys.map((key) => [key, null]));

const observationSchema = z.object({
  seen: z.string(),
  recordIds: z.array(z.enum(records.map((record) => record.id))).catch([]),
  // The model sends null for the whole object when nothing in frame is checkable.
  checks: z
    .object(Object.fromEntries(checkKeys.map((key) => [key, z.boolean().nullable().catch(null)])))
    .nullable()
    .transform((checks) => checks ?? unknownChecks),
  wantsHold: z.boolean().catch(false),
});

// Workers AI hands back clean JSON already parsed, and fenced JSON as a string.
const observationResponse = z.union([
  observationSchema,
  z
    .string()
    .transform((text) => JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)))
    .pipe(observationSchema),
]);

const exampleObservation = JSON.stringify({
  seen: "window with roller shades",
  recordIds: ["window.view"],
  checks: unknownChecks,
  wantsHold: false,
});

export type Observation = z.infer<typeof observationSchema>;

export function toBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";

  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }

  return btoa(binary);
}

export async function transcribe(ai: Ai, audio: File) {
  const result = await ai.run(models.transcribe, {
    audio: toBase64(await audio.arrayBuffer()),
    language: "en",
    initial_prompt: "A renter on an apartment tour asking about the unit.",
  });

  return result.text.trim();
}

// The model only routes: it says what it sees and which records apply. It never states facts.
export async function observe(ai: Ai, image: string, question: string, history: Turn[]) {
  const menu = records.map((record) => `- ${record.id}: ${record.about}`).join("\n");

  const checkList = checks.map((check) => `- ${check.key}: ${check.question}`).join("\n");

  const recent = history.map((turn) => `Renter: ${turn.question}\nAgent: ${turn.answer}`).join("\n");

  const result = await ai.run(models.chat, {
    temperature: 0,
    messages: [
      {
        role: "system",
        content: [
          "You route questions on a self-guided apartment tour. Look at the camera frame and the renter's question.",
          `Reply with one JSON object only, shaped like this example: ${exampleObservation}`,
          "seen: one short phrase naming what the camera is pointed at, plain words.",
          "recordIds: the records needed to answer, most relevant first, at most 3. Empty if none apply.",
          `Records:\n${menu}`,
          "checks: answer each visual check from the frame only. Answer true or false whenever the thing it asks about is in frame. null only when it isn't in frame or can't be read.",
          `Checks:\n${checkList}`,
          "wantsHold: true only if the renter asks to hold, reserve or take this unit.",
          recent ? `Conversation so far:\n${recent}` : "",
        ].join("\n\n"),
      },
      {
        role: "user",
        content: [
          { type: "text", text: question },
          { type: "image_url", image_url: { url: image } },
        ],
      },
    ],
  });

  return observationResponse.parse(result.response);
}

export async function phrase(ai: Ai, question: string, seen: string, briefing: string) {
  const result = await ai.run(models.chat, {
    temperature: 0.4,
    max_tokens: 90,
    messages: [
      {
        role: "system",
        content: [
          "You are the voice of a self-guided apartment tour, talking to a renter standing in the unit.",
          "Answer out loud in at most two short sentences, under 40 words total.",
          "Every fact in the briefing is true. Answer from it, including facts about other units.",
          "Quote numbers exactly as written, never rounded. Never add a number, brand, price or policy that isn't in the briefing.",
          "Don't do math and don't judge whether something fits. Give the measurement and let the renter compare.",
          "Don't name a brand or model the briefing says the camera contradicts.",
          "If the briefing has a mismatch that isn't none, start with it: what the records say, then that what you see doesn't match, then that you've flagged it for the leasing team. For example: The records list an LG washer here, but this looks like a different brand, so I've flagged it for the leasing team.",
          "Only if no briefing fact answers the question, say the records don't cover it and offer to text the leasing team.",
          "No lists, no markdown, no greetings.",
        ].join(" "),
      },
      { role: "user", content: `Camera sees: ${seen}\nQuestion: ${question}\n\n${briefing}` },
    ],
  });

  return z.string().parse(result.response).trim();
}

export async function speak(ai: Ai, text: string) {
  const response = await ai.run(
    models.speech,
    { text, speaker: "asteria", encoding: "mp3" },
    { returnRawResponse: true },
  );

  return response.arrayBuffer();
}
