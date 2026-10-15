import { Easing, Loop, OffthreadVideo, Sequence, staticFile, useVideoConfig } from "remotion";

import { progress } from "../../kit/time";
import capture from "./capture.json";
import { cues, stopAt, type Captured } from "./cues";

/**
 * A frame-driven twin of the tour screen in src/App.tsx. The real component holds React state and
 * reads the camera and microphone, so this one redraws the same markup and classes from `t`.
 */
const ease = Easing.bezier(0.22, 1, 0.36, 1);

export const SCREEN = { w: 390, h: 844 };

type Citation = { id: string; title: string; source: string };

function Tap({ t, at, lift }: { t: number; at: number; lift: number }) {
  if (t < at - 0.3 || t > lift + 0.3) return null;

  const arrive = ease(progress(t, at - 0.3, 0.3));
  const leave = progress(t, lift, 0.3);
  const pressed = t >= at && t < lift ? 0.86 : 1;

  return (
    <span
      style={{
        position: "absolute",
        // Off to the side of the label, so the finger never covers the button's text.
        left: "84%",
        top: "62%",
        width: 46,
        height: 46,
        marginLeft: -23,
        marginTop: -23,
        borderRadius: 999,
        background: "rgb(255 255 255 / 38%)",
        boxShadow: "inset 0 0 0 2px rgb(255 255 255 / 70%)",
        opacity: arrive * (1 - leave),
        scale: String(pressed),
        pointerEvents: "none",
      }}
    />
  );
}

function Sources({ citations }: { citations: Citation[] }) {
  return (
    <p className="sources">
      {citations.map((citation) => (
        <span key={citation.id} className="tag">
          {citation.title}
        </span>
      ))}
    </p>
  );
}

function AnswerCard({ data, t, start }: { data: Captured; t: number; start: number }) {
  const enter = ease(progress(t, start, 0.35));

  return (
    <article className="card" style={{ opacity: enter, translate: `0 ${(1 - enter) * 18}px` }}>
      {data.mismatches.map((mismatch) => (
        <p key={mismatch} className="mismatch">
          <span className="tag">Flagged</span> {mismatch}
        </p>
      ))}
      <p className="headline">{data.headline}</p>
      <Sources citations={data.citations} />
    </article>
  );
}

function HoldCard({ t, start }: { t: number; start: number }) {
  const enter = ease(progress(t, start, 0.35));

  return (
    <article className="card" style={{ opacity: enter, translate: `0 ${(1 - enter) * 18}px` }}>
      <p className="headline">{capture.hold.headline}</p>
      <a className="apply">Start application</a>
      <Sources citations={capture.hold.citations} />
    </article>
  );
}

/** Stops that share a clip keep it rolling, so it starts at the first of them. */
function clipStart(stop: (typeof cues.stops)[number]) {
  const run = cues.stops.slice(0, cues.stops.indexOf(stop) + 1);
  const first = run.findLast((candidate, index) => index === 0 || run[index - 1].data.clip !== candidate.data.clip);

  return first?.enter ?? stop.enter;
}

// The clips play forward then back, so looping them never jumps.
function Clip({ stop, style }: { stop: (typeof cues.stops)[number]; style: React.CSSProperties }) {
  const { fps } = useVideoConfig();

  return (
    <div className="camera" style={{ overflow: "hidden", ...style }}>
      <Sequence from={Math.round(clipStart(stop) * fps)} layout="none">
        <Loop durationInFrames={Math.floor(stop.data.clipSeconds * fps)} layout="none">
          <OffthreadVideo className="camera" src={staticFile(`clips/${stop.data.clip}`)} muted />
        </Loop>
      </Sequence>
    </div>
  );
}

function Feed({ t }: { t: number }) {
  const stop = stopAt(t);
  const index = cues.stops.indexOf(stop);
  const previous = cues.stops[index - 1];
  const slide = previous && previous.data.clip !== stop.data.clip ? ease(progress(t, stop.enter, 0.6)) : 1;

  return (
    <>
      {previous && slide < 1 && <Clip stop={previous} style={{ translate: `${-slide * 100}% 0` }} />}
      <Clip stop={stop} style={{ translate: `${(1 - slide) * 100}% 0` }} />
    </>
  );
}

