import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadInterTight } from "@remotion/google-fonts/InterTight";
import { loadFont as loadPlexMono } from "@remotion/google-fonts/IBMPlexMono";
import { AbsoluteFill, Audio, Easing, Sequence, staticFile, useVideoConfig } from "remotion";

import "../../../../src/styles.css";
import "./film.css";
import { Punchlines, type Card } from "../../kit/punchlines";
import { progress, useTime } from "../../kit/time";
import { b, cues, mismatchStop } from "./cues";
import { SCREEN, TourPhone } from "./TourPhone";

loadInter("normal", { weights: ["400", "500"] });

loadInterTight("normal", { weights: ["500", "600"] });

loadPlexMono("normal", { weights: ["500"] });

export type Layout = "wide" | "tall";

const ease = Easing.bezier(0.22, 1, 0.36, 1);

const color = { night: "#0f042d", white: "#ffffff", lavender: "#c1b8ff", muted: "#a9a8a6" };

const fonts = { display: '"Inter Tight", sans-serif', body: '"Inter", sans-serif', mono: '"IBM Plex Mono", monospace' };

const firstStop = cues.stops[0];

function punchlines(layout: Layout): Card[] {
  const wide = layout === "wide";

  const opening: Card = {
    lines: [
      [{ text: "An AI", at: b(1, 1) }, { text: "tour guide", at: b(1, 1, 0.5) }],
      [{ text: "that answers", at: b(1, 2) }, { text: "your", at: b(1, 2, 0.5) }],
      [{ text: "questions,", at: b(1, 3) }, { text: "live.", at: b(1, 3, 0.5), accent: true }],
    ],
    out: wide ? firstStop.release : firstStop.enter - 0.1,
    y: wide ? 540 : 960,
    size: wide ? 76 : 100,
  };

  if (!mismatchStop) return [opening];

  const start = mismatchStop.answerEnd + 0.2;

  return [
    opening,
    {
      lines: [[{ text: "It noticed", at: start }], [{ text: "the records", at: start + 0.31 }], [{ text: "were wrong.", at: start + 0.62, accent: true }]],
      out: mismatchStop.end - 0.1,
      y: wide ? 540 : 420,
      size: wide ? 80 : 104,
    },
  ];
}

function Caption({ t, layout }: { t: number; layout: Layout }) {
  const wide = layout === "wide";

  // In the tall cut the mismatch punchline needs the caption's spot, so the caption leaves first.
  const until = (candidate: (typeof cues.stops)[number]) =>
    !wide && candidate === mismatchStop ? candidate.answerEnd + 0.1 : candidate.end - 0.1;

  const stop = cues.stops.find((candidate) => t >= candidate.press && t < until(candidate));

  if (!stop) return null;

  const enter = ease(progress(t, stop.press, 0.3));
  const leave = progress(t, until(stop) - 0.3, 0.3);
  const badge = ease(progress(t, stop.answer, 0.3));

  return (
    <div
      style={{
        position: "absolute",
        left: wide ? 1290 : 70,
        right: wide ? 110 : 70,
        top: wide ? 380 : 230,
        display: "flex",
        flexDirection: "column",
        gap: 18,
        opacity: enter * (1 - leave),
        filter: enter < 1 || leave > 0 ? `blur(${Math.max(1 - enter, leave) * 10}px)` : undefined,
      }}
    >
      <p style={{ font: `500 22px/1 ${fonts.mono}`, letterSpacing: "0.08em", color: color.lavender }}>RENTER ASKS</p>
      <p style={{ font: `500 ${wide ? 46 : 52}px/1.2 ${fonts.display}`, color: color.white, letterSpacing: "-0.01em" }}>"{stop.data.asked}"</p>
      <p style={{ font: `500 22px/1.4 ${fonts.mono}`, color: color.muted, opacity: badge, marginTop: 6 }}>
        Answered live in {stop.data.responseSeconds} s. Wait trimmed.
      </p>
    </div>
  );
}

function HowItWorks({ t }: { t: number }) {
  if (t < cues.how - 0.1 || t > cues.close + 0.3) return null;

  const enter = ease(progress(t, cues.how, 0.4));
  const second = ease(progress(t, cues.how + 0.6, 0.4));
  const leave = progress(t, cues.close - 0.3, 0.3);

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 28, opacity: 1 - leave, textAlign: "center", padding: 80 }}>
      <p style={{ font: `600 84px/1.1 ${fonts.display}`, color: color.white, opacity: enter, translate: `0 ${(1 - enter) * 30}px` }}>
        A live guide that sees what you see.
      </p>
      <p style={{ font: `600 84px/1.1 ${fonts.display}`, color: color.lavender, opacity: second, translate: `0 ${(1 - second) * 30}px` }}>
        And only says what the records say.
      </p>
    </AbsoluteFill>
  );
}

