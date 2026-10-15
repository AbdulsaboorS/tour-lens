import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * Runs the film's tour through the live app and saves what it really said.
 *
 *   TOUR_CODE=... VOICE_URL=... bun scripts/capture.ts
 *
 * For each stop: speak the renter's question (Aura, a second voice), send it with the stop frame
 * to /api/ask as one continuing tour, then save the answer, citations, timings and the app's voice.
 * Ends with /api/hold. Needs macOS (sips, afinfo) and ffmpeg. Re-run after scripts/clips.py.
 */
const TOUR_URL = process.env.TOUR_URL ?? "https://tour-lens.feedback-signal.workers.dev";
const code = process.env.TOUR_CODE;
const voiceUrl = process.env.VOICE_URL;

if (!code || !voiceUrl) throw new Error("Set TOUR_CODE and VOICE_URL");

const root = resolve(import.meta.dirname, "..");
const audioDir = join(root, "public/audio/tour");
const tmp = join(root, "out/capture");

mkdirSync(audioDir, { recursive: true });
mkdirSync(tmp, { recursive: true });

// Film stops send a frame of the clip the phone shows, at about the moment the renter asks.
// The rest send the sample tour's room still, like the app does.
const stops = [
  { id: "washer", clip: "washer.mp4", at: 1.5, question: "What kind of washer is this? Can I use pods?" },
  { id: "window", room: "window.jpg", question: "What's the view like? Is there a unit with a better one?" },
  { id: "living-room", clip: "living-room.mp4", at: 1.5, question: "Does this furniture come with it? How big is this room?" },
  { id: "desk", room: "desk.jpg", question: "Could I work from home here?" },
  { id: "hold", clip: "living-room.mp4", at: 18, question: "I love it. Can you hold it for me?" },
];

function run(command: string[]) {
  const result = Bun.spawnSync(command);

  if (result.exitCode !== 0) throw new Error(`${command[0]} failed: ${result.stderr.toString()}`);

  return result.stdout.toString();
}

function seconds(file: string) {
  const match = run(["afinfo", file]).match(/estimated duration: ([\d.]+)/);

  if (!match) throw new Error(`No duration for ${file}`);

  return Number(match[1]);
}

async function speakAs(text: string, file: string) {
  const response = await fetch(voiceUrl!, { method: "POST", body: JSON.stringify({ text, speaker: "arcas" }) });

  if (!response.ok) throw new Error(`voice ${response.status}`);

  writeFileSync(file, new Uint8Array(await response.arrayBuffer()));
}

// The app sends a camera frame at most 512 px wide, so send the same.
function frame(stop: (typeof stops)[number]) {
  const out = join(tmp, `${stop.id}.jpg`);

  if (stop.clip) {
    run(["ffmpeg", "-loglevel", "error", "-y", "-ss", String(stop.at), "-i", join(root, "public/clips", stop.clip), "-frames:v", "1", "-vf", "scale=512:-2", out]);
  } else {
    run(["sips", "-s", "format", "jpeg", "--resampleWidth", "512", join(root, "../public/rooms", stop.room!), "--out", out]);
  }

  return `data:image/jpeg;base64,${readFileSync(out).toString("base64")}`;
}

const history: { question: string; answer: string }[] = [];
const captured = [];

for (const stop of stops) {
  const questionFile = join(audioDir, `${stop.id}-question.mp3`);

  await speakAs(stop.question, questionFile);

  const form = new FormData();

  form.set("audio", new File([readFileSync(questionFile)], "question.mp3", { type: "audio/mpeg" }));
  form.set("image", frame(stop));
  form.set("history", JSON.stringify(history));

  const started = Date.now();
  const response = await fetch(`${TOUR_URL}/api/ask`, { method: "POST", headers: { "x-access-code": code }, body: form });

  if (!response.ok) throw new Error(`${stop.id}: ${response.status} ${await response.text()}`);

  const result = await response.json();
  const elapsed = (Date.now() - started) / 1000;
  const answerFile = join(audioDir, `${stop.id}-answer.mp3`);

  writeFileSync(answerFile, Buffer.from(result.audio, "base64"));
  history.push({ question: result.question, answer: result.answer });
  captured.push({
    id: stop.id,
    clip: stop.clip ?? null,
    clipSeconds: stop.clip ? Number(run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", join(root, "public/clips", stop.clip)])) : null,
    asked: stop.question,
    question: result.question,
    seen: result.seen,
    answer: result.answer,
    headline: result.headline,
    citations: result.citations,
    mismatches: result.mismatches,
    pendingHold: result.pendingHold,
    responseSeconds: Math.round(elapsed * 10) / 10,
    serverTiming: response.headers.get("server-timing"),
    questionSeconds: seconds(questionFile),
    answerSeconds: seconds(answerFile),
  });
  console.log(`${stop.id} (${elapsed.toFixed(1)}s): ${result.answer}`);

  // Cerebras's free tier allows only a few requests a minute.
  await Bun.sleep(20_000);
}

const holdResponse = await fetch(`${TOUR_URL}/api/hold`, { method: "POST", headers: { "x-access-code": code } });
const hold = await holdResponse.json();
const holdFile = join(audioDir, "hold-done.mp3");

writeFileSync(holdFile, Buffer.from(hold.audio, "base64"));
console.log(`hold: ${hold.answer}`);

writeFileSync(
  join(root, "src/videos/tour/capture.json"),
  `${JSON.stringify({ capturedAt: new Date().toISOString(), stops: captured, hold: { ...hold, audio: undefined, answerSeconds: seconds(holdFile) } }, null, 2)}\n`,
);
