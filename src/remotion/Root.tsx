import { Composition } from "remotion";
import { KBeatsComposition } from "./compositions/KBeatsComposition";
import type { KBeatsInputProps } from "@/types/studio";

const DEFAULT_PROPS: KBeatsInputProps = {
  audioSrc: null,
  videoSrc: null,
  durationInFrames: 900,
  fps: 30,
  width: 1920,
  height: 1080,
  backgroundColor: "#050505",
  backgroundOpacity: 1,
  overlays: [],
};

export function RemotionRoot() {
  return (
    <Composition
      id="KBeatsMain"
      component={KBeatsComposition as unknown as React.ComponentType<Record<string, unknown>>}
      durationInFrames={DEFAULT_PROPS.durationInFrames}
      fps={DEFAULT_PROPS.fps}
      width={DEFAULT_PROPS.width}
      height={DEFAULT_PROPS.height}
      defaultProps={DEFAULT_PROPS as unknown as Record<string, unknown>}
      calculateMetadata={({ props }) => {
        const p = props as unknown as KBeatsInputProps;
        return {
          durationInFrames: p.durationInFrames ?? 900,
          fps: p.fps ?? 30,
          width: p.width ?? 1920,
          height: p.height ?? 1080,
        };
      }}
    />
  );
}
