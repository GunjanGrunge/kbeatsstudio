import { useCurrentFrame, spring, interpolate, useVideoConfig } from "remotion";
import type { OverlayConfig } from "@/types/studio";

interface Props {
  overlay: OverlayConfig;
}

export function YouTubeLike({ overlay }: Props) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const relFrame = frame - overlay.startFrame;
  const totalFrames = overlay.durationInFrames;

  const scale = spring({
    frame: relFrame,
    fps,
    config: { damping: 12, stiffness: 200, mass: 0.7 },
    from: 0.5,
    to: 1,
  });

  // Pulse every 45 frames
  const pulseFrame = relFrame % 45;
  const pulse = spring({
    frame: pulseFrame,
    fps,
    config: { damping: 10, stiffness: 350, mass: 0.4 },
    from: 1,
    to: pulseFrame < 5 ? 1.2 : 1,
  });

  const fadeOut = interpolate(relFrame, [totalFrames - 12, totalFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const opacity = (overlay.opacity ?? 1) * fadeOut;
  const componentScale = overlay.componentScale ?? 1;

  return (
    <div
      style={{
        position: "absolute",
        left: `${overlay.position.x}%`,
        top: `${overlay.position.y}%`,
        transform: `translate(-50%, -50%) scale(${scale * componentScale})`,
        opacity,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "rgba(0,0,0,0.75)",
          backdropFilter: "blur(12px)",
          borderRadius: 40,
          padding: "12px 20px",
          border: "1px solid rgba(255,255,255,0.1)",
          transform: `scale(${pulse})`,
        }}
      >
        {/* Thumb up */}
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="white"
          style={{ flexShrink: 0 }}
        >
          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
          <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
        </svg>

        <span
          style={{
            fontFamily: "Outfit, sans-serif",
            fontWeight: 600,
            fontSize: 18,
            color: "#ffffff",
          }}
        >
          Like
        </span>

        <div
          style={{
            width: 1,
            height: 20,
            background: "rgba(255,255,255,0.2)",
          }}
        />

        {/* Dislike / share hint */}
        <svg width="22" height="22" viewBox="0 0 24 24" fill="rgba(255,255,255,0.5)">
          <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/>
          <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/>
        </svg>
      </div>
    </div>
  );
}
