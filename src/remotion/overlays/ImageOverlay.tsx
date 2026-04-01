import { useCurrentFrame, useVideoConfig, interpolate, spring, Img } from "remotion";
import type { OverlayConfig } from "@/types/studio";

interface Props {
  overlay: OverlayConfig;
}

export function ImageOverlay({ overlay }: Props) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const relFrame = frame - overlay.startFrame;
  const totalFrames = overlay.durationInFrames;

  const fadeIn = interpolate(relFrame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(relFrame, [totalFrames - 10, totalFrames], [1, 0], { extrapolateLeft: "clamp" });
  const alpha = Math.min(fadeIn, fadeOut) * (overlay.opacity ?? 1);

  const scale = overlay.componentScale ?? 1;
  const width = 200 * scale;

  const variant = overlay.animationVariant ?? "none";

  // Spring config for entrance animations
  const entranceSpring = spring({ frame: relFrame, fps, config: { damping: 14, stiffness: 160, mass: 1 } });

  // Per-variant transform + idle loop
  let translateX = 0;
  let translateY = 0;
  let scaleX = 1;
  let scaleY = 1;
  let rotate = 0;

  if (variant === "bounce-in") {
    const progress = spring({ frame: relFrame, fps, config: { damping: 10, stiffness: 200, mass: 0.8 } });
    translateY = interpolate(progress, [0, 1], [-80, 0]);
    scaleX = interpolate(progress, [0, 1], [0.5, 1]);
    scaleY = scaleX;
  } else if (variant === "slide-in-left") {
    const progress = spring({ frame: relFrame, fps, config: { damping: 14, stiffness: 180, mass: 1 } });
    translateX = interpolate(progress, [0, 1], [-120, 0]);
  } else if (variant === "zoom-in") {
    const progress = spring({ frame: relFrame, fps, config: { damping: 12, stiffness: 150, mass: 1 } });
    scaleX = interpolate(progress, [0, 1], [0, 1]);
    scaleY = scaleX;
  } else if (variant === "float") {
    // Entrance: gentle spring scale, then idle bob
    scaleX = interpolate(entranceSpring, [0, 1], [0.8, 1]);
    scaleY = scaleX;
    // Idle: bob every 90 frames (3s at 30fps)
    const bobCycle = relFrame % 90;
    translateY = interpolate(bobCycle, [0, 45, 90], [0, -12, 0]);
  } else if (variant === "pulse") {
    scaleX = interpolate(entranceSpring, [0, 1], [0.8, 1]);
    scaleY = scaleX;
    // Idle: scale pulse every 50 frames
    const pulseCycle = relFrame % 50;
    const pulseScale = interpolate(pulseCycle, [0, 5, 10, 25, 50], [1, 1.08, 1.03, 1, 1]);
    scaleX *= pulseScale;
    scaleY *= pulseScale;
  } else if (variant === "spin") {
    scaleX = interpolate(entranceSpring, [0, 1], [0.8, 1]);
    scaleY = scaleX;
    // Continuous rotation: full 360° every 4 seconds
    rotate = interpolate(relFrame, [0, fps * 4], [0, 360], { extrapolateRight: "extend" }) % 360;
  }

  if (!overlay.imageSrc) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: `${overlay.position.x}%`,
        top: `${overlay.position.y}%`,
        transform: `translate(calc(-50% + ${translateX}px), calc(-50% + ${translateY}px)) scale(${scaleX}, ${scaleY}) rotate(${rotate}deg)`,
        opacity: alpha,
      }}
    >
      <Img
        src={overlay.imageSrc}
        style={{
          width,
          height: "auto",
          objectFit: "contain",
          display: "block",
        }}
      />
    </div>
  );
}
