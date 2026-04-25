import { Video, AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import type { TimelineRegion } from "@/types/studio";

interface Props {
  videoSrc: string | null;
  videoFit?: "cover" | "contain" | "fill";
  opacity?: number;
  volume?: number;
  backgroundColor?: string;
  backgroundOpacity?: number;
  startFrom?: number;
  timelineRegions?: TimelineRegion[];
  videoCrop?: { x: number; y: number; width: number; height: number } | null;
}

interface Segment {
  from: number;
  duration: number;
  sourceStart: number;
  playbackRate: number;
  crop?: TimelineRegion["crop"];
}

function buildVideoSegments(durationInFrames: number, startFrom: number, regions: TimelineRegion[]): Segment[] {
  const speedRegions = regions
    .filter((r) => r.type === "speed" && r.speed && r.speed > 0 && r.durationInFrames > 0)
    .sort((a, b) => a.startFrame - b.startFrame);
  const cropRegions = regions
    .filter((r) => r.type === "crop" && r.crop && r.durationInFrames > 0)
    .sort((a, b) => a.startFrame - b.startFrame);
  const boundaries = new Set<number>([0, durationInFrames]);
  for (const region of [...speedRegions, ...cropRegions]) {
    boundaries.add(Math.max(0, Math.min(durationInFrames, region.startFrame)));
    boundaries.add(Math.max(0, Math.min(durationInFrames, region.startFrame + region.durationInFrames)));
  }
  const sorted = [...boundaries].sort((a, b) => a - b);
  const segments: Segment[] = [];
  let sourceCursor = startFrom;

  for (let i = 0; i < sorted.length - 1; i += 1) {
    const from = sorted[i];
    const to = sorted[i + 1];
    const duration = to - from;
    if (duration <= 0) continue;
    const activeSpeed = speedRegions.find((r) => from >= r.startFrame && from < r.startFrame + r.durationInFrames);
    const activeCrop = cropRegions.find((r) => from >= r.startFrame && from < r.startFrame + r.durationInFrames);
    const playbackRate = activeSpeed?.speed ?? 1;
    segments.push({ from, duration, sourceStart: Math.round(sourceCursor), playbackRate, crop: activeCrop?.crop });
    sourceCursor += duration * playbackRate;
  }

  return segments.length ? segments : [{ from: 0, duration: durationInFrames, sourceStart: startFrom, playbackRate: 1 }];
}

function cropStyle(crop: TimelineRegion["crop"]): React.CSSProperties {
  if (!crop) return {};
  const scale = 100 / Math.max(1, crop.width);
  const focusX = crop.x + crop.width / 2;
  const focusY = crop.y + crop.height / 2;
  return {
    transform: `translate(${50 - focusX}%, ${50 - focusY}%) scale(${scale})`,
    transformOrigin: `${focusX}% ${focusY}%`,
  };
}

export function VideoBackground({
  videoSrc,
  videoFit = "cover",
  opacity = 1,
  volume = 0,
  backgroundColor = "#050505",
  backgroundOpacity = 1,
  startFrom = 0,
  timelineRegions = [],
  videoCrop = null,
}: Props) {
  const { durationInFrames } = useVideoConfig();
  const segments = buildVideoSegments(durationInFrames, startFrom, timelineRegions);
  return (
    <AbsoluteFill>
      {/* Solid background color */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor,
          opacity: backgroundOpacity,
        }}
      />
      {/* Optional video layer */}
      {videoSrc && segments.map((segment) => {
        return (
          <Sequence key={`${segment.from}-${segment.sourceStart}-${segment.playbackRate}`} from={segment.from} durationInFrames={segment.duration}>
            <AbsoluteFill style={{ overflow: "hidden" }}>
              <Video
                src={videoSrc}
                startFrom={segment.sourceStart}
                playbackRate={segment.playbackRate}
                volume={() => volume}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: videoFit,
                  opacity,
                  ...cropStyle(segment.crop ?? videoCrop ?? undefined),
                }}
              />
            </AbsoluteFill>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
}
