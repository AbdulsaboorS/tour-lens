import { useEffect, useRef, useState } from "react";

import { ask, checkCode, holdUnit, type Citation } from "./api";
import { createSpeaker, grabFrame, openCamera, startRecording } from "./media";

type Entry =
  | { kind: "answer"; question: string; seen: string; answer: string; citations: Citation[]; mismatches: string[] }
  | { kind: "hold"; answer: string; citations: Citation[]; holdId: string; expires: string };

type Status = "idle" | "listening" | "thinking";

const CODE_KEY = "tour-lens-code";

function savedCode() {
  try {
    return localStorage.getItem(CODE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function App() {
  const [code, setCode] = useState(savedCode);
  const [session, setSession] = useState<{ stream: MediaStream; speaker: ReturnType<typeof createSpeaker> }>();
  const [error, setError] = useState("");

  async function start() {
    setError("");

    const speaker = createSpeaker();

    await speaker.unlock();

    if (!(await checkCode(code))) {
      setError("That access code didn't work.");

      return;
    }

    try {
      localStorage.setItem(CODE_KEY, code);
    } catch {}

    try {
      setSession({ stream: await openCamera(), speaker });
    } catch {
      setError("Tour Lens needs your camera and microphone to see and hear your questions.");
    }
  }

  if (session) return <Tour code={code} stream={session.stream} speaker={session.speaker} />;

  return (
    <main className="gate">
      <p className="eyebrow">Self-guided tour</p>
      <h1>Larkspur Commons, Unit 4B</h1>
      <p className="lede">
        Point your camera at anything in the unit and ask. Answers come from this unit's records, with the source
        shown.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void start();
        }}
      >
        <label htmlFor="code">Tour access code</label>
        <input id="code" value={code} onChange={(event) => setCode(event.target.value)} autoComplete="off" />
        <button className="primary" type="submit" disabled={!code}>
          Start tour
        </button>
        {error && <p className="error">{error}</p>}
      </form>
      <Footer />
    </main>
  );
}

function Tour({ code, stream, speaker }: { code: string; stream: MediaStream; speaker: ReturnType<typeof createSpeaker> }) {
  const video = useRef<HTMLVideoElement>(null);
  const stopRecording = useRef<() => Promise<Blob>>(undefined);
  const pressedAt = useRef(0);
  const [status, setStatus] = useState<Status>("idle");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [pendingHold, setPendingHold] = useState(false);
  const [showRecap, setShowRecap] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (video.current) video.current.srcObject = stream;
  }, [stream]);

  function press() {
    if (status !== "idle") return;

    speaker.stop();
    setError("");
    pressedAt.current = Date.now();
    stopRecording.current = startRecording(stream);
    setStatus("listening");
  }

  async function release() {
    const stop = stopRecording.current;

    if (status !== "listening" || !stop || !video.current) return;

    stopRecording.current = undefined;

    const audio = await stop();

    if (Date.now() - pressedAt.current < 400) {
      setStatus("idle");

      return;
    }

    setStatus("thinking");

    try {
      const history = entries.flatMap((entry) => (entry.kind === "answer" ? [{ question: entry.question, answer: entry.answer }] : []));
      const result = await ask(code, audio, grabFrame(video.current), history);

      setEntries((previous) => [...previous, { kind: "answer", ...result }]);
      setPendingHold(result.pendingHold);
      void speaker.play(result.audio);
    } catch {
      setError("Couldn't get an answer. Try asking again.");
    } finally {
      setStatus("idle");
    }
  }

  async function confirmHold() {
    setPendingHold(false);
    setStatus("thinking");

    try {
      const result = await holdUnit(code);

      setEntries((previous) => [
        ...previous,
        { kind: "hold", answer: result.answer, citations: result.citations, holdId: result.hold.id, expires: result.hold.expires },
      ]);
      void speaker.play(result.audio);
    } catch {
      setError("The hold didn't go through. Try again.");
    } finally {
      setStatus("idle");
    }
  }

  const latest = entries.at(-1);

  return (
    <main className="tour">
      <video ref={video} className="camera" autoPlay playsInline muted />
      <header className="topbar">
        <div>
          <p className="eyebrow light">Self-guided tour</p>
          <p className="unit">Larkspur Commons, 4B</p>
        </div>
        <button className="ghost" onClick={() => setShowRecap(true)} disabled={entries.length === 0}>
          Recap
        </button>
      </header>

      <section className="sheet">
        {latest && <Card entry={latest} />}
        {pendingHold && (
          <div className="confirm">
            <p>
              <strong>Hold Unit 4B for 48 hours?</strong> Free, no deposit. It comes off the market while you apply.
            </p>
            <div className="row">
              <button className="primary" onClick={() => void confirmHold()}>
                Confirm hold
              </button>
              <button className="secondary" onClick={() => setPendingHold(false)}>
                Not now
              </button>
            </div>
          </div>
        )}
        {error && <p className="error">{error}</p>}
        <button
          className={`talk ${status}`}
          onPointerDown={press}
          onPointerUp={() => void release()}
          onPointerLeave={() => void release()}
          onContextMenu={(event) => event.preventDefault()}
          disabled={status === "thinking"}
        >
          {status === "idle" && "Hold to ask"}
          {status === "listening" && "Listening"}
          {status === "thinking" && "Checking the records"}
        </button>
        <Footer />
      </section>

      {showRecap && <Recap entries={entries} onClose={() => setShowRecap(false)} />}
    </main>
  );
}

