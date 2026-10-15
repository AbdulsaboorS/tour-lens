import { useEffect, useRef, useState, type RefObject } from "react";

import { ask, checkCode, holdUnit, savedAnswer, type Citation } from "./api";
import { createSpeaker, grabFrame, openCamera, openMic, startRecording } from "./media";
import { rooms, Walk } from "./Walk";

type Entry =
  | {
      kind: "answer";
      question: string;
      seen: string;
      answer: string;
      headline: string;
      citations: Citation[];
      mismatches: string[];
      saved?: boolean;
    }
  | { kind: "hold"; answer: string; headline: string; citations: Citation[]; holdId: string; expires: string };

type Status = "idle" | "listening" | "thinking";

type Session = {
  speaker: ReturnType<typeof createSpeaker>;
  // The sample tour walks photos of the unit. Otherwise the renter is there with the live camera.
  sample: boolean;
  stream?: MediaStream;
};

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
  const [session, setSession] = useState<Session>();
  const [error, setError] = useState("");

  async function start(sample: boolean) {
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

    if (sample) {
      // Without a mic the suggested questions still work, so a denied prompt isn't a dead end.
      setSession({ speaker, sample, stream: await openMic().catch(() => undefined) });

      return;
    }

    try {
      setSession({ speaker, sample, stream: await openCamera() });
    } catch {
      setError("Tour Lens needs your camera and microphone to see and hear your questions.");
    }
  }

  if (session) return <Tour code={code} session={session} />;

  return (
    <main className="gate">
      <p className="eyebrow">Self-guided tour</p>
      <h1>Larkspur Commons, Unit 4B</h1>
      <p className="lede">
        An AI tour guide that sees what you're pointing at. Tap the button and ask about anything in the unit.
        Answers come from the unit's records, with the source shown.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void start(true);
        }}
      >
        <label htmlFor="code">Tour access code</label>
        <input id="code" value={code} onChange={(event) => setCode(event.target.value)} autoComplete="off" />
        <button className="primary" type="submit" disabled={!code}>
          Walk the sample unit
        </button>
        <p className="muted small">Photos of a staged unit stand in for your camera. Drag to look around, walk between rooms.</p>
        <button className="secondary" type="button" disabled={!code} onClick={() => void start(false)}>
          I'm at the unit, use my camera
        </button>
        {error && <p className="error">{error}</p>}
      </form>
      <Footer />
    </main>
  );
}

function Camera({ stream, grab }: { stream: MediaStream; grab: RefObject<(() => string) | undefined> }) {
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (video.current) video.current.srcObject = stream;

    grab.current = () => (video.current ? grabFrame(video.current) : "");
  }, [stream, grab]);

  return <video ref={video} className="camera" autoPlay playsInline muted />;
}

