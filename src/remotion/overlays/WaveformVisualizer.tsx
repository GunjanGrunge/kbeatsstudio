import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { useAudioData, visualizeAudio } from "@remotion/media-utils";
import type { OverlayConfig } from "@/types/studio";

interface Props {
  overlay: OverlayConfig;
  audioSrc: string | null;
}

export function WaveformVisualizer({ overlay, audioSrc }: Props) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const audioData = useAudioData(audioSrc ?? "");

  const bars = overlay.waveformBars ?? 64;
  const color = overlay.waveformColor ?? "#ccff00";
  const opacity = overlay.opacity ?? 0.85;

  // Entrance/exit fade
  const fadeIn = interpolate(frame - overlay.startFrame, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  const totalFrames = overlay.durationInFrames;
  const fadeOut = interpolate(frame - overlay.startFrame, [totalFrames - 8, totalFrames], [1, 0], { extrapolateLeft: "clamp" });
  const alpha = Math.min(fadeIn, fadeOut) * opacity;

  // Frequency data per frame
  const frequencies = audioData
    ? visualizeAudio({
        fps,
        frame,
        audioData,
        numberOfSamples: bars,
      })
    : new Array(bars).fill(0.05);

  const containerW = 600;
  const containerH = 80;
  const barWidth = (containerW / bars) * 0.7;
  const barGap = containerW / bars;

  return (
    <div
      style={{
        position: "absolute",
        left: `${overlay.position.x}%`,
        top: `${overlay.position.y}%`,
        transform: "translate(-50%, -50%)",
        opacity: alpha,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        width: containerW,
        height: containerH,
        gap: barGap - barWidth,
      }}
    >
      {frequencies.map((freq, i) => {
        const height = Math.max(4, freq * containerH);
        return (
          <div
            key={i}
            style={{
              width: barWidth,
              height,
              backgroundColor: color,
              borderRadius: barWidth / 2,
              boxShadow: `0 0 ${Math.round(freq * 12)}px ${color}88`,
              flexShrink: 0,
            }}
          />
        );
      })}
    </div>
  );
}
