import { Easing, Img, staticFile } from "remotion";

import { clamp01, progress } from "../../kit/time";
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

/** Words fill in at speaking pace, each keeping its slot so the card never reflows. */
function Spoken({ text, start, length, t }: { text: string; start: number; length: number; t: number }) {
  const words = text.split(" ");
  const shown = Math.floor(clamp01((t - start) / length) * words.length + 1);

  return (
    <p className="answer">
      {words.map((word, index) => (
        <span key={index} style={{ opacity: index < shown ? 1 : 0.18 }}>
          {word}{" "}
        </span>
      ))}
    </p>
  );
}

function Sources({ citations }: { citations: Citation[] }) {
  return (
    <ul className="sources">
      {citations.map((citation) => (
        <li key={citation.id}>
          <span className="tag">{citation.title}</span> {citation.source}
        </li>
      ))}
    </ul>
  );
}

function AnswerCard({ data, t, start }: { data: Captured; t: number; start: number }) {
  const enter = ease(progress(t, start, 0.35));

  return (
    <article className="card" style={{ opacity: enter, translate: `0 ${(1 - enter) * 18}px` }}>
      <p className="asked">"{data.question}"</p>
      {data.mismatches.map((mismatch) => (
        <p key={mismatch} className="mismatch">
          <span className="tag">Records mismatch</span> {mismatch} Flagged for the leasing team.
        </p>
      ))}
      <Spoken text={data.answer} start={start} length={data.answerSeconds} t={t} />
      <Sources citations={data.citations} />
    </article>
  );
}

function HoldCard({ t, start }: { t: number; start: number }) {
  const enter = ease(progress(t, start, 0.35));

  return (
    <article className="card" style={{ opacity: enter, translate: `0 ${(1 - enter) * 18}px` }}>
      <Spoken text={capture.hold.answer} start={start} length={capture.hold.answerSeconds} t={t} />
      <a className="apply">Start application for 4B</a>
      <Sources citations={capture.hold.citations} />
    </article>
  );
}

function Feed({ t }: { t: number }) {
  const stop = stopAt(t);
  const index = cues.stops.indexOf(stop);
  const previous = cues.stops[index - 1];
  const slide = previous && previous.data.photo !== stop.data.photo ? ease(progress(t, stop.enter, 0.6)) : 1;

  return (
    <>
      {previous && slide < 1 && (
        <Img className="camera" src={staticFile(`stops/${previous.data.photo}`)} style={{ translate: `${-slide * 100}% 0` }} />
      )}
      <Img className="camera" src={staticFile(`stops/${stop.data.photo}`)} style={{ translate: `${(1 - slide) * 100}% 0` }} />
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
              <p>"{data.question}"</p>
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
              <strong>Hold Unit 4B for 48 hours?</strong> Free, no deposit. It comes off the market while you apply.
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
          {status === "idle" && "Hold to ask"}
          {status === "listening" && "Listening"}
          {status === "thinking" && "Checking the records"}
          <Tap t={t} at={stop.press} lift={stop.release} />
        </button>
        <p className="footer">Concept demo for EliseAI AI-Guided Tours. Not affiliated with EliseAI.</p>
      </section>

      <Recap t={t} />
    </main>
  );
}
