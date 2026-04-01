import { useCurrentFrame, spring, interpolate, useVideoConfig } from "remotion";
import type { OverlayConfig } from "@/types/studio";
import type { LikeVariant } from "@/types/studio";

interface Props {
  overlay: OverlayConfig;
}

export function YouTubeLike({ overlay }: Props) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const relFrame = frame - overlay.startFrame;
  const totalFrames = overlay.durationInFrames;

  const variant = (overlay.animationVariant ?? "pulse") as LikeVariant;

  // Entrance spring (shared across all variants)
  const entranceScale = spring({
    frame: relFrame,
    fps,
    config: { damping: 12, stiffness: 200, mass: 0.7 },
    from: 0.5,
    to: 1,
  });

  // Exit fade
  const fadeOut = interpolate(relFrame, [totalFrames - 12, totalFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // --- Variant-specific idle animations ---

  // pulse (fixed): direct interpolation instead of broken spring
  const pulseCycle = relFrame % 45;
  const pulseScale =
    variant === "pulse"
      ? interpolate(pulseCycle, [0, 3, 6, 15], [1, 1.2, 1.05, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 1;

  // heart-pop: red flash every 60 frames
  const heartCycle = relFrame % 60;
  const heartFillAlpha =
    variant === "heart-pop"
      ? interpolate(heartCycle, [0, 5, 15], [0, 1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 0;
  const heartFlashScale =
    variant === "heart-pop"
      ? interpolate(heartCycle, [0, 12], [0, 2], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 0;
  const heartFlashOpacity =
    variant === "heart-pop"
      ? interpolate(heartCycle, [0, 6, 12], [0.6, 0.3, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 0;

  // bounce: thumb bounces up/down
  const bounceCycle = relFrame % 30;
  const bounceY =
    variant === "bounce"
      ? interpolate(bounceCycle, [0, 8, 15, 22, 30], [0, -8, 0, -4, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 0;

  // click: filled state + scale burst every 75 frames
  const clickCycle = relFrame % 75;
  const clickBurst =
    variant === "click"
      ? interpolate(clickCycle, [0, 4, 10, 20], [1, 1.3, 0.9, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 1;
  const clickRingScale =
    variant === "click"
      ? interpolate(clickCycle, [0, 20], [0.5, 2], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 0;
  const clickRingOpacity =
    variant === "click"
      ? interpolate(clickCycle, [0, 8, 20], [0.7, 0.3, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 0;

  const thumbFill =
    variant === "click"
      ? "#4488ff"
      : variant === "heart-pop"
      ? `rgba(255, 68, 68, ${heartFillAlpha})`
      : "white";

  const opacity = (overlay.opacity ?? 1) * fadeOut;
  const componentScale = overlay.componentScale ?? 1;

  const idleScale = variant === "pulse" ? pulseScale : variant === "click" ? clickBurst : 1;

  return (
    <div
      style={{
        position: "absolute",
        left: `${overlay.position.x}%`,
        top: `${overlay.position.y}%`,
        transform: `translate(-50%, -50%) scale(${entranceScale * componentScale})`,
        opacity,
      }}
    >
      {/* Click ring */}
      {variant === "click" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 40,
            border: "2px solid rgba(68,136,255,0.6)",
            transform: `scale(${clickRingScale})`,
            opacity: clickRingOpacity,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Heart-pop radial flash */}
      {variant === "heart-pop" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: "rgba(255,68,68,0.3)",
            transform: `scale(${heartFlashScale})`,
            opacity: heartFlashOpacity,
            pointerEvents: "none",
          }}
        />
      )}

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
          transform: `scale(${idleScale})`,
        }}
      >
        {/* Thumb up */}
        <div style={{ transform: `translateY(${bounceY}px)` }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill={thumbFill} style={{ flexShrink: 0 }}>
            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
            <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
          </svg>
        </div>

        <span
          style={{
            fontFamily: "Outfit, sans-serif",
            fontWeight: 600,
            fontSize: 18,
            color: variant === "click" ? "#4488ff" : "#ffffff",
          }}
        >
          Like
        </span>

        <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.2)" }} />

        <svg width="22" height="22" viewBox="0 0 24 24" fill="rgba(255,255,255,0.5)">
          <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/>
          <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/>
        </svg>
      </div>
    </div>
  );
}
