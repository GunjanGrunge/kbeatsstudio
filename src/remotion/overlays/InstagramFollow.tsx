import { useCurrentFrame, spring, interpolate, useVideoConfig } from "remotion";
import type { OverlayConfig } from "@/types/studio";

interface Props {
  overlay: OverlayConfig;
}

/* ── Timing ── */
const T_BTN_IN      = 0;   // card slides in
const T_CURSOR_IN   = 18;  // cursor fades in
const T_HOVER       = 32;  // cursor hovers over Follow button
const T_CLICK       = 44;  // cursor clicks
const T_FOLLOWING   = 52;  // state flips to "Following"
const T_CURSOR_OUT  = 68;  // cursor fades out
const T_IDLE        = 76;  // gradient ring rotates continuously

/* ── Cursor SVG ── */
function Cursor({ clicking }: { clicking: boolean }) {
  return (
    <svg width="26" height="32" viewBox="0 0 26 32" fill="none">
      <path
        d="M4 2L4 24L9 19L12.5 27L15 26L11.5 18.5L18.5 18.5L4 2Z"
        fill={clicking ? "#ccff00" : "white"}
        stroke={clicking ? "#88cc00" : "rgba(0,0,0,0.5)"}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ── Ripple ── */
function Ripple({ progress, color }: { progress: number; color: string }) {
  const r = interpolate(progress, [0, 1], [8, 56]);
  const op = interpolate(progress, [0, 0.3, 1], [0.85, 0.5, 0]);
  return (
    <div style={{
      position: "absolute",
      borderRadius: "50%",
      border: `2px solid ${color}`,
      width: r * 2,
      height: r * 2,
      left: "50%",
      top: "50%",
      transform: "translate(-50%, -50%)",
      opacity: op,
      pointerEvents: "none",
    }} />
  );
}

export function InstagramFollow({ overlay }: Props) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const relFrame = frame;
  const totalFrames = overlay.durationInFrames;

  const fadeOut = interpolate(relFrame, [totalFrames - 12, totalFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = (overlay.opacity ?? 1) * fadeOut;
  const username = overlay.username ?? "@kbeats";
  const componentScale = overlay.componentScale ?? 1;

  /* ── Card entrance ── */
  const cardScale = spring({
    frame: Math.max(0, relFrame - T_BTN_IN),
    fps,
    config: { damping: 12, stiffness: 240, mass: 0.8 },
    from: 0.6,
    to: 1,
  });
  const cardSlideY = spring({
    frame: Math.max(0, relFrame - T_BTN_IN),
    fps,
    config: { damping: 14, stiffness: 220 },
    from: 28,
    to: 0,
  });

  /* ── Rotating gradient ring ── */
  const ringRotation = relFrame * 2; // 2° per frame = one full rotation per 180 frames
  const ringPulse = interpolate(relFrame % 80, [0, 40, 80], [0.85, 1.08, 0.85], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // After "Following", ring becomes solid gradient, faster rotation
  const isFollowing = relFrame >= T_FOLLOWING;
  const ringSpeed = isFollowing ? 3 : 2;
  const fastRing = relFrame * ringSpeed;

  /* ── Cursor ── */
  const cursorFadeIn = interpolate(relFrame, [T_CURSOR_IN, T_CURSOR_IN + 8], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const cursorFadeOut = interpolate(relFrame, [T_CURSOR_OUT, T_CURSOR_OUT + 10], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const cursorOpacity = Math.min(cursorFadeIn, cursorFadeOut);

  // Cursor travels from off-right → hovers over Follow → click
  const cursorX = interpolate(
    relFrame,
    [T_CURSOR_IN, T_HOVER, T_CLICK],
    [80, 14, 14],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const cursorY = interpolate(
    relFrame,
    [T_CURSOR_IN, T_HOVER, T_CLICK],
    [50, 46, 44],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const isCursorClicking = relFrame >= T_CLICK - 1 && relFrame <= T_CLICK + 5;
  const cursorVisible = relFrame >= T_CURSOR_IN && relFrame < T_CURSOR_OUT + 10;

  /* ── Follow button click squish ── */
  const clickSquish = spring({
    frame: Math.max(0, relFrame - T_CLICK),
    fps,
    config: { damping: 6, stiffness: 700, mass: 0.4 },
    from: 0,
    to: 1,
  });
  const btnScale = relFrame >= T_CLICK && relFrame < T_FOLLOWING + 12
    ? interpolate(clickSquish, [0, 0.12, 0.45, 1], [1, 0.82, 1.1, 1])
    : 1;

  /* ── Ripple on click ── */
  const rippleProgress = interpolate(
    relFrame,
    [T_CLICK, T_CLICK + 28],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const showRipple = relFrame >= T_CLICK && relFrame < T_CLICK + 28;

  /* ── Following state: checkmark draw-on ── */
  const checkProgress = spring({
    frame: Math.max(0, relFrame - T_FOLLOWING),
    fps,
    config: { damping: 10, stiffness: 320, mass: 0.5 },
    from: 0,
    to: 1,
  });

  /* ── Idle glow breath ── */
  const idleGlow = relFrame >= T_IDLE
    ? interpolate(relFrame % 80, [0, 40, 80], [0.3, 0.7, 0.3], {
        extrapolateLeft: "clamp", extrapolateRight: "clamp",
      })
    : 0;

  /* ── IG gradient colors ── */
  const igGrad = "linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)";
  const followingGrad = "linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%)";

  return (
    <div
      style={{
        position: "absolute",
        left: `${overlay.position.x}%`,
        top: `${overlay.position.y}%`,
        transform: `translate(-50%, -50%) scale(${cardScale * componentScale}) translateY(${cardSlideY}px)`,
        opacity,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
      }}
    >
      {/* ── Profile row ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "rgba(0,0,0,0.78)",
          backdropFilter: "blur(16px)",
          borderRadius: 40,
          padding: "10px 18px 10px 10px",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 8px 36px rgba(0,0,0,0.6)",
        }}
      >
        {/* Rotating gradient avatar ring */}
        <div style={{ position: "relative", flexShrink: 0, width: 42, height: 42 }}>
          {/* Rotating gradient ring */}
          <div style={{
            position: "absolute",
            inset: -2,
            borderRadius: "50%",
            background: isFollowing ? followingGrad : igGrad,
            transform: `rotate(${isFollowing ? fastRing : ringRotation}deg) scale(${ringPulse})`,
            opacity: 0.95,
          }} />
          {/* Gap ring */}
          <div style={{
            position: "absolute",
            inset: 1,
            borderRadius: "50%",
            background: "#0a0a0a",
          }} />
          {/* Avatar */}
          <div style={{
            position: "absolute",
            inset: 3,
            borderRadius: "50%",
            background: "#111",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Unbounded, sans-serif",
            fontWeight: 900,
            fontSize: 13,
            color: "#ccff00",
          }}>
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

      {/* ── Follow / Following button ── */}
      <div
        style={{
          position: "relative",
          borderRadius: 40,
          padding: 2,
          background: isFollowing ? followingGrad : igGrad,
          transform: `scale(${btnScale})`,
          boxShadow: isFollowing
            ? `0 0 28px rgba(188,24,136,${0.3 + idleGlow * 0.4}), 0 6px 24px rgba(0,0,0,0.6)`
            : `0 0 22px rgba(188,24,136,0.4), 0 6px 20px rgba(0,0,0,0.5)`,
        }}
      >
        {/* Ripple */}
        {showRipple && <Ripple progress={rippleProgress} color="#e6683c" />}

        <div
          style={{
            background: isFollowing ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.82)",
            borderRadius: 38,
            padding: "11px 26px",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {/* Instagram icon */}
          {!isFollowing && (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="white" opacity={0.9}>
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5" fill="none" stroke="white" strokeWidth="2"/>
              <circle cx="12" cy="12" r="5" fill="none" stroke="white" strokeWidth="2"/>
              <circle cx="17.5" cy="6.5" r="1.5" fill="white"/>
            </svg>
          )}

          {/* Checkmark when following */}
          {isFollowing && (
            <svg
              width="16" height="16" viewBox="0 0 24 24"
              fill="none" stroke="white" strokeWidth="3"
              strokeLinecap="round" strokeLinejoin="round"
              style={{ opacity: checkProgress }}
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}

          <span
            style={{
              fontFamily: "Outfit, sans-serif",
              fontWeight: 700,
              fontSize: 17,
              color: "#ffffff",
              letterSpacing: 0.5,
            }}
          >
            {isFollowing ? "Following" : "Follow"}
          </span>
        </div>
      </div>

      {/* ── Cursor ── */}
      {cursorVisible && (
        <div
          style={{
            position: "absolute",
            left: `calc(50% + ${cursorX}px)`,
            top: `calc(100% + ${cursorY - 20}px)`,
            opacity: cursorOpacity,
            pointerEvents: "none",
            filter: isCursorClicking
              ? "drop-shadow(0 0 8px rgba(204,255,0,0.9))"
              : "drop-shadow(0 2px 6px rgba(0,0,0,0.7))",
            transform: isCursorClicking ? "scale(0.86)" : "scale(1)",
          }}
        >
          <Cursor clicking={isCursorClicking} />
        </div>
      )}
    </div>
  );
}
