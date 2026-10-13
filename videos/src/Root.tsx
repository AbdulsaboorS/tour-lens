import { Composition } from "remotion";

import { cues } from "./videos/tour/cues";
import { Tour, type TourProps } from "./videos/tour/Tour";

const metadata = ({ props }: { props: TourProps }) => ({
  fps: props.fps,
  durationInFrames: Math.round(cues.duration * props.fps),
});

export function Root() {
  return (
    <>
      <Composition
        id="TourWide"
        component={Tour}
        width={1920}
        height={1080}
        fps={60}
        durationInFrames={Math.round(cues.duration * 60)}
        defaultProps={{ fps: 60, layout: "wide" } satisfies TourProps}
        calculateMetadata={metadata}
      />
      <Composition
        id="TourTall"
        component={Tour}
        width={1080}
        height={1920}
        fps={60}
        durationInFrames={Math.round(cues.duration * 60)}
        defaultProps={{ fps: 60, layout: "tall" } satisfies TourProps}
        calculateMetadata={metadata}
      />
    </>
  );
}
