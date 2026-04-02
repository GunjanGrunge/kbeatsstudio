import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import type { KBeatsInputProps, OverlayConfig } from "@/types/studio";
import { AudioTrack } from "../overlays/AudioTrack";
import { VideoBackground } from "../overlays/VideoBackground";
import { WaveformVisualizer } from "../overlays/WaveformVisualizer";
import { LyricsDisplay } from "../overlays/LyricsDisplay";
import { LyricsWithChords } from "../overlays/LyricsWithChords";
import { YouTubeSubscribe } from "../overlays/YouTubeSubscribe";
import { YouTubeLike } from "../overlays/YouTubeLike";
import { InstagramFollow } from "../overlays/InstagramFollow";
import { InstagramLike } from "../overlays/InstagramLike";
import { InstagramShare } from "../overlays/InstagramShare";
import { TextOverlay } from "../overlays/TextOverlay";
import { ImageOverlay } from "../overlays/ImageOverlay";

function OverlayRenderer({ overlay, audioSrc }: { overlay: OverlayConfig; audioSrc: string | null }) {
  if (!overlay.visible) return null;

  switch (overlay.type) {
    case "waveform":
      if (!audioSrc) return null;
      return <WaveformVisualizer overlay={overlay} audioSrc={audioSrc} />;
    case "lyrics":
      return <LyricsDisplay overlay={overlay} />;
    case "lyrics-chords":
      return <LyricsWithChords overlay={overlay} />;
    case "yt-subscribe":
      return <YouTubeSubscribe overlay={overlay} />;
    case "yt-like":
      return <YouTubeLike overlay={overlay} />;
    case "ig-follow":
      return <InstagramFollow overlay={overlay} />;
    case "ig-like":
      return <InstagramLike overlay={overlay} />;
    case "ig-share":
      return <InstagramShare overlay={overlay} />;
    case "text":
      return <TextOverlay overlay={overlay} />;
    case "image":
      return <ImageOverlay overlay={overlay} />;
    default:
      return null;
  }
}

export function KBeatsComposition({
  audioSrc,
  videoSrc,
  videoFit,
  backgroundColor,
  backgroundOpacity,
  overlays,
}: KBeatsInputProps) {
  const { durationInFrames } = useVideoConfig();

  // Sort overlays by z-order (index = z-index, later = on top)
  const visibleOverlays = overlays.filter((o) => o.visible);

  return (
    <AbsoluteFill>
      {/* Background layer */}
      <VideoBackground
        videoSrc={videoSrc}
        videoFit={videoFit ?? "cover"}
        backgroundColor={backgroundColor ?? "#050505"}
        backgroundOpacity={backgroundOpacity ?? 1}
        opacity={1}
      />

      {/* Audio track (invisible) */}
      <AudioTrack audioSrc={audioSrc} />

      {/* Overlay layers — each wrapped in a Sequence for timing */}
      {visibleOverlays.map((overlay) => (
        <Sequence
          key={overlay.id}
          from={overlay.startFrame}
          durationInFrames={overlay.durationInFrames}
          layout="none"
        >
          <OverlayRenderer overlay={overlay} audioSrc={audioSrc} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}
