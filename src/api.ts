import { z } from "zod";

const citationSchema = z.object({ id: z.string(), title: z.string(), source: z.string() });

const askSchema = z.object({
  question: z.string(),
  seen: z.string(),
  answer: z.string(),
  headline: z.string(),
  citations: z.array(citationSchema),
  mismatches: z.array(z.string()),
  pendingHold: z.boolean(),
  audio: z.string(),
});

const holdSchema = z.object({
  hold: z.object({ id: z.string(), unit: z.string(), expires: z.string() }),
  answer: z.string(),
  headline: z.string(),
  citations: z.array(citationSchema),
  audio: z.string(),
});

export type Citation = z.infer<typeof citationSchema>;

export type Turn = { question: string; answer: string };

async function post(path: string, code: string, body?: FormData) {
  const response = await fetch(path, { method: "POST", headers: { "x-access-code": code }, body });

  if (!response.ok) throw new Error(await response.text());

  return response;
}

export async function checkCode(code: string) {
  const response = await fetch("/api/check", { method: "POST", headers: { "x-access-code": code } });

  return response.ok;
}

export async function ask(code: string, audio: Blob, image: string, history: Turn[]) {
  const form = new FormData();
  const extension = audio.type.includes("mp4") ? "mp4" : "webm";

  form.set("audio", new File([audio], `question.${extension}`, { type: audio.type }));
  form.set("image", image);
  form.set("history", JSON.stringify(history));

  return askSchema.parse(await (await post("/api/ask", code, form)).json());
}

export async function holdUnit(code: string) {
  return holdSchema.parse(await (await post("/api/hold", code)).json());
}
