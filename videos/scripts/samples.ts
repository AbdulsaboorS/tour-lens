import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import capture from "../src/videos/tour/capture.json";

/**
 * Saves the captured answers for the app's sample tour, keyed by question. The app plays one only
 * when the live models are busy, and says so. Re-run after scripts/capture.ts.
 *
 *   bun scripts/samples.ts
 */
const root = resolve(import.meta.dirname, "..");
const audio = (file: string) => readFileSync(join(root, "public/audio/tour", file)).toString("base64");

const answers = Object.fromEntries(
  capture.stops.map((stop) => [
    stop.asked,
    {
      question: stop.asked,
      seen: stop.seen,
      answer: stop.answer,
      headline: stop.headline,
      citations: stop.citations,
      mismatches: stop.mismatches,
      pendingHold: stop.pendingHold,
      audio: audio(`${stop.id}-answer.mp3`),
    },
  ]),
);

writeFileSync(join(root, "../public/samples/saved.json"), `${JSON.stringify(answers)}\n`);