function Recap({ t }: { t: number }) {
  const open = ease(progress(t, cues.recap + 0.15, 0.45));

  if (open === 0) return null;

  const asked = cues.stops.map((stop) => stop.data);
  const flags = asked.flatMap((data) => data.mismatches);
  const holdStop = cues.stops.find((stop) => stop.done !== undefined);

  return (
    <div className="overlay" style={{ opacity: open }}>
      <section className="recap" style={{ translate: `0 ${(1 - open) * 100}%` }}>
        <header className="row between">
          <div>
            <p className="eyebrow">For the leasing team</p>
            <h2>Tour recap, Unit 4B</h2>
          </div>
          <button className="secondary">Close</button>
        </header>
        <dl className="stats">
          <div>
            <dt>Questions</dt>
            <dd>{asked.length}</dd>
          </div>
          <div>
            <dt>Records flags</dt>
            <dd>{flags.length}</dd>
          </div>
          <div>
            <dt>Outcome</dt>
            <dd>{holdStop ? "Held" : "No hold"}</dd>
          </div>
        </dl>
        {flags.length > 0 && (
          <div className="mismatch">
            <span className="tag">Fix the listing</span> {flags.join(" ")}
          </div>
        )}
        <ol className="timeline">
          {asked.map((data) => (
            <li key={data.id}>
              <p className="mono">Pointed at {data.seen}</p>
              <p>"{data.asked}"</p>
              <p className="muted">Answered from {data.citations.map((citation) => citation.title).join(", ")}</p>
            </li>
          ))}
          {holdStop && (
            <li>
              <p className="mono">Hold {capture.hold.hold.id}</p>
              <p>Held 48 hours, no deposit</p>
            </li>
          )}
        </ol>
      </section>
    </div>
  );
}

export function TourPhone({ t }: { t: number }) {
  const stop = stopAt(t);
  const thinking = (t >= stop.release && t < stop.answer) || (stop.confirm !== undefined && stop.done !== undefined && t >= stop.confirm && t < stop.done);
  const listening = t >= stop.press && t < stop.release;
  const status = listening ? "listening" : thinking ? "thinking" : "idle";
  const pendingHold = stop.confirm !== undefined && t >= stop.answer && t < stop.confirm + 0.25;
  const showHoldCard = stop.done !== undefined && t >= stop.done;
  const showAnswer = t >= stop.answer && !showHoldCard;

  return (
    <main className="tour" style={{ width: SCREEN.w, height: SCREEN.h }}>
      <Feed t={t} />
      <header className="topbar">
        <div>
          <p className="eyebrow light">Self-guided tour</p>
          <p className="unit">Larkspur Commons, 4B</p>
        </div>
        <button className="ghost" style={{ position: "relative" }}>
          Recap
          <Tap t={t} at={cues.recap} lift={cues.recap + 0.15} />
        </button>
      </header>

      <section className="sheet">
        {showAnswer && <AnswerCard data={stop.data} t={t} start={stop.answer} />}
        {showHoldCard && stop.done !== undefined && <HoldCard t={t} start={stop.done} />}
        {pendingHold && (
          <div className="confirm">
            <p>
              <strong>Hold 4B for 48 hours?</strong> Free, no deposit.
            </p>
            <div className="row">
              <button className="primary" style={{ position: "relative" }}>
                Confirm hold
                {stop.confirm !== undefined && <Tap t={t} at={stop.confirm - 0.05} lift={stop.confirm + 0.12} />}
              </button>
              <button className="secondary">Not now</button>
            </div>
          </div>
        )}
        <button className={`talk ${status}`} style={{ position: "relative" }}>
          {status === "idle" && "Tap to ask"}
          {status === "listening" && "Listening, tap when done"}
          {status === "thinking" && "Checking the records"}
          <Tap t={t} at={stop.press} lift={stop.press + 0.15} />
          <Tap t={t} at={stop.release - 0.15} lift={stop.release} />
        </button>
        <p className="footer">Concept demo for EliseAI AI-Guided Tours. Not affiliated with EliseAI.</p>
      </section>

      <Recap t={t} />
    </main>
  );
}