function EndCard({ t }: { t: number }) {
  const enter = ease(progress(t, cues.close, 0.6));
  const credit = ease(progress(t, cues.close + 0.9, 0.5));

  if (enter === 0) return null;

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 22, textAlign: "center", padding: 80 }}>
      <p style={{ font: `600 96px/1.1 ${fonts.display}`, color: color.white, opacity: enter, translate: `0 ${(1 - enter) * 30}px` }}>
        Your AI tour guide.
      </p>
      <p style={{ font: `500 44px/1.3 ${fonts.display}`, color: color.lavender, opacity: enter }}>
        Ask anything while you tour.
      </p>
      <div style={{ opacity: credit, marginTop: 48, display: "flex", flexDirection: "column", gap: 16 }}>
        <p style={{ font: `500 34px/1.3 ${fonts.body}`, color: color.white }}>A prototype by Abdulsaboor Shaikh for EliseAI</p>
        <p style={{ font: `500 22px/1.4 ${fonts.mono}`, color: color.muted, letterSpacing: "0.04em" }}>
          REAL RESPONSES FROM THE WORKING APP · NOT AFFILIATED WITH ELISEAI
        </p>
        <p style={{ font: `500 22px/1 ${fonts.mono}`, color: color.muted }}>github.com/AbdulsaboorS/tour-lens</p>
      </div>
    </AbsoluteFill>
  );
}

function Phone({ t, layout }: { t: number; layout: Layout }) {
  const { width, height } = useVideoConfig();
  const wide = layout === "wide";
  const scale = wide ? 1.12 : height / SCREEN.h;
  const rise = ease(progress(t, 0, 0.9));
  const away = ease(progress(t, cues.how - 0.4, 0.6));
  const bezel = wide ? 14 : 0;

  return (
    <div
      style={{
        position: "absolute",
        left: width / 2,
        top: height / 2,
        translate: `-50% ${-50 + (1 - rise) * 6}%`,
        opacity: rise * (1 - away),
        scale: String(1 - away * 0.04),
        padding: bezel,
        borderRadius: wide ? 64 : 0,
        background: "#000000",
      }}
    >
      <div style={{ width: SCREEN.w * scale, height: SCREEN.h * scale, borderRadius: wide ? 50 : 0, overflow: "hidden" }}>
        <div style={{ width: SCREEN.w, height: SCREEN.h, scale: String(scale), transformOrigin: "0 0" }}>
          <TourPhone t={t} />
        </div>
      </div>
    </div>
  );
}

const speaking = cues.stops.flatMap((stop) => [
  [stop.press + 0.15, stop.press + 0.15 + stop.data.questionSeconds],
  [stop.answer, stop.answerEnd],
  ...(stop.done !== undefined && stop.doneEnd !== undefined ? [[stop.done, stop.doneEnd]] : []),
]);

/** The bed sits at 0.5 and ducks to 0.16 under every spoken line, easing over 0.3 s each way. */
function musicVolume(seconds: number) {
  const duck = Math.max(
    0,
    ...speaking.map(([start, end]) => Math.min(progress(seconds, start - 0.3, 0.3), 1 - progress(seconds, end, 0.3))),
  );

  return 0.5 - 0.34 * duck;
}

function Voices() {
  const { fps } = useVideoConfig();
  const frame = (seconds: number) => Math.round(seconds * fps);

  return (
    <>
      <Audio src={staticFile("audio/tour/music/bed.wav")} volume={(f) => musicVolume(f / fps)} />
      {cues.stops.map((stop) => (
        <Sequence key={stop.data.id} from={frame(stop.press + 0.15)} layout="none">
          <Audio src={staticFile(`audio/tour/${stop.data.id}-question.mp3`)} />
        </Sequence>
      ))}
      {cues.stops.map((stop) => (
        <Sequence key={`${stop.data.id}-answer`} from={frame(stop.answer)} layout="none">
          <Audio src={staticFile(`audio/tour/${stop.data.id}-answer.mp3`)} />
        </Sequence>
      ))}
      {cues.stops.flatMap((stop) =>
        stop.done === undefined
          ? []
          : [
              <Sequence key="hold-done" from={frame(stop.done)} layout="none">
                <Audio src={staticFile("audio/tour/hold-done.mp3")} />
              </Sequence>,
            ],
      )}
    </>
  );
}

export type TourProps = { fps: number; layout: Layout; debug?: boolean };

export function Tour({ layout }: TourProps) {
  const t = useTime();
  const tall = layout === "tall";
  const punchlineDim = tall ? 1 - progress(t, firstStop.enter + 0.15, 0.4) : 0;

  return (
    <AbsoluteFill style={{ background: color.night }}>
      <Phone t={t} layout={layout} />
      {tall && <AbsoluteFill style={{ background: color.night, opacity: punchlineDim * 0.85 }} />}
      {tall && (
        <AbsoluteFill
          style={{
            background: `linear-gradient(${color.night}e6 0%, ${color.night}b3 30%, transparent 48%)`,
            opacity: ease(progress(t, firstStop.press - 0.3, 0.4)) * (1 - progress(t, cues.recap, 0.3)),
          }}
        />
      )}
      <div style={{ position: "absolute", top: 0, left: 0, width: tall ? "100%" : 720, height: "100%" }}>
        <Punchlines t={t} cards={punchlines(layout)} theme={{ font: fonts.display, color: color.white, accent: color.lavender }} />
      </div>
      <Caption t={t} layout={layout} />
      <HowItWorks t={t} />
      <EndCard t={t} />
      <Voices />
    </AbsoluteFill>
  );
}
