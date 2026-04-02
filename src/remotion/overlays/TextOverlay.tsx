import { useCurrentFrame, interpolate } from "remotion";
import type { OverlayConfig } from "@/types/studio";

interface Props {
  overlay: OverlayConfig;
}

export function TextOverlay({ overlay }: Props) {
  const frame = useCurrentFrame();
  const relFrame = frame;
  const totalFrames = overlay.durationInFrames;

  const fadeIn = interpolate(relFrame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(relFrame, [totalFrames - 10, totalFrames], [1, 0], { extrapolateLeft: "clamp" });
  const alpha = Math.min(fadeIn, fadeOut) * (overlay.opacity ?? 1);

  const font = overlay.font;

  const textStyle: React.CSSProperties = {
    fontFamily: `${font?.family ?? "Outfit"}, sans-serif`,
    fontSize: font?.size ?? 52,
    fontWeight: font?.weight ?? 700,
    letterSpacing: font?.letterSpacing ?? 0,
    lineHeight: font?.lineHeight ?? 1.3,
    textAlign: font?.align ?? "center",
    textShadow: overlay.textShadow
      ? `${overlay.textShadow.x}px ${overlay.textShadow.y}px ${overlay.textShadow.blur}px ${overlay.textShadow.color}`
      : undefined,
    WebkitTextStroke: overlay.textStroke
      ? `${overlay.textStroke.width}px ${overlay.textStroke.color}`
      : undefined,
    maxWidth: "80%",
    wordBreak: "break-word",
  };

  if (overlay.gradientColors) {
    Object.assign(textStyle, {
      background: `linear-gradient(135deg, ${overlay.gradientColors[0]}, ${overlay.gradientColors[1]})`,
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
    });
  } else {
    textStyle.color = overlay.color ?? "#ffffff";
  }

  return (
    <div
      style={{
        position: "absolute",
        left: `${overlay.position.x}%`,
        top: `${overlay.position.y}%`,
        transform: "translate(-50%, -50%)",
        opacity: alpha,
        display: "flex",
        justifyContent: font?.align === "left" ? "flex-start" : font?.align === "right" ? "flex-end" : "center",
      }}
    >
      <span style={textStyle}>{overlay.text ?? "Your text"}</span>
    </div>
  );
}
