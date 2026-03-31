import { useCurrentFrame, interpolate, Sequence } from "remotion";
import type { OverlayConfig, LyricLine } from "@/types/studio";

interface Props {
  overlay: OverlayConfig;
}

function LyricLine({ line, frame, relativeFrame, overlay }: {
  line: LyricLine;
  frame: number;
  relativeFrame: number;
  overlay: OverlayConfig;
}) {
  const lineDuration = line.durationInFrames ?? 90;
  const fadeIn = interpolate(relativeFrame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(relativeFrame, [lineDuration - 10, lineDuration], [1, 0], { extrapolateLeft: "clamp" });
  const alpha = Math.min(fadeIn, fadeOut);

  const slideY = interpolate(relativeFrame, [0, 12], [20, 0], { extrapolateRight: "clamp" });

  const font = overlay.font;
  const textShadow = overlay.textShadow;

  return (
    <div
      style={{
        opacity: alpha,
        transform: `translateY(${slideY}px)`,
        color: overlay.color ?? "#ffffff",
        fontFamily: `${font?.family ?? "Outfit"}, sans-serif`,
        fontSize: font?.size ?? 52,
        fontWeight: font?.weight ?? 700,
        letterSpacing: font?.letterSpacing ?? 0,
        lineHeight: font?.lineHeight ?? 1.3,
        textAlign: font?.align ?? "center",
        textShadow: textShadow
          ? `${textShadow.x}px ${textShadow.y}px ${textShadow.blur}px ${textShadow.color}`
          : "0 2px 20px rgba(0,0,0,0.8)",
        WebkitTextStroke: overlay.textStroke
          ? `${overlay.textStroke.width}px ${overlay.textStroke.color}`
          : undefined,
        padding: "0 32px",
        maxWidth: "90%",
        wordBreak: "break-word",
      }}
    >
      {line.text}
    </div>
  );
}

export function LyricsDisplay({ overlay }: Props) {
  const frame = useCurrentFrame();
  const lines = overlay.lyrics ?? [];
  const overlayOpacity = overlay.opacity ?? 1;

  return (
    <div
      style={{
        position: "absolute",
        left: `${overlay.position.x}%`,
        top: `${overlay.position.y}%`,
        transform: "translate(-50%, -50%)",
        opacity: overlayOpacity,
        display: "flex",
        flexDirection: "column",
        alignItems: overlay.font?.align === "left" ? "flex-start" : overlay.font?.align === "right" ? "flex-end" : "center",
        gap: 8,
        minWidth: 400,
      }}
    >
      {lines.map((line, i) => {
        const lineDuration = line.durationInFrames ?? 90;
        const relFrame = frame - overlay.startFrame - line.startFrame;
        if (relFrame < 0 || relFrame > lineDuration) return null;

        return (
          <LyricLine
            key={i}
            line={line}
            frame={frame}
            relativeFrame={relFrame}
            overlay={overlay}
          />
        );
      })}
    </div>
  );
}
