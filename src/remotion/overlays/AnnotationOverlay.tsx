import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import type { OverlayConfig } from "@/types/studio";

interface Props {
  overlay: OverlayConfig;
}

export function AnnotationOverlay({ overlay }: Props) {
  const frame = useCurrentFrame();
  const annotation = overlay.annotation;
  if (!annotation) return null;

  const enter = interpolate(frame, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const width = `${annotation.width}%`;
  const height = `${annotation.height}%`;
  const borderColor = annotation.borderColor ?? overlay.color ?? "#ccff00";
  const fillColor = annotation.fillColor ?? "rgba(204,255,0,0.12)";
  const textColor = annotation.textColor ?? "#050505";

  const baseStyle: React.CSSProperties = {
    position: "absolute",
    left: `${overlay.position.x}%`,
    top: `${overlay.position.y}%`,
    width,
    height,
    opacity: (overlay.opacity ?? 1) * enter,
    transform: `translate(-50%, -50%) rotate(${annotation.rotation}deg) scale(${0.92 + enter * 0.08})`,
    transformOrigin: "center",
  };

  if (annotation.kind === "arrow") {
    const isHorizontal = annotation.arrowDirection === "left" || annotation.arrowDirection === "right";
    const rotation =
      annotation.arrowDirection === "left" ? 180 :
      annotation.arrowDirection === "up" ? -90 :
      annotation.arrowDirection === "down" ? 90 :
      0;

    return (
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <svg style={baseStyle} viewBox={isHorizontal ? "0 0 220 80" : "0 0 220 80"} preserveAspectRatio="none">
          <g transform={`rotate(${rotation} 110 40)`}>
            <path
              d="M12 40 H176"
              stroke={borderColor}
              strokeWidth={annotation.strokeWidth}
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M172 14 L210 40 L172 66"
              stroke={borderColor}
              strokeWidth={annotation.strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </g>
        </svg>
      </AbsoluteFill>
    );
  }

  if (annotation.kind === "label") {
    return (
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <div
          style={{
            ...baseStyle,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: annotation.cornerRadius ?? 10,
            background: borderColor,
            color: textColor,
            padding: "0.4em 0.75em",
            fontFamily: overlay.font?.family ?? "Outfit, sans-serif",
            fontWeight: overlay.font?.weight ?? 800,
            fontSize: overlay.font?.size ?? 48,
            lineHeight: 1,
            textAlign: "center",
            boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
          }}
        >
          {annotation.text || "Label"}
        </div>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          ...baseStyle,
          border: `${annotation.strokeWidth}px solid ${borderColor}`,
          background: annotation.kind === "highlight" ? fillColor : "transparent",
          borderRadius: annotation.shape === "ellipse" ? "999px" : annotation.cornerRadius ?? 10,
          boxShadow: annotation.kind === "highlight" ? `0 0 34px ${fillColor}` : "none",
        }}
      />
    </AbsoluteFill>
  );
}
