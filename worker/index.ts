import { z } from "zod";

import { phrase, route, type Route } from "./cerebras";
import { look, speak, toBase64, transcribe, type Sight } from "./workers-ai";
import { building, records } from "./records";

type Env = { AI: Ai; ACCESS_CODE: string; CEREBRAS_API_KEY: string };

const historySchema = z.array(z.object({ question: z.string(), answer: z.string() }));

// Code, not the model, decides which facts are true and whether the camera contradicts them.
function brief(sight: Sight, picked: Route) {
  const mismatches = records.flatMap((record) =>
    (record.checks ?? []).flatMap((check) => {
      const seen = sight.checks[check.key];

      return seen !== null && seen !== check.expected ? [{ record, claim: check.claim, fact: check.fact }] : [];
    }),
  );

  const contradicted = mismatches.map((mismatch) => mismatch.record);

  const cited = records.filter(
    (record) =>
      picked.recordIds.includes(record.id) ||
      contradicted.includes(record) ||
      (picked.wantsHold && record.id === "unit.hold"),
  );

  const claims = mismatches.map((mismatch) => mismatch.claim);
  const withheld = mismatches.map((mismatch) => mismatch.fact);

  const lines = cited.map(
    (record) => `${record.title} (${record.source}):\n${record.facts.filter((fact) => !withheld.includes(fact)).join("\n")}`,
  );

  lines.push(
    claims.length > 0
      ? `Mismatch: ${claims.join(" ")} The camera shows something different.`
      : "Mismatch: none. Do not mention any mismatch.",
  );

  if (picked.wantsHold) {
    lines.push(`Pending action: a free 48-hour hold on unit ${building.tourUnit}. It is not held yet. Tell the renter you can hold it and ask them to tap Confirm on screen.`);
  }

  const shown = cited.filter((record) => !contradicted.includes(record)).slice(0, 2);

  return {
    headline: shown.map((record) => record.gist).join(" \u00b7 ") || "Not in the records",
    briefing: `Briefing:\n${cited.length > 0 ? "" : "No records match.\n\n"}${lines.join("\n\n")}`,
    citations: cited.map(({ id, title, source }) => ({ id, title, source })),
    mismatches: claims,
  };
}

async function ask(request: Request, env: Env) {
  const form = await request.formData();
  const typed = z.string().min(1).optional().parse(form.get("question") ?? undefined);
  const image = z.string().startsWith("data:image/").parse(form.get("image"));
  const history = historySchema.parse(JSON.parse(z.string().parse(form.get("history"))));

  const timings: string[] = [];

  async function timed<T>(name: string, step: Promise<T>) {
    const start = Date.now();

    const result = await step.catch((cause: Error) => {
      throw new Error(`${name} failed: ${cause.message}`, { cause });
    });

    timings.push(`${name};dur=${Date.now() - start}`);

    return result;
  }

  // The sample tour's suggested questions arrive as text, so there's nothing to transcribe.
  const question = typed ?? (await timed("transcribe", transcribe(env.AI, z.instanceof(File).parse(form.get("audio")))));

  const sight = await timed("look", look(env.AI, image, question));
  const picked = await timed("route", route({ key: env.CEREBRAS_API_KEY, ai: env.AI }, question, sight.seen, history.slice(-3)));
  const { headline, briefing, citations, mismatches } = brief(sight, picked);
  const answer = await timed("phrase", phrase({ key: env.CEREBRAS_API_KEY, ai: env.AI }, question, sight.seen, briefing));
  const speech = await timed("speak", speak(env.AI, answer));

  return Response.json({
    question,
    seen: sight.seen,
    answer,
    headline,
    citations,
    mismatches,
    pendingHold: picked.wantsHold,
    audio: toBase64(speech),
  }, { headers: { "Server-Timing": timings.join(", ") } });
}

async function hold(env: Env) {
  const expires = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const answer = `Done. Unit ${building.tourUnit} is held for you for 48 hours, no deposit. Your application link is on screen.`;
  const headline = `${building.tourUnit} held for 48 hours`;

  return Response.json({
    hold: { id: `H-${crypto.randomUUID().slice(0, 6).toUpperCase()}`, unit: building.tourUnit, expires: expires.toISOString() },
    answer,
    headline,
    citations: records.flatMap(({ id, title, source }) => (id === "unit.hold" ? [{ id, title, source }] : [])),
    audio: toBase64(await speak(env.AI, answer)),
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
