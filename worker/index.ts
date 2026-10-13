import { z } from "zod";

import { observe, phrase, speak, transcribe, type Observation } from "./openai";
import { building, records } from "./records";

type Env = { OPENAI_API_KEY: string; ACCESS_CODE: string };

const historySchema = z.array(z.object({ question: z.string(), answer: z.string() }));

function toBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";

  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }

  return btoa(binary);
}

// Code, not the model, decides which facts are true and whether the camera contradicts them.
function brief(observation: Observation) {
  const cited = records.filter((record) => observation.recordIds.includes(record.id));

  const mismatches = cited.flatMap((record) => {
    const check = record.check;

    if (!check) return [];

    const seen = observation.checks[check.key];

    return seen === null || seen === check.expected ? [] : [check.claim];
  });

  const lines = cited.map((record) => `${record.title} (${record.source}):\n${record.facts.join("\n")}`);

  if (mismatches.length > 0) {
    lines.push(`Mismatch between camera and records: ${mismatches.join(" ")} The camera does not show this.`);
  }

  if (observation.wantsHold) {
    lines.push(`Pending action: a free 48-hour hold on unit ${building.tourUnit}. Ask the renter to tap Confirm on screen. It is not held yet.`);
  }

  return {
    briefing: lines.length > 0 ? `Briefing:\n${lines.join("\n\n")}` : "Briefing: no records match.",
    citations: cited.map(({ id, title, source }) => ({ id, title, source })),
    mismatches,
  };
}

async function ask(request: Request, env: Env) {
  const form = await request.formData();
  const audio = z.instanceof(File).parse(form.get("audio"));
  const image = z.string().startsWith("data:image/").parse(form.get("image"));
  const history = historySchema.parse(JSON.parse(z.string().parse(form.get("history"))));

  const question = await transcribe(env.OPENAI_API_KEY, audio);
  const observation = await observe(env.OPENAI_API_KEY, image, question, history.slice(-3));
  const { briefing, citations, mismatches } = brief(observation);
  const answer = await phrase(env.OPENAI_API_KEY, question, observation.seen, briefing);
  const speech = await speak(env.OPENAI_API_KEY, answer);

  return Response.json({
    question,
    seen: observation.seen,
    answer,
    citations,
    mismatches,
    pendingHold: observation.wantsHold,
    audio: toBase64(speech),
  });
}

async function hold(env: Env) {
  const expires = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const until = expires.toLocaleString("en-US", { weekday: "long", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
  const answer = `Done. Unit ${building.tourUnit} is held for you until ${until}, no deposit. Your application link is on screen.`;

  return Response.json({
    hold: { id: `H-${crypto.randomUUID().slice(0, 6).toUpperCase()}`, unit: building.tourUnit, expires: expires.toISOString() },
    answer,
    citations: records.flatMap(({ id, title, source }) => (id === "unit.hold" ? [{ id, title, source }] : [])),
    audio: toBase64(await speak(env.OPENAI_API_KEY, answer)),
  });
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (request.headers.get("x-access-code") !== env.ACCESS_CODE) {
      return new Response("Wrong access code", { status: 401 });
    }

    if (request.method === "POST" && pathname === "/api/check") return new Response("ok");

    if (request.method === "POST" && pathname === "/api/ask") return ask(request, env);

    if (request.method === "POST" && pathname === "/api/hold") return hold(env);

    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