function Card({ entry }: { entry: Entry }) {
  return (
    <article className="card">
      {entry.kind === "answer" && <p className="asked">"{entry.question}"</p>}
      {entry.kind === "answer" &&
        entry.mismatches.map((mismatch) => (
          <p key={mismatch} className="mismatch">
            <span className="tag">Records mismatch</span> {mismatch} Flagged for the leasing team.
          </p>
        ))}
      <p className="answer">{entry.answer}</p>
      {entry.kind === "hold" && (
        <a className="apply" href="#apply">
          Start application for 4B
        </a>
      )}
      {entry.citations.length > 0 && (
        <ul className="sources">
          {entry.citations.map((citation) => (
            <li key={citation.id}>
              <span className="tag">{citation.title}</span> {citation.source}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function Recap({ entries, onClose }: { entries: Entry[]; onClose: () => void }) {
  const flags = entries.flatMap((entry) => (entry.kind === "answer" ? entry.mismatches : []));
  const hold = entries.find((entry) => entry.kind === "hold");

  return (
    <div className="overlay">
      <section className="recap">
        <header className="row between">
          <div>
            <p className="eyebrow">For the leasing team</p>
            <h2>Tour recap, Unit 4B</h2>
          </div>
          <button className="secondary" onClick={onClose}>
            Close
          </button>
        </header>
        <dl className="stats">
          <div>
            <dt>Questions</dt>
            <dd>{entries.filter((entry) => entry.kind === "answer").length}</dd>
          </div>
          <div>
            <dt>Records flags</dt>
            <dd>{flags.length}</dd>
          </div>
          <div>
            <dt>Outcome</dt>
            <dd>{hold ? "Held" : "No hold"}</dd>
          </div>
        </dl>
        {flags.length > 0 && (
          <div className="mismatch">
            <span className="tag">Fix the listing</span> {flags.join(" ")}
          </div>
        )}
        <ol className="timeline">
          {entries.map((entry, index) => (
            <li key={index}>
              {entry.kind === "answer" ? (
                <>
                  <p className="mono">Pointed at {entry.seen}</p>
                  <p>"{entry.question}"</p>
                  <p className="muted">Answered from {entry.citations.map((citation) => citation.title).join(", ") || "no records"}</p>
                </>
              ) : (
                <>
                  <p className="mono">Hold {entry.holdId}</p>
                  <p>Held until {new Date(entry.expires).toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" })}</p>
                </>
              )}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function Footer() {
  return <p className="footer">Concept demo for EliseAI AI-Guided Tours. Not affiliated with EliseAI.</p>;
}
