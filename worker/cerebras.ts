import { z } from "zod";

import { records } from "./records";

const API = "https://api.cerebras.ai/v1/chat/completions";

const MODEL = "gpt-oss-120b";

export type Turn = { question: string; answer: string };

const routeSchema = z.strictObject({
  recordIds: z.array(z.enum(records.map((record) => record.id))),
  wantsHold: z.boolean(),
});

const { $schema: _schema, ...routeJsonSchema } = z.toJSONSchema(routeSchema);

export type Route = z.infer<typeof routeSchema>;

const completionSchema = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string() }) })).min(1),
});

function send(key: string, request: string) {
  return fetch(API, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: request,
  });
}

async function complete(key: string, request: string) {
  let response = await send(key, request);

  // The free tier allows few requests per minute, so wait out one rate limit before giving up.
  if (response.status === 429) {
    const wait = Math.min(Number(response.headers.get("retry-after") ?? 2), 5);

    await new Promise((resolve) => setTimeout(resolve, wait * 1000));
    response = await send(key, request);
  }

  if (!response.ok) {
    const limits = [...response.headers].flatMap(([name, value]) => (name.startsWith("x-ratelimit") ? [`${name}=${value}`] : []));

    throw new Error(`Cerebras ${response.status}: ${await response.text()} ${limits.join(" ")}`);
  }

  return completionSchema.parse(await response.json()).choices[0].message.content.trim();
}

// The model only routes: it picks which records answer the question. It never states facts.
export async function route(key: string, question: string, seen: string, history: Turn[]) {
  const menu = records.map((record) => `- ${record.id}: ${record.about}`).join("\n");

  const recent = history.map((turn) => `Renter: ${turn.question}\nAgent: ${turn.answer}`).join("\n");

  const request = JSON.stringify({
    model: MODEL,
    reasoning_effort: "low",
    response_format: {
      type: "json_schema",
      json_schema: { name: "route", strict: true, schema: routeJsonSchema },
    },
    messages: [
      {
        role: "system",
        content: [
          "You route questions on a self-guided tour of apartment Unit 4B, a staged model unit.",
          "recordIds: every record needed to answer every part of the renter's question, most relevant first, at most 3. Questions about other or better units need units.compare_view. Use what the camera sees to resolve words like this or here. Empty if none apply.",
          `Records:\n${menu}`,
          "wantsHold: true only if the renter asks to hold, reserve or take this unit.",
          recent ? `Conversation so far:\n${recent}` : "",
        ].join("\n\n"),
      },
      { role: "user", content: `Camera sees: ${seen}\nRenter asks: ${question}` },
    ],
  });

  return routeSchema.parse(JSON.parse(await complete(key, request)));
}

const phraseSchema = z.strictObject({ spoken: z.string() });

const { $schema: _phraseSchema, ...phraseJsonSchema } = z.toJSONSchema(phraseSchema);

const noDashes = (text: string) => text.replaceAll(" \u2014 ", ", ").replaceAll("\u2014", ", ");

export async function phrase(key: string, question: string, seen: string, briefing: string) {
  const request = JSON.stringify({
    model: MODEL,
    reasoning_effort: "low",
    response_format: {
      type: "json_schema",
      json_schema: { name: "phrase", strict: true, schema: phraseJsonSchema },
    },
    messages: [
      {
        role: "system",
        content: [
          "You are the voice of a self-guided apartment tour, talking to a renter standing in Unit 4B.",
          "Answer the question they actually asked, out loud, in at most two short sentences, under 40 words total.",
          "Every fact in the briefing is true. Answer only from it, including facts about other units.",
          "Quote numbers exactly as written. Never add a number, brand, price or policy that isn't in the briefing.",
          "Don't do math and don't judge whether something fits. Give the measurement and let the renter compare.",
          "Don't name a brand or model the briefing says the camera contradicts.",
          "If the briefing has a mismatch that isn't none, lead with it, like this: The records list X here, but the camera shows something different, so I've flagged it for the leasing team.",
          "Only if no briefing fact answers the question, say the records don't cover it and offer to text the leasing team.",
          "Plain spoken sentences. No lists, no markdown, no greetings.",
        ].join(" "),
      },
      { role: "user", content: `Camera sees: ${seen}\nRenter asks: ${question}\n\n${briefing}` },
    ],
  });

  const { spoken } = phraseSchema.parse(JSON.parse(await complete(key, request)));

  return noDashes(spoken);
}
