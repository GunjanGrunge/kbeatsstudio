import { useCurrentFrame, spring, interpolate, useVideoConfig } from "remotion";
import type { OverlayConfig } from "@/types/studio";

interface Props {
  overlay: OverlayConfig;
}

export function InstagramFollow({ overlay }: Props) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const relFrame = frame;
  const totalFrames = overlay.durationInFrames;

  const scale = spring({
    frame: relFrame,
    fps,
    config: { damping: 15, stiffness: 180, mass: 0.9 },
    from: 0.7,
    to: 1,
  });

  const slideY = spring({
    frame: relFrame,
    fps,
    config: { damping: 20, stiffness: 220 },
    from: 24,
    to: 0,
  });

  const fadeOut = interpolate(relFrame, [totalFrames - 12, totalFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const opacity = (overlay.opacity ?? 1) * fadeOut;
  const username = overlay.username ?? "@kbeats";
  const componentScale = overlay.componentScale ?? 1;

  return (
    <div
      style={{
        position: "absolute",
        left: `${overlay.position.x}%`,
        top: `${overlay.position.y}%`,
        transform: `translate(-50%, -50%) scale(${scale * componentScale}) translateY(${slideY}px)`,
        opacity,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
      }}
    >
      {/* Profile row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "rgba(0,0,0,0.75)",
          backdropFilter: "blur(12px)",
          borderRadius: 40,
          padding: "10px 18px 10px 10px",
          border: "1px solid rgba(255,255,255,0.15)",
        }}
      >
        {/* Instagram gradient avatar */}
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            background: "linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)",
            padding: 2,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              background: "#1a1a1c",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "Unbounded, sans-serif",
              fontWeight: 900,
              fontSize: 13,
              color: "#ccff00",
            }}
          >
            K
          </div>
        </div>

        <span
          style={{
            fontFamily: "Outfit, sans-serif",
            fontWeight: 600,
            fontSize: 17,
            color: "#ffffff",
            whiteSpace: "nowrap",
          }}
        >
          {username}
        </span>
      </div>

      {/* Follow button — Instagram gradient border pill */}
      <div
        style={{
          background: "linear-gradient(90deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)",
          borderRadius: 40,
          padding: 2,
          boxShadow: "0 4px 20px rgba(188,24,136,0.4)",
        }}
      >
        <div
          style={{
            background: "rgba(0,0,0,0.85)",
            borderRadius: 38,
            padding: "10px 28px",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {/* Instagram icon */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white" opacity={0.9}>
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" fill="none" stroke="white" strokeWidth="2"/>
            <circle cx="12" cy="12" r="5" fill="none" stroke="white" strokeWidth="2"/>
            <circle cx="17.5" cy="6.5" r="1.5" fill="white"/>
          </svg>

          <span
            style={{
              fontFamily: "Outfit, sans-serif",
              fontWeight: 700,
              fontSize: 17,
              color: "#ffffff",
              letterSpacing: 0.5,
            }}
          >
            Follow
          </span>
        </div>
      </div>
    </div>
  );
}
