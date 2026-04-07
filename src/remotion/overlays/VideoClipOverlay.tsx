import { useCurrentFrame, interpolate, spring, useVideoConfig, OffthreadVideo, AbsoluteFill } from "remotion";
import type { OverlayConfig } from "@/types/studio";

interface Props {
  overlay: OverlayConfig;
}

export function VideoClipOverlay({ overlay }: Props) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const totalFrames = overlay.durationInFrames;

  if (!overlay.videoClipSrc) return null;

  const fadeIn = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [totalFrames - 10, totalFrames], [1, 0], { extrapolateLeft: "clamp" });
  const alpha = Math.min(fadeIn, fadeOut) * (overlay.opacity ?? 1);

  const scale = overlay.componentScale ?? 1;
  const fit = overlay.videoClipFit ?? "none";
  const volume = overlay.videoClipVolume ?? 0;

  // Entrance spring for animation variant
  const sp = spring({ frame, fps, config: { damping: 14, stiffness: 120, mass: 0.8 } });

  // Full-canvas fit modes
  if (fit !== "none") {
    return (
      <AbsoluteFill style={{ opacity: alpha }}>
        <OffthreadVideo
          src={overlay.videoClipSrc}
          volume={volume}
          style={{
            width: "100%",
            height: "100%",
            objectFit: fit,
          }}
        />
      </AbsoluteFill>
    );
  }

  // Positioned / scaled overlay mode
  const width = 320 * scale;

  let translateX = 0;
  let translateY = 0;
  let scaleVal = 1;

  const variant = overlay.animationVariant ?? "none";
  if (variant === "bounce-in") {
    const spBounce = spring({ frame, fps, config: { damping: 10, stiffness: 200, mass: 0.8 } });
    translateY = interpolate(spBounce, [0, 1], [-80, 0]);
    scaleVal = interpolate(spBounce, [0, 1], [0.5, 1]);
  } else if (variant === "slide-in-left") {
    translateX = interpolate(sp, [0, 1], [-150, 0]);
  } else if (variant === "zoom-in") {
    scaleVal = interpolate(sp, [0, 1], [0, 1]);
  } else if (variant === "float") {
    scaleVal = interpolate(sp, [0, 1], [0.8, 1]);
    const bobCycle = frame % 90;
    translateY = interpolate(bobCycle, [0, 45, 90], [0, -10, 0]);
  }

  return (
    <div
      style={{
        position: "absolute",
        left: `${overlay.position.x}%`,
        top: `${overlay.position.y}%`,
        transform: `translate(calc(-50% + ${translateX}px), calc(-50% + ${translateY}px)) scale(${scaleVal})`,
        opacity: alpha,
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      <OffthreadVideo
        src={overlay.videoClipSrc}
        volume={volume}
        style={{
          width,
          height: "auto",
          display: "block",
        }}
      />
    </div>
  );
}