function Tour({ code, session }: { code: string; session: Session }) {
  const { speaker, sample, stream } = session;
  const grab = useRef<() => string>(undefined);
  const stopRecording = useRef<() => Promise<Blob>>(undefined);
  const pressedAt = useRef(0);
  const [room, setRoom] = useState(rooms[0]);
  const [status, setStatus] = useState<Status>("idle");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [pendingHold, setPendingHold] = useState(false);
  const [showRecap, setShowRecap] = useState(false);
  const [error, setError] = useState("");

  function press() {
    if (status !== "idle" || !stream) return;

    speaker.stop();
    setError("");
    pressedAt.current = Date.now();
    stopRecording.current = startRecording(stream);
    setStatus("listening");
  }

  async function release() {
    const stop = stopRecording.current;

    if (status !== "listening" || !stop) return;

    stopRecording.current = undefined;
    setStatus("thinking");

    const audio = await stop();

    if (Date.now() - pressedAt.current < 400) {
      setStatus("idle");

      return;
    }

    await send({ audio });
  }

  async function send(input: { audio: Blob } | { question: string }) {
    speaker.stop();
    setError("");
    setStatus("thinking");

    try {
      const history = entries.flatMap((entry) => (entry.kind === "answer" ? [{ question: entry.question, answer: entry.answer }] : []));

      const result = await ask(code, input, grab.current?.() ?? "", history).catch(async () => {
        // The free model tiers rate-limit under load. A sample question can fall back to its saved answer.
        const saved = "question" in input ? await savedAnswer(input.question) : undefined;

        if (!saved) throw new Error("No saved answer for this question");

        return { ...saved, saved: true };
      });

      setEntries((previous) => [...previous, { kind: "answer", ...result }]);
      setPendingHold(result.pendingHold);

      if (result.audio) void speaker.play(result.audio);
    } catch {
      setError("The live models are busy. Give it a few seconds and ask again.");
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
        { kind: "hold", answer: result.answer, headline: result.headline, citations: result.citations, holdId: result.hold.id, expires: result.hold.expires },
      ]);

      if (result.audio) void speaker.play(result.audio);
    } catch {
      setError("The hold didn't go through. Try again.");
    } finally {
      setStatus("idle");
    }
  }

  const latest = entries.at(-1);

  return (
    <main className="tour">
      {sample ? <Walk key={room.id} room={room} grab={grab} /> : stream && <Camera stream={stream} grab={grab} />}
      <header className="topbar">
        <div>
          <p className="eyebrow light">{sample ? "Sample tour, staged unit" : "Self-guided tour"}</p>
          <p className="unit">Larkspur Commons, 4B</p>
        </div>
        <button className="ghost" onClick={() => setShowRecap(true)} disabled={entries.length === 0}>
          Recap
        </button>
      </header>
      {sample && (
        <nav className="rooms">
          {rooms.map((candidate) => (
            <button
              key={candidate.id}
              className={candidate.id === room.id ? "here" : ""}
              onClick={() => setRoom(candidate)}
              disabled={status !== "idle"}
            >
              {candidate.label}
            </button>
          ))}
        </nav>
      )}

      <section className="sheet">
        {status === "thinking" ? (
          <p className="card thinking" role="status">
            <span className="dots" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            Looking and checking the records
          </p>
        ) : (
          latest && <Card entry={latest} />
        )}
        {pendingHold && (
          <div className="confirm">
            <p>
              <strong>Hold 4B for 48 hours?</strong> Free, no deposit.
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
        {sample && status === "idle" && !pendingHold && (
          <div className="suggestions">
            {room.suggestions.map((question) => (
              <button key={question} onClick={() => void send({ question })}>
                {question}
              </button>
            ))}
          </div>
        )}
        <button
          className={`talk ${status}`}
          onClick={() => (status === "listening" ? void release() : press())}
          disabled={status === "thinking" || !stream}
        >
          {!stream && "Mic off, tap a question above"}
          {stream && status === "idle" && "Tap to ask"}
          {stream && status === "listening" && "Listening, tap when done"}
          {stream && status === "thinking" && "Thinking"}
        </button>
        <Footer />
      </section>

      {showRecap && <Recap entries={entries} onClose={() => setShowRecap(false)} />}
    </main>
  );
}

// The voice gives the full answer, so the card only shows the gist and where it came from.
function Card({ entry }: { entry: Entry }) {
  return (
    <article className="card">
      {entry.kind === "answer" &&
        entry.mismatches.map((mismatch) => (
          <p key={mismatch} className="mismatch">
            <span className="tag">Flagged</span> {mismatch}
          </p>
        ))}
      <p className="headline">{entry.headline}</p>
      {entry.kind === "answer" && entry.saved && <p className="muted small">Live models busy, so this is a saved answer from the same app.</p>}
      {entry.kind === "hold" && (
        <a className="apply" href="#apply">
          Start application
        </a>
      )}
      {entry.citations.length > 0 && (
        <p className="sources">
          {entry.citations.map((citation) => (
            <span key={citation.id} className="tag" title={citation.source}>
              {citation.title}
            </span>
          ))}
        </p>
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
