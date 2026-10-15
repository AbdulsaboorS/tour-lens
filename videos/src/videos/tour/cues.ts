import { at, beatLength, type Grid } from "../../kit/time";
import capture from "./capture.json";

// The beat sheet as data. Every time comes from the grid or from measured audio in capture.json.
export const grid: Grid = { bpm: 96, firstBeat: 0, pickupBeats: 0, beatsPerBar: 4 };

export const b = (bar: number, beat = 1, fraction = 0) => at(grid, bar, beat, fraction);

const beat = beatLength(grid);

/** The first beat at or after `seconds`. */
const onBeat = (seconds: number) => Math.ceil(seconds / beat - 1e-6) * beat;

export type Captured = (typeof capture.stops)[number];

export type StopCue = {
  data: Captured;
  enter: number;
  press: number;
  release: number;
  answer: number;
  answerEnd: number;
  confirm?: number;
  done?: number;
  doneEnd?: number;
  end: number;
};

const FILM_STOPS = ["washer", "living-room", "hold"];

function stopData(id: string) {
  const data = capture.stops.find((stop) => stop.id === id);

  if (!data) throw new Error(`capture.json has no stop ${id}`);

  return data;
}

function plan() {
  const stops: StopCue[] = [];
  let cursor = b(2);

  for (const id of FILM_STOPS) {
    const data = stopData(id);
    const enter = cursor;
    const press = onBeat(enter + 0.6);
    const release = onBeat(press + 0.15 + data.questionSeconds + 0.2);
    const answer = release + 2 * beat;
    const answerEnd = answer + data.answerSeconds;

    if (data.pendingHold) {
      const confirm = onBeat(answerEnd + 0.6);
      const done = confirm + 2 * beat;
      const doneEnd = done + capture.hold.answerSeconds;

      stops.push({ data, enter, press, release, answer, answerEnd, confirm, done, doneEnd, end: onBeat(doneEnd + 0.8) });
    } else {
      // The mismatch gets a beat of its own for the punchline.
      const linger = data.mismatches.length > 0 ? 3 : 0.7;

      stops.push({ data, enter, press, release, answer, answerEnd, end: onBeat(answerEnd + linger) });
    }

    cursor = stops[stops.length - 1].end;
  }

  const recap = cursor;
  const how = onBeat(recap + 3.6);
  const close = onBeat(how + 3.2);
  const bars = Math.ceil((close + 4.2) / (beat * grid.beatsPerBar));

  return { stops, recap, how, close, duration: bars * beat * grid.beatsPerBar };
}

export const cues = plan();

export const mismatchStop = cues.stops.find((stop) => stop.data.mismatches.length > 0);

/** Which stop the phone is on at time t, and where the feed slide is. */
export function stopAt(t: number) {
  const index = cues.stops.findLastIndex((stop) => t >= stop.enter);

  return cues.stops[Math.max(0, index)];
}
