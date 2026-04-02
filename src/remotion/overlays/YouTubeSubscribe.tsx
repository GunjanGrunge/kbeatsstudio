import { useCurrentFrame, spring, interpolate, useVideoConfig } from "remotion";
import type { OverlayConfig, SubscribeVariant } from "@/types/studio";

interface Props {
  overlay: OverlayConfig;
}

/* ─── timing constants (frames) ─── */
const T_BTN_IN       = 0;   // subscribe button slides in
const T_BTN_SETTLE   = 20;  // fully settled
const T_CURSOR_START = 22;  // cursor fades in and moves to button
const T_CLICK_SUB    = 46;  // cursor clicks subscribe
const T_SUBSCRIBED   = 52;  // button state flips to "Subscribed"
const T_CURSOR_BELL  = 62;  // cursor moves to bell
const T_CLICK_BELL   = 82;  // cursor clicks bell
const T_BELL_DONE    = 92;  // bell animation settles
const T_IDLE_START   = 96;  // everything loops from here

/* ─── Cursor SVG ─── */
function Cursor({ clicking }: { clicking: boolean }) {
  return (
    <svg width="28" height="34" viewBox="0 0 28 34" fill="none">
      <path
        d="M4 2L4 26L9.5 20.5L13.5 29L16.5 28L12.5 19.5L20 19.5L4 2Z"
        fill={clicking ? "#ccff00" : "white"}
        stroke={clicking ? "#88cc00" : "rgba(0,0,0,0.6)"}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ─── Ripple ring ─── */
function Ripple({ progress, color }: { progress: number; color: string }) {
  const r = interpolate(progress, [0, 1], [10, 60]);
  const op = interpolate(progress, [0, 0.3, 1], [0.9, 0.6, 0]);
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

/* ─── Notification badge ─── */
function NotifBadge({ scale }: { scale: number }) {
  return (
    <div style={{
      position: "absolute",
      top: -6,
      right: -6,
      width: 18,
      height: 18,
      borderRadius: "50%",
      background: "linear-gradient(135deg,#ff4500,#ff0000)",
      border: "2px solid #0a0a0a",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transform: `scale(${scale})`,
      boxShadow: `0 0 10px 3px rgba(255,60,0,0.7)`,
    }}>
      <span style={{ fontSize: 9, fontWeight: 900, color: "#fff", fontFamily: "Outfit,sans-serif" }}>1</span>
    </div>
  );
}

function getEntrance(variant: SubscribeVariant, relFrame: number, fps: number) {
  switch (variant) {
    case "bounce-in": {
      const scale = spring({ frame: relFrame, fps, config: { damping: 8, stiffness: 300, mass: 1.2 }, from: 0.3, to: 1 });
      const slideY = spring({ frame: relFrame, fps, config: { damping: 6, stiffness: 280, mass: 1.0 }, from: 40, to: 0 });
      return { scale, slideY };
    }
    case "pop": {
      const scale = spring({ frame: relFrame, fps, config: { damping: 10, stiffness: 400, mass: 0.5 }, from: 0, to: 1 });
      return { scale, slideY: 0 };
    }
    default: {
      const scale = spring({ frame: relFrame, fps, config: { damping: 14, stiffness: 180, mass: 0.8 }, from: 0.6, to: 1 });
      const slideY = spring({ frame: relFrame, fps, config: { damping: 18, stiffness: 200, mass: 0.8 }, from: 30, to: 0 });
      return { scale, slideY };
    }
  }
}

export function YouTubeSubscribe({ overlay }: Props) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const relFrame = frame;
  const totalFrames = overlay.durationInFrames;

  const variant = (overlay.animationVariant ?? "click") as SubscribeVariant;
  const { scale: entranceScale, slideY } = getEntrance(variant, relFrame, fps);

  /* ── exit fade ── */
  const fadeOut = interpolate(relFrame, [totalFrames - 15, totalFrames], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  const channelName = overlay.channelName ?? "KBeats";
  const opacity = (overlay.opacity ?? 1) * fadeOut;
  const componentScale = overlay.componentScale ?? 1;

  /* ────────────────────────────────────────────
     PHASE 1: subscribe button entrance
  ──────────────────────────────────────────── */
  const btnEntrance = spring({
    frame: Math.max(0, relFrame - T_BTN_IN),
    fps,
    config: { damping: 12, stiffness: 220, mass: 0.9 },
    from: 0,
    to: 1,
  });
  const btnSlideY = spring({
    frame: Math.max(0, relFrame - T_BTN_IN),
    fps,
    config: { damping: 14, stiffness: 200, mass: 0.8 },
    from: 24,
    to: 0,
  });

  /* ────────────────────────────────────────────
     PHASE 2: cursor appears + moves to button
  ──────────────────────────────────────────── */
  const cursorFadeIn = interpolate(relFrame, [T_CURSOR_START, T_CURSOR_START + 6], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // cursor travels from off-right to hover-over-subscribe, then to bell
  const cursorX = relFrame < T_CLICK_BELL
    ? interpolate(
        relFrame,
        [T_CURSOR_START, T_CLICK_SUB - 2, T_CLICK_SUB, T_CURSOR_BELL, T_CLICK_BELL],
        [120,            28,              26,           72,             70],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      )
    : 70;

  const cursorY = relFrame < T_CLICK_BELL
    ? interpolate(
        relFrame,
        [T_CURSOR_START, T_CLICK_SUB - 2, T_CLICK_SUB, T_CURSOR_BELL, T_CLICK_BELL],
        [60,             38,              38,           -10,            -10],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      )
    : -10;

  /* ────────────────────────────────────────────
     PHASE 3: subscribe click
  ──────────────────────────────────────────── */
  const isSubscribed = relFrame >= T_SUBSCRIBED;

  // click squish — spring punch on click frame
  const clickSquish = spring({
    frame: Math.max(0, relFrame - T_CLICK_SUB),
    fps,
    config: { damping: 6, stiffness: 600, mass: 0.5 },
    from: 0,
    to: 1,
  });
  const btnScale = relFrame >= T_CLICK_SUB && relFrame < T_SUBSCRIBED + 10
    ? interpolate(clickSquish, [0, 0.15, 0.5, 1], [1, 0.88, 1.06, 1])
    : 1;

  // ripple after subscribe click
  const rippleSubProgress = interpolate(
    relFrame,
    [T_CLICK_SUB, T_CLICK_SUB + 25],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const showRippleSub = relFrame >= T_CLICK_SUB && relFrame < T_CLICK_SUB + 25;

  // checkmark draw-on after subscribing
  const checkProgress = spring({
    frame: Math.max(0, relFrame - T_SUBSCRIBED),
    fps,
    config: { damping: 10, stiffness: 300, mass: 0.6 },
    from: 0,
    to: 1,
  });

  /* ────────────────────────────────────────────
     PHASE 4: bell click
  ──────────────────────────────────────────── */
  // Bell appears separately (slides out right of button after subscribing)
  const bellSeparate = spring({
    frame: Math.max(0, relFrame - T_SUBSCRIBED),
    fps,
    config: { damping: 10, stiffness: 240, mass: 0.8 },
    from: 0,
    to: 1,
  });
  const bellTranslateX = interpolate(bellSeparate, [0, 1], [0, 0]); // stays inline

  // Bell click shake
  const bellClickPulse = spring({
    frame: Math.max(0, relFrame - T_CLICK_BELL),
    fps,
    config: { damping: 5, stiffness: 800, mass: 0.4 },
    from: 0,
    to: 1,
  });
  const bellShake = relFrame >= T_CLICK_BELL && relFrame < T_BELL_DONE
    ? interpolate(bellClickPulse, [0, 0.1, 0.25, 0.4, 0.6, 0.8, 1], [0, 28, -22, 18, -12, 6, 0])
    : 0;

  // Bell idle ring after all clicks done
  const bellIdlePulse = spring({
    frame: relFrame % 55,
    fps,
    config: { damping: 8, stiffness: 400, mass: 0.3 },
    from: 0,
    to: 1,
  });
  const bellIdleRotate = relFrame >= T_IDLE_START
    ? interpolate(bellIdlePulse, [0, 0.3, 0.6, 1], [0, 14, -14, 0])
    : 0;

  const bellRotate = relFrame >= T_CLICK_BELL ? bellShake + bellIdleRotate : 0;

  // Bell scale on click
  const bellClickScale = spring({
    frame: Math.max(0, relFrame - T_CLICK_BELL),
    fps,
    config: { damping: 7, stiffness: 500, mass: 0.5 },
    from: 0,
    to: 1,
  });
  const bellScale = relFrame >= T_CLICK_BELL
    ? interpolate(bellClickScale, [0, 0.1, 0.4, 1], [1, 1.5, 0.85, 1])
    : 1;

  // Notification badge pops in after bell click
  const badgeScale = spring({
    frame: Math.max(0, relFrame - (T_CLICK_BELL + 6)),
    fps,
    config: { damping: 6, stiffness: 500, mass: 0.5 },
    from: 0,
    to: 1,
  });
  const showBadge = relFrame >= T_CLICK_BELL + 6;

  // Bell glow after click
  const bellGlowOpacity = relFrame >= T_CLICK_BELL
    ? interpolate(relFrame, [T_CLICK_BELL, T_CLICK_BELL + 20, T_BELL_DONE + 30], [0, 1, 0.4], {
        extrapolateLeft: "clamp", extrapolateRight: "clamp",
      })
    : 0;

  // Ripple after bell click
  const rippleBellProgress = interpolate(
    relFrame,
    [T_CLICK_BELL, T_CLICK_BELL + 28],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const showRippleBell = relFrame >= T_CLICK_BELL && relFrame < T_CLICK_BELL + 28;

  /* ────────────────────────────────────────────
     IDLE: glow breath
  ──────────────────────────────────────────── */
  const glowBreath = relFrame >= T_IDLE_START
    ? interpolate(relFrame % 80, [0, 40, 80], [0.5, 1, 0.5], {
        extrapolateLeft: "clamp", extrapolateRight: "clamp",
      })
    : 0.5;

  // Avatar ring pulse
  const ringPulse = interpolate(relFrame % 70, [0, 35, 70], [1, 1.16, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // Cursor click state
  const isCursorClicking =
    (relFrame >= T_CLICK_SUB - 1 && relFrame <= T_CLICK_SUB + 4) ||
    (relFrame >= T_CLICK_BELL - 1 && relFrame <= T_CLICK_BELL + 4);

  const cursorVisible = relFrame >= T_CURSOR_START && relFrame < T_BELL_DONE + 15;

  return (
    <div
      style={{
        position: "absolute",
        left: `${overlay.position.x}%`,
        top: `${overlay.position.y}%`,
        transform: `translate(-50%, -50%) scale(${entranceScale * componentScale}) translateY(${slideY}px)`,
        opacity,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
      }}
    >
      {/* ── Channel card ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: "rgba(8,8,8,0.88)",
          backdropFilter: "blur(20px)",
          borderRadius: 48,
          padding: "10px 20px 10px 10px",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 8px 40px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)",
        }}
      >
        {/* Avatar with animated ring */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div style={{
            position: "absolute", inset: -3, borderRadius: "50%",
            background: "conic-gradient(#ff0000, #ff4500, #ff0000)",
            transform: `scale(${ringPulse})`, opacity: 0.9,
          }} />
          <div style={{
            position: "absolute", inset: -3, borderRadius: "50%",
            boxShadow: "0 0 16px 4px rgba(255,0,0,0.5)",
            transform: `scale(${ringPulse})`,
          }} />
          <div style={{
            position: "relative", width: 40, height: 40, borderRadius: "50%",
            background: "linear-gradient(135deg,#ccff00 0%,#88cc00 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "Unbounded,sans-serif", fontWeight: 900, fontSize: 15,
            color: "#050505", border: "2px solid #0a0a0a",
          }}>
            {channelName.charAt(0).toUpperCase()}
          </div>
        </div>

        {/* Channel name */}
        <span style={{
          fontFamily: "Outfit,sans-serif", fontWeight: 700, fontSize: 17,
          color: "#ffffff", whiteSpace: "nowrap", letterSpacing: 0.3,
        }}>
          {channelName}
        </span>
      </div>

      {/* ── Subscribe / Subscribed button ── */}
      <div style={{ position: "relative" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: isSubscribed
              ? "linear-gradient(135deg,#1a1a1a 0%,#2a2a2a 100%)"
              : "linear-gradient(135deg,#ff0000 0%,#cc0000 100%)",
            borderRadius: 10,
            padding: "13px 24px",
            boxShadow: isSubscribed
              ? "0 4px 20px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)"
              : `0 4px 32px rgba(255,0,0,${0.45 * glowBreath}), 0 0 0 1px rgba(255,80,80,0.3)`,
            transform: `scale(${btnScale}) translateY(${btnSlideY}px)`,
            position: "relative",
            overflow: "hidden",
            transition: "background 0.3s",
          }}
        >
          {/* Sheen sweep (pre-subscribe only) */}
          {!isSubscribed && (
            <div style={{
              position: "absolute", top: 0,
              left: `${interpolate(relFrame % 120, [0, 60, 90, 120], [-100, 120, 120, -100], {
                extrapolateLeft: "clamp", extrapolateRight: "clamp",
              })}%`,
              width: "40%", height: "100%",
              background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent)",
              pointerEvents: "none",
            }} />
          )}

          {/* Ripple on subscribe click */}
          {showRippleSub && <Ripple progress={rippleSubProgress} color="#ff4444" />}

          {/* YT logo */}
          <svg width="22" height="16" viewBox="0 0 22 16" fill={isSubscribed ? "#888" : "white"}>
            <path d="M21.6 2.5C21.4 1.7 20.8 1.1 20 0.9C18.3 0.5 11 0.5 11 0.5C11 0.5 3.7 0.5 2 0.9C1.2 1.1 0.6 1.7 0.4 2.5C0 4.2 0 8 0 8C0 8 0 11.8 0.4 13.5C0.6 14.3 1.2 14.9 2 15.1C3.7 15.5 11 15.5 11 15.5C11 15.5 18.3 15.5 20 15.1C20.8 14.9 21.4 14.3 21.6 13.5C22 11.8 22 8 22 8C22 8 22 4.2 21.6 2.5Z"/>
            <polygon points="8.8,11.2 14.5,8 8.8,4.8" fill={isSubscribed ? "#444" : "#ff0000"}/>
          </svg>

          {/* Checkmark (after subscribe) */}
          {isSubscribed && (
            <svg
              width="18" height="18" viewBox="0 0 24 24"
              fill="none" stroke="#ccff00" strokeWidth="3"
              strokeLinecap="round" strokeLinejoin="round"
              style={{ opacity: checkProgress }}
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}

          {/* Label */}
          <span style={{
            fontFamily: "Outfit,sans-serif", fontWeight: 800, fontSize: 18,
            color: isSubscribed ? "#F7F6E5" : "#ffffff",
            letterSpacing: 0.8, textTransform: "uppercase" as const,
          }}>
            {isSubscribed ? "Subscribed" : "Subscribe"}
          </span>

          {/* Bell (inside button, pre-separate) */}
          <div style={{
            position: "relative",
            transform: `rotate(${bellRotate}deg) scale(${bellScale})`,
            transformOrigin: "50% 20%",
            display: "flex", alignItems: "center",
          }}>
            {/* Bell glow halo */}
            {bellGlowOpacity > 0 && (
              <div style={{
                position: "absolute", inset: -8, borderRadius: "50%",
                background: `radial-gradient(circle, rgba(255,165,0,${bellGlowOpacity * 0.8}) 0%, transparent 70%)`,
                pointerEvents: "none",
              }} />
            )}
            {/* Ripple on bell click */}
            {showRippleBell && <Ripple progress={rippleBellProgress} color="#ffaa00" />}

            <svg
              width="22" height="22" viewBox="0 0 24 24"
              fill={relFrame >= T_CLICK_BELL ? "#ffaa00" : "none"}
              stroke={relFrame >= T_CLICK_BELL ? "#ffaa00" : "white"}
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>

            {showBadge && <NotifBadge scale={badgeScale} />}
          </div>
        </div>
      </div>

      {/* ── Animated cursor ── */}
      {cursorVisible && (
        <div
          style={{
            position: "absolute",
            left: `calc(50% + ${cursorX}px)`,
            top: `calc(100% + ${cursorY - 10}px)`,
            opacity: cursorFadeIn,
            pointerEvents: "none",
            filter: isCursorClicking
              ? "drop-shadow(0 0 8px rgba(204,255,0,0.9))"
              : "drop-shadow(0 2px 6px rgba(0,0,0,0.7))",
            transform: isCursorClicking ? "scale(0.88)" : "scale(1)",
          }}
        >
          <Cursor clicking={isCursorClicking} />
        </div>
      )}
    </div>
  );
}
