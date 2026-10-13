import { z } from "zod";

import { observe, phrase, speak, toBase64, transcribe, type Observation } from "./models";
import { building, records } from "./records";

type Env = { AI: Ai; ACCESS_CODE: string };

const historySchema = z.array(z.object({ question: z.string(), answer: z.string() }));

// Code, not the model, decides which facts are true and whether the camera contradicts them.
function brief(observation: Observation) {
  const mismatches = records.flatMap((record) =>
    (record.checks ?? []).flatMap((check) => {
      const seen = observation.checks[check.key];

      return seen !== null && seen !== check.expected ? [{ record, claim: check.claim }] : [];
    }),
  );

  const contradicted = mismatches.map((mismatch) => mismatch.record);

  const cited = records.filter((record) => observation.recordIds.includes(record.id) || contradicted.includes(record));

  const claims = mismatches.map((mismatch) => mismatch.claim);

  const lines = cited.map((record) => `${record.title} (${record.source}):\n${record.facts.join("\n")}`);

  lines.push(
    claims.length > 0
      ? `Mismatch: ${claims.join(" ")} The camera shows something different.`
      : "Mismatch: none. Do not mention any mismatch.",
  );

  if (observation.wantsHold) {
    lines.push(`Pending action: a free 48-hour hold on unit ${building.tourUnit}. Ask the renter to tap Confirm on screen. It is not held yet.`);
  }

  return {
    briefing: `Briefing:\n${cited.length > 0 ? "" : "No records match.\n\n"}${lines.join("\n\n")}`,
    citations: cited.map(({ id, title, source }) => ({ id, title, source })),
    mismatches: claims,
  };
}

async function ask(request: Request, env: Env) {
  const form = await request.formData();
  const audio = z.instanceof(File).parse(form.get("audio"));
  const image = z.string().startsWith("data:image/").parse(form.get("image"));
  const history = historySchema.parse(JSON.parse(z.string().parse(form.get("history"))));

  const question = await transcribe(env.AI, audio);
  const observation = await observe(env.AI, image, question, history.slice(-3));
  const { briefing, citations, mismatches } = brief(observation);
  const answer = await phrase(env.AI, question, observation.seen, briefing);
  const speech = await speak(env.AI, answer);

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
