import { z } from "zod";

import { records } from "./records";

const models = {
  vision: "@cf/mistralai/mistral-small-3.1-24b-instruct",
  transcribe: "@cf/openai/whisper-large-v3-turbo",
  speech: "@cf/deepgram/aura-1",
} as const;

const checks = records.flatMap((record) => record.checks ?? []);

const checkKeys = checks.map((check) => check.key);

const unknownChecks = Object.fromEntries(checkKeys.map((key) => [key, null]));

const sightSchema = z.object({
  seen: z.string(),
  // The model sends null for the whole object when nothing in frame is checkable.
  checks: z
    .object(Object.fromEntries(checkKeys.map((key) => [key, z.boolean().nullable().catch(null)])))
    .nullable()
    .transform((checks) => checks ?? unknownChecks),
});

// Workers AI hands back clean JSON already parsed, and fenced JSON as a string.
const sightResponse = z.union([
  sightSchema,
  z
    .string()
    .transform((text) => JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)))
    .pipe(sightSchema),
]);

const exampleSight = JSON.stringify({ seen: "window with roller shades", checks: unknownChecks });

export type Sight = z.infer<typeof sightSchema>;

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

// The vision model only looks. It names what's in frame and answers yes/no checks.
export async function look(ai: Ai, image: string, question: string) {
  const checkList = checks.map((check) => `- ${check.key}: ${check.question}`).join("\n");

  const result = await ai.run(models.vision, {
    temperature: 0,
    messages: [
      {
        role: "system",
        content: [
          "You are the eyes of a self-guided apartment tour. Look at the camera frame.",
          `Reply with one JSON object only, shaped like this example: ${exampleSight}`,
          "seen: one short phrase naming what the camera is pointed at, plain words. Include any brand name you can read.",
          "checks: answer each check from the frame only. Answer true or false whenever the thing it asks about is in frame. null only when it isn't in frame or can't be read.",
          `Checks:\n${checkList}`,
        ].join("\n\n"),
      },
      {
        role: "user",
        content: [
          { type: "text", text: `The renter asked: ${question}` },
          { type: "image_url", image_url: { url: image } },
        ],
      },
    ],
  });

  return sightResponse.parse(result.response);
}

export async function speak(ai: Ai, text: string) {
  const response = await ai.run(
    models.speech,
    { text, speaker: "asteria", encoding: "mp3" },
    { returnRawResponse: true },
  );

  // Under load Workers AI sometimes hands back no audio. The card still shows the answer, so the
  // renter gets it silently instead of an error.
  return response instanceof Response && response.ok ? response.arrayBuffer() : new ArrayBuffer(0);
}
