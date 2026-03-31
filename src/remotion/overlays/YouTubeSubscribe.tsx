import { useCurrentFrame, spring, interpolate, useVideoConfig } from "remotion";
import type { OverlayConfig } from "@/types/studio";

interface Props {
  overlay: OverlayConfig;
}

export function YouTubeSubscribe({ overlay }: Props) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const relFrame = frame - overlay.startFrame;
  const totalFrames = overlay.durationInFrames;

  // Entrance spring
  const scale = spring({
    frame: relFrame,
    fps,
    config: { damping: 14, stiffness: 180, mass: 0.8 },
    from: 0.6,
    to: 1,
  });

  const slideY = spring({
    frame: relFrame,
    fps,
    config: { damping: 18, stiffness: 200, mass: 0.8 },
    from: 30,
    to: 0,
  });

  // Exit fade
  const fadeOut = interpolate(relFrame, [totalFrames - 15, totalFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Bell ring pulse — every 60 frames
  const bellPulse = spring({
    frame: relFrame % 60,
    fps,
    config: { damping: 8, stiffness: 400, mass: 0.3 },
    from: 0,
    to: 1,
  });
  const bellRotate = interpolate(bellPulse, [0, 0.3, 0.6, 1], [0, 18, -18, 0]);

  const channelName = overlay.channelName ?? "KBeats";
  const opacity = (overlay.opacity ?? 1) * fadeOut;
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
      {/* Channel name + avatar row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "rgba(0,0,0,0.75)",
          backdropFilter: "blur(12px)",
          borderRadius: 40,
          padding: "10px 18px 10px 10px",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        {/* Avatar circle */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "#ccff00",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Unbounded, sans-serif",
            fontWeight: 900,
            fontSize: 14,
            color: "#050505",
            flexShrink: 0,
          }}
        >
          {channelName.charAt(0).toUpperCase()}
        </div>

        {/* Channel name */}
        <span
          style={{
            fontFamily: "Outfit, sans-serif",
            fontWeight: 600,
            fontSize: 18,
            color: "#ffffff",
            whiteSpace: "nowrap",
          }}
        >
          {channelName}
        </span>
      </div>

      {/* Subscribe button */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "#ff0000",
          borderRadius: 8,
          padding: "12px 22px",
          boxShadow: "0 4px 24px rgba(255,0,0,0.4)",
        }}
      >
        {/* YouTube play icon */}
        <svg width="22" height="16" viewBox="0 0 22 16" fill="white">
          <path d="M21.6 2.5C21.4 1.7 20.8 1.1 20 0.9C18.3 0.5 11 0.5 11 0.5C11 0.5 3.7 0.5 2 0.9C1.2 1.1 0.6 1.7 0.4 2.5C0 4.2 0 8 0 8C0 8 0 11.8 0.4 13.5C0.6 14.3 1.2 14.9 2 15.1C3.7 15.5 11 15.5 11 15.5C11 15.5 18.3 15.5 20 15.1C20.8 14.9 21.4 14.3 21.6 13.5C22 11.8 22 8 22 8C22 8 22 4.2 21.6 2.5Z"/>
          <polygon points="8.8,11.2 14.5,8 8.8,4.8" fill="#ff0000"/>
        </svg>

        <span
          style={{
            fontFamily: "Outfit, sans-serif",
            fontWeight: 700,
            fontSize: 18,
            color: "#ffffff",
            letterSpacing: 0.5,
          }}
        >
          Subscribe
        </span>

        {/* Bell icon */}
        <div style={{ transform: `rotate(${bellRotate}deg)` }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </div>
      </div>
    </div>
  );
}
