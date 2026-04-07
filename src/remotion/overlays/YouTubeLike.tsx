import { useCurrentFrame, spring, interpolate, useVideoConfig } from "remotion";
import type { OverlayConfig } from "@/types/studio";
import type { LikeVariant } from "@/types/studio";

interface Props {
  overlay: OverlayConfig;
}

// Floating particle for heart-pop and click variants
function FloatingParticle({
  x, y, scale, opacity, children,
}: { x: number; y: number; scale: number; opacity: number; children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${scale})`,
        opacity,
        pointerEvents: "none",
      }}
    >
      {children}
    </div>
  );
}

export function YouTubeLike({ overlay }: Props) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const relFrame = frame;
  const totalFrames = overlay.durationInFrames;

  const variant = (overlay.animationVariant ?? "pulse") as LikeVariant;

  // Entrance spring
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

  const opacity = (overlay.opacity ?? 1) * fadeOut;
  const componentScale = overlay.componentScale ?? 1;

  // ── pulse ──
  const pulseCycle = relFrame % 45;
  const pulseScale =
    variant === "pulse"
      ? interpolate(pulseCycle, [0, 3, 6, 15], [1, 1.2, 1.05, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 1;

  // Sonar ring: expands outward on each pulse beat (cycle of 45 frames)
  const sonarProgress = variant === "pulse"
    ? interpolate(pulseCycle, [0, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    : 0;
  const sonarScale = interpolate(sonarProgress, [0, 1], [1, 2.8]);
  const sonarOpacity = interpolate(sonarProgress, [0, 0.15, 0.7, 1], [0, 0.55, 0.2, 0]);

  // ── bounce ──
  const bounceCycle = relFrame % 30;
  const bounceY =
    variant === "bounce"
      ? interpolate(bounceCycle, [0, 8, 15, 22, 30], [0, -8, 0, -4, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 0;

  // ── heart-pop ──
  // Phase 1 (0–18f): thumb visible, fades out
  // Phase 2 (12–28f): heart pops in (spring scale)
  // Phase 3 (22–80f): hearts float upward in waves
  const HEART_SWITCH = 15; // frame when thumb→heart swap happens
  const heartPopSpring = spring({
    frame: Math.max(0, relFrame - HEART_SWITCH),
    fps,
    config: { damping: 6, stiffness: 500, mass: 0.35 },
    from: 0,
    to: 1,
  });
  const showHeart = variant === "heart-pop" && relFrame >= HEART_SWITCH;
  const thumbFadeForHeart =
    variant === "heart-pop"
      ? interpolate(relFrame, [HEART_SWITCH - 4, HEART_SWITCH + 4], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 1;
  const heartIconScale = showHeart ? interpolate(heartPopSpring, [0, 0.4, 0.7, 1], [0, 1.4, 0.9, 1]) : 0;
  const heartIconOpacity = showHeart ? interpolate(heartPopSpring, [0, 0.1, 1], [0, 1, 1]) : 0;

  // Floating hearts — 6 hearts, staggered offsets, cycling every 80 frames
  const HEART_PARTICLES = [
    { xOffset: -18, delay: 22, xDrift: -12 },
    { xOffset: 0,   delay: 26, xDrift: 4   },
    { xOffset: 18,  delay: 30, xDrift: 16  },
    { xOffset: -8,  delay: 36, xDrift: -20 },
    { xOffset: 10,  delay: 40, xDrift: 8   },
    { xOffset: -24, delay: 44, xDrift: -6  },
  ];

  // ── click ──
  // Phase 0–10f: cursor slides in from upper-right
  // Phase 10–20f: cursor presses down (scale shrink) — button highlights
  // Phase 18–30f: button "liked" state snaps in (blue fill, scale burst)
  // Phase 25–80f: small thumb icons rise up
  const CLICK_PRESS = 12;
  const CLICK_LIKED = 20;
  const cursorEnter = spring({
    frame: relFrame,
    fps,
    config: { damping: 14, stiffness: 260, mass: 0.7 },
    from: 0,
    to: 1,
  });
  const cursorX = interpolate(cursorEnter, [0, 1], [55, 22]);
  const cursorY = interpolate(cursorEnter, [0, 1], [-40, -8]);
  const cursorPressScale =
    variant === "click" && relFrame >= CLICK_PRESS && relFrame < CLICK_LIKED
      ? interpolate(relFrame, [CLICK_PRESS, CLICK_PRESS + 5, CLICK_LIKED], [1, 0.7, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 1;

  const isLiked = variant === "click" && relFrame >= CLICK_LIKED;
  const likePopSpring = spring({
    frame: Math.max(0, relFrame - CLICK_LIKED),
    fps,
    config: { damping: 6, stiffness: 500, mass: 0.35 },
    from: 0,
    to: 1,
  });
  const likedButtonScale = isLiked ? interpolate(likePopSpring, [0, 0.4, 0.7, 1], [0.85, 1.3, 0.92, 1]) : 1;

  // Rising thumb particles after like
  const THUMB_PARTICLES = [
    { xOffset: -20, delay: CLICK_LIKED + 5,  xDrift: -14 },
    { xOffset: 0,   delay: CLICK_LIKED + 9,  xDrift: 6   },
    { xOffset: 20,  delay: CLICK_LIKED + 13, xDrift: 18  },
    { xOffset: -10, delay: CLICK_LIKED + 18, xDrift: -8  },
    { xOffset: 12,  delay: CLICK_LIKED + 22, xDrift: -16 },
  ];

  const idleScale = variant === "pulse" ? pulseScale : isLiked ? likedButtonScale : 1;
  const thumbColor = isLiked ? "#4488ff" : "#ffffff";
  const labelColor = isLiked ? "#4488ff" : "#ffffff";
  const buttonBorder = isLiked ? "1px solid rgba(68,136,255,0.4)" : "1px solid rgba(255,255,255,0.1)";
  const buttonBg = isLiked ? "rgba(68,136,255,0.12)" : "rgba(0,0,0,0.75)";

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
      {/* ── heart-pop: floating hearts ── */}
      {variant === "heart-pop" && HEART_PARTICLES.map((p, i) => {
        const pFrame = relFrame - p.delay;
        if (pFrame < 0) return null;
        // cycle every 80 frames after initial delay
        const cycleFrame = pFrame % 80;
        const pY = interpolate(cycleFrame, [0, 60], [0, -90], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const pX = interpolate(cycleFrame, [0, 60], [p.xOffset, p.xOffset + p.xDrift], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const pOpacity = interpolate(cycleFrame, [0, 8, 45, 60], [0, 0.9, 0.7, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const pScale = interpolate(cycleFrame, [0, 6, 60], [0, 1, 0.5], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return (
          <FloatingParticle key={i} x={pX} y={pY} scale={pScale} opacity={pOpacity}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#ff4455">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </FloatingParticle>
        );
      })}

      {/* ── click: rising thumb icons ── */}
      {variant === "click" && isLiked && THUMB_PARTICLES.map((p, i) => {
        const pFrame = relFrame - p.delay;
        if (pFrame < 0) return null;
        const cycleFrame = pFrame % 90;
        const pY = interpolate(cycleFrame, [0, 65], [0, -100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const pX = interpolate(cycleFrame, [0, 65], [p.xOffset, p.xOffset + p.xDrift], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const pOpacity = interpolate(cycleFrame, [0, 8, 50, 65], [0, 1, 0.8, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const pScale = interpolate(cycleFrame, [0, 6, 65], [0, 1, 0.4], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return (
          <FloatingParticle key={i} x={pX} y={pY} scale={pScale} opacity={pOpacity}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="#4488ff">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
              <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
            </svg>
          </FloatingParticle>
        );
      })}

      {/* ── click: cursor SVG ── */}
      {variant === "click" && relFrame < CLICK_LIKED + 8 && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: `translate(calc(-50% + ${cursorX}px), calc(-50% + ${cursorY}px)) scale(${cursorPressScale})`,
            pointerEvents: "none",
            zIndex: 10,
            opacity: interpolate(relFrame, [0, 4, CLICK_LIKED + 2, CLICK_LIKED + 8], [0, 1, 1, 0], {
              extrapolateLeft: "clamp", extrapolateRight: "clamp",
            }),
          }}
        >
          <svg width="22" height="28" viewBox="0 0 22 28" fill="none">
            <path
              d="M4 2 L4 18 L7.5 14.5 L10 20 L12.5 19 L10 13 L15 13 Z"
              fill="white"
              stroke="#333"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}

      {/* ── Pulse sonar ring ── */}
      {variant === "pulse" && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: `translate(-50%, -50%) scale(${sonarScale})`,
            opacity: sonarOpacity,
            borderRadius: 40,
            border: "2px solid rgba(255,255,255,0.6)",
            // match the pill shape roughly
            width: 140,
            height: 52,
            pointerEvents: "none",
          }}
        />
      )}

      {/* ── Main button pill ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: buttonBg,
          backdropFilter: "blur(12px)",
          borderRadius: 40,
          padding: "12px 20px",
          border: buttonBorder,
          transform: `scale(${idleScale})`,
          boxShadow: isLiked ? "0 0 20px rgba(68,136,255,0.25)" : "none",
          transition: "box-shadow 0.2s",
        }}
      >
        {/* Thumb up — hidden when heart-pop shows heart */}
        {!(variant === "heart-pop" && showHeart) && (
          <div style={{ transform: `translateY(${bounceY}px)`, opacity: variant === "heart-pop" ? thumbFadeForHeart : 1 }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill={thumbColor} style={{ flexShrink: 0, display: "block" }}>
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
              <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
            </svg>
          </div>
        )}

        {/* Heart icon — only in heart-pop after switch */}
        {variant === "heart-pop" && (
          <div style={{ transform: `scale(${heartIconScale})`, opacity: heartIconOpacity, position: showHeart ? "relative" : "absolute" }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="#ff4455" style={{ flexShrink: 0, display: "block" }}>
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </div>
        )}

        <span
          style={{
            fontFamily: "Outfit, sans-serif",
            fontWeight: 600,
            fontSize: 18,
            color: variant === "heart-pop" && showHeart ? "#ff4455" : labelColor,
          }}
        >
          {variant === "heart-pop" && showHeart ? "Liked" : isLiked ? "Liked" : "Like"}
        </span>
      </div>
    </div>
  );
}
