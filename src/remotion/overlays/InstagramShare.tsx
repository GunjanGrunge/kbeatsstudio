import { useCurrentFrame, spring, interpolate, useVideoConfig, Img } from "remotion";

/* ── Cursor SVG ── */
function ShareCursor({ clicking }: { clicking: boolean }) {
  return (
    <svg width="24" height="30" viewBox="0 0 24 30" fill="none">
      <path
        d="M4 2L4 22L8.5 17.5L11.5 25L14 24L11 16.5L17.5 16.5L4 2Z"
        fill={clicking ? "#ccff00" : "white"}
        stroke={clicking ? "#88cc00" : "rgba(0,0,0,0.5)"}
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}
import type { OverlayConfig } from "@/types/studio";

interface Props {
  overlay: OverlayConfig;
}

/* ── Timing ── */
const T_SHARE_BTN  = 14;
const T_SHEET_OPEN = 28;
const T_FRIEND_1   = 38;
const T_FRIEND_2   = 46;
const T_FRIEND_3   = 54;
const T_TAP_SEND   = 68;
const T_PLANE_FLY  = 74;
const T_SENT       = 98;
const T_IDLE       = 110;

const FRIENDS = [
  { name: "Music Friends", initial: "♫", color: "#4ecdc4", delay: T_FRIEND_1 },
  { name: "Beat Lovers",   initial: "★", color: "#ff6b6b", delay: T_FRIEND_2 },
  { name: "All Followers", initial: "▶", color: "#ffe66d", delay: T_FRIEND_3 },
];

export function InstagramShare({ overlay }: Props) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const relFrame = frame;
  const totalFrames = overlay.durationInFrames;

  const fadeOut = interpolate(relFrame, [totalFrames - 15, totalFrames], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const opacity = (overlay.opacity ?? 1) * fadeOut;
  const componentScale = overlay.componentScale ?? 1;

  // User-configurable fields
  const shareTitle    = overlay.shareTitle    ?? "Latest Beat Drop";
  const shareUsername = overlay.shareUsername ?? "@kbeats";
  const shareImage    = overlay.shareImageSrc;
  const cardBg        = overlay.cardBgColor     ?? "rgba(10,10,10,0.94)";
  const cardBorder    = overlay.cardBorderColor ?? "rgba(255,255,255,0.08)";
  const accent        = overlay.accentColor     ?? "#ccff00";
  const fontFamily    = overlay.font?.family ? `'${overlay.font.family}', sans-serif` : "Outfit, sans-serif";
  const titleColor    = overlay.color ?? "#F7F6E5";
  const channelLabel  = overlay.channelName ?? "K BEATS";

  /* ── Send button cursor timing ── */
  // Cursor slides in before the share button tap, hovers, clicks, then retreats
  const T_CURSOR_APPEAR = T_SHARE_BTN - 12; // 2 frames before tap
  const T_CURSOR_HOVER  = T_SHARE_BTN - 4;
  const T_CURSOR_CLICK  = T_SHARE_BTN;
  const T_CURSOR_LEAVE  = T_SHARE_BTN + 16;

  const cursorFadeIn = interpolate(relFrame, [T_CURSOR_APPEAR, T_CURSOR_APPEAR + 6], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const cursorFadeOut = interpolate(relFrame, [T_CURSOR_LEAVE, T_CURSOR_LEAVE + 10], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const cursorOpacity = Math.min(cursorFadeIn, cursorFadeOut);

  // Cursor moves in from upper-right toward the share button icon
  const cursorX = interpolate(
    relFrame,
    [T_CURSOR_APPEAR, T_CURSOR_HOVER, T_CURSOR_CLICK, T_CURSOR_LEAVE],
    [90, 48, 48, 90],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const cursorY = interpolate(
    relFrame,
    [T_CURSOR_APPEAR, T_CURSOR_HOVER, T_CURSOR_CLICK, T_CURSOR_LEAVE],
    [-30, -10, -10, -50],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const isCursorClicking = relFrame >= T_CURSOR_CLICK - 1 && relFrame <= T_CURSOR_CLICK + 5;
  const cursorVisible = relFrame >= T_CURSOR_APPEAR && relFrame < T_CURSOR_LEAVE + 10;

  /* ── Ripple on send button click ── */
  const sendRippleProgress = interpolate(
    relFrame,
    [T_SHARE_BTN, T_SHARE_BTN + 22],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const showSendRipple = relFrame >= T_SHARE_BTN && relFrame < T_SHARE_BTN + 22;

  /* ── Card entrance ── */
  const cardScale  = spring({ frame: relFrame, fps, config: { damping: 11, stiffness: 200, mass: 0.85 }, from: 0.55, to: 1 });
  const cardSlideY = spring({ frame: relFrame, fps, config: { damping: 14, stiffness: 190 }, from: 32, to: 0 });

  /* ── Share button tap ── */
  const shareTap      = spring({ frame: Math.max(0, relFrame - T_SHARE_BTN), fps, config: { damping: 5, stiffness: 600, mass: 0.4 }, from: 0, to: 1 });
  const shareBtnScale = relFrame >= T_SHARE_BTN && relFrame < T_SHARE_BTN + 14
    ? interpolate(shareTap, [0, 0.2, 0.6, 1], [1, 0.75, 1.2, 1])
    : 1;
  const shareBtnGlow  = relFrame >= T_SHARE_BTN && relFrame < T_SHEET_OPEN
    ? interpolate(relFrame, [T_SHARE_BTN, T_SHARE_BTN + 8, T_SHEET_OPEN], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    : 0;

  /* ── Bottom sheet ── */
  const sheetSpring  = spring({ frame: Math.max(0, relFrame - T_SHEET_OPEN), fps, config: { damping: 14, stiffness: 260, mass: 0.75 }, from: 0, to: 1 });
  const sheetY       = relFrame >= T_SHEET_OPEN ? interpolate(sheetSpring, [0, 1], [80, 0]) : 80;
  const sheetOpacity = relFrame >= T_SHEET_OPEN ? interpolate(sheetSpring, [0, 0.1, 1], [0, 1, 1]) : 0;

  /* ── Friend tap (send to all) ── */
  // Each friend gets a staggered "sent" treatment after T_TAP_SEND
  const SENT_DELAYS = [T_TAP_SEND, T_TAP_SEND + 5, T_TAP_SEND + 10];
  const tapPulse   = spring({ frame: Math.max(0, relFrame - T_TAP_SEND), fps, config: { damping: 6, stiffness: 600, mass: 0.4 }, from: 0, to: 1 });
  const friend0Scale = relFrame >= T_TAP_SEND
    ? interpolate(tapPulse, [0, 0.15, 0.5, 1], [1, 0.85, 1.12, 1])
    : 1;

  /* ── Paper plane ── */
  const planeActive   = relFrame >= T_PLANE_FLY && relFrame < T_SENT;
  const planeProgress = planeActive
    ? Math.min((relFrame - T_PLANE_FLY) / (T_SENT - T_PLANE_FLY), 1)
    : relFrame >= T_SENT ? 1 : 0;

  const planeX       = interpolate(planeProgress, [0, 0.4, 1], [0, 60, 120]);
  const planeY       = interpolate(planeProgress, [0, 0.25, 0.65, 1], [0, -80, -60, -100]);
  const planeRotate  = interpolate(planeProgress, [0, 0.5, 1], [-45, -70, -25]);
  const planeScale   = interpolate(planeProgress, [0, 0.08, 0.85, 1], [0, 1.3, 1, 0.2]);
  const planeOpacity = interpolate(planeProgress, [0, 0.05, 0.85, 1], [0, 1, 1, 0]);

  // Trail dots
  const trailDots = planeActive ? [0.12, 0.25, 0.38].map((offset) => {
    const tp = Math.max(0, planeProgress - offset);
    return {
      x: interpolate(tp, [0, 0.4, 1], [0, 60, 120]),
      y: interpolate(tp, [0, 0.25, 0.65, 1], [0, -80, -60, -100]),
      op: interpolate(tp, [0, 0.1, 0.85, 1], [0, 0.7, 0.5, 0]),
    };
  }) : [];

  /* ── Sent confirmation ── */
  const sentSpring  = spring({ frame: Math.max(0, relFrame - T_SENT), fps, config: { damping: 10, stiffness: 340, mass: 0.6 }, from: 0, to: 1 });
  const sentScale   = relFrame >= T_SENT ? interpolate(sentSpring, [0, 0.5, 1], [0, 1.2, 1]) : 0;
  const sentOpacity = relFrame >= T_SENT ? interpolate(sentSpring, [0, 0.1, 1], [0, 1, 1]) : 0;

  /* ── Idle: share icon breathes + card subtle glow pulse ── */
  const idleBreath = relFrame >= T_IDLE
    ? interpolate(relFrame % 70, [0, 35, 70], [1, 1.12, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    : 1;
  const idleGlow = relFrame >= T_IDLE
    ? interpolate(relFrame % 90, [0, 45, 90], [0.3, 0.7, 0.3], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    : 0;

  return (
    <div style={{
      position: "absolute",
      left: `${overlay.position.x}%`,
      top: `${overlay.position.y}%`,
      transform: `translate(-50%, -50%) scale(${cardScale * componentScale}) translateY(${cardSlideY}px)`,
      opacity,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 12,
    }}>

      {/* ── Paper plane + trail ── */}
      {(planeActive || relFrame >= T_PLANE_FLY) && relFrame < T_SENT && (
        <div style={{ position: "absolute", top: "30%", left: "75%", pointerEvents: "none" }}>
          {trailDots.map((dot, i) => (
            <div key={i} style={{
              position: "absolute",
              width: 5, height: 5, borderRadius: "50%",
              background: `${accent}cc`,
              left: dot.x, top: dot.y,
              opacity: dot.op,
              transform: "translate(-50%,-50%)",
            }} />
          ))}
          <div style={{
            position: "absolute",
            transform: `translate(${planeX}px, ${planeY}px) rotate(${planeRotate}deg) scale(${planeScale})`,
            opacity: planeOpacity,
            filter: `drop-shadow(0 0 8px ${accent}99)`,
          }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
              <polygon points="22,2 11,13 2,9" fill={accent} stroke={accent} strokeWidth="0.5"/>
              <polyline points="22,2 15,22 11,13 22,2" fill={`${accent}55`} stroke={accent} strokeWidth="0.5"/>
            </svg>
          </div>
        </div>
      )}

      {/* ── Main card ── */}
      <div style={{
        background: cardBg,
        backdropFilter: "blur(28px)",
        borderRadius: 20,
        border: `1px solid ${cardBorder}`,
        boxShadow: relFrame >= T_IDLE
          ? `0 14px 56px rgba(0,0,0,0.85), 0 0 30px ${accent}${Math.round(idleGlow * 40).toString(16).padStart(2,"0")}`
          : "0 14px 56px rgba(0,0,0,0.85)",
        overflow: "hidden",
        width: 260,
      }}>

        {/* ── Thumbnail area ── */}
        <div style={{
          width: "100%",
          height: 130,
          position: "relative",
          background: shareImage
            ? "transparent"
            : "linear-gradient(135deg, #0d0d18 0%, #111827 50%, #0a1628 100%)",
          overflow: "hidden",
          flexShrink: 0,
        }}>
          {shareImage ? (
            <Img
              src={shareImage}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          ) : (
            /* K Beats logo placeholder */
            <div style={{
              width: "100%", height: "100%",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexDirection: "column", gap: 10,
              background: "linear-gradient(135deg, #0d0d18 0%, #111827 50%, #0a1628 100%)",
            }}>
              {/* K lettermark — matches header branding */}
              <div style={{
                width: 52, height: 52, borderRadius: 14,
                background: `linear-gradient(135deg, ${accent}18 0%, ${accent}35 100%)`,
                border: `1.5px solid ${accent}50`,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: `0 0 22px ${accent}28`,
              }}>
                <span style={{
                  fontFamily: "Unbounded, sans-serif",
                  fontWeight: 900,
                  fontSize: 26,
                  color: accent,
                  lineHeight: 1,
                  letterSpacing: -1,
                }}>K</span>
              </div>
              <span style={{
                fontFamily: "Unbounded, sans-serif",
                fontSize: 8,
                fontWeight: 300,
                color: `${accent}70`,
                letterSpacing: 3,
                textTransform: "uppercase" as const,
              }}>
                {channelLabel}
              </span>
            </div>
          )}
          {/* gradient overlay on image */}
          {shareImage && (
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.6) 100%)",
            }} />
          )}
        </div>

        {/* ── Post info row ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 14px",
          borderBottom: `1px solid ${cardBorder}`,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontFamily,
              fontWeight: overlay.font?.weight ?? 700,
              fontSize: overlay.font?.size ? Math.min(overlay.font.size * 0.22, 15) : 14,
              color: titleColor,
              margin: 0,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {shareTitle}
            </p>
            <p style={{
              fontFamily,
              fontSize: 11,
              color: `${titleColor}66`,
              margin: "2px 0 0",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {shareUsername}
            </p>
          </div>

          {/* Animated share/send button */}
          <div style={{ position: "relative", flexShrink: 0, marginLeft: 12 }}>
            {/* Click ripple ring */}
            {showSendRipple && (
              <div style={{
                position: "absolute",
                borderRadius: "50%",
                border: `2px solid ${accent}`,
                width: interpolate(sendRippleProgress, [0, 1], [16, 72]),
                height: interpolate(sendRippleProgress, [0, 1], [16, 72]),
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
                opacity: interpolate(sendRippleProgress, [0, 0.3, 1], [0.85, 0.5, 0]),
                pointerEvents: "none",
              }} />
            )}
            {shareBtnGlow > 0 && (
              <div style={{
                position: "absolute", inset: -12, borderRadius: "50%",
                background: `radial-gradient(circle, ${accent}${Math.round(shareBtnGlow * 0.55 * 255).toString(16).padStart(2,"0")} 0%, transparent 70%)`,
                pointerEvents: "none",
              }} />
            )}
            <div style={{
              width: 40, height: 40, borderRadius: "50%",
              background: relFrame >= T_SHARE_BTN ? `${accent}18` : "rgba(255,255,255,0.05)",
              border: `1.5px solid ${relFrame >= T_SHARE_BTN ? accent + "60" : "rgba(255,255,255,0.1)"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              transform: `scale(${shareBtnScale * idleBreath})`,
              boxShadow: relFrame >= T_SHARE_BTN ? `0 0 16px ${accent}44` : "none",
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </div>
          </div>
        </div>

        {/* ── Friends list (slides in) ── */}
        <div style={{
          transform: `translateY(${sheetY}px)`,
          opacity: sheetOpacity,
          overflow: "hidden",
        }}>
          <p style={{
            fontFamily: "Outfit, sans-serif", fontSize: 9, fontWeight: 600,
            color: `${titleColor}40`, textTransform: "uppercase", letterSpacing: 2,
            margin: "10px 14px 8px", paddingBottom: 8,
            borderBottom: `1px solid ${cardBorder}`,
          }}>
            Send to
          </p>

          {FRIENDS.map((f, i) => {
            const fSpring    = spring({ frame: Math.max(0, relFrame - f.delay), fps, config: { damping: 14, stiffness: 280 }, from: 0, to: 1 });
            const fOpacity   = relFrame >= f.delay ? interpolate(fSpring, [0, 1], [0, 1]) : 0;
            const fX         = relFrame >= f.delay ? interpolate(fSpring, [0, 1], [-18, 0]) : -18;
            const sentDelay  = SENT_DELAYS[i];
            const isSentTo   = relFrame >= sentDelay;
            const fCheckSpring = spring({ frame: Math.max(0, relFrame - sentDelay), fps, config: { damping: 10, stiffness: 340, mass: 0.6 }, from: 0, to: 1 });
            const checkScale  = isSentTo ? interpolate(fCheckSpring, [0, 0.5, 1], [0, 1.2, 1]) : 0;
            const checkOpacity = isSentTo ? interpolate(fCheckSpring, [0, 0.1, 1], [0, 1, 1]) : 0;
            const fScale      = i === 0 ? friend0Scale : 1;

            return (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 14px",
                opacity: fOpacity,
                transform: `translateX(${fX}px) scale(${fScale})`,
                background: isSentTo ? `${accent}12` : "transparent",
                borderLeft: isSentTo ? `3px solid ${accent}80` : "3px solid transparent",
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: `${f.color}18`,
                  border: `1.5px solid ${isSentTo ? accent + "80" : f.color + "55"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                  boxShadow: isSentTo ? `0 0 14px ${f.color}55` : "none",
                }}>
                  <span style={{ fontSize: 13, lineHeight: 1 }}>{f.initial}</span>
                </div>

                <span style={{
                  fontFamily: "Outfit, sans-serif",
                  fontWeight: isSentTo ? 700 : 400,
                  fontSize: 13,
                  color: isSentTo ? accent : `${titleColor}bb`,
                }}>
                  {f.name}
                </span>

                {/* Checkmark appears for each friend once sent */}
                <div style={{ marginLeft: "auto", transform: `scale(${checkScale})`, opacity: checkOpacity }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
              </div>
            );
          })}

          {/* Bottom padding */}
          <div style={{ height: 10 }} />
        </div>
      </div>

      {/* ── Send button cursor ── */}
      {cursorVisible && (
        <div style={{
          position: "absolute",
          right: `calc(0% - ${cursorX}px)`,
          top: `calc(30% + ${cursorY}px)`,
          opacity: cursorOpacity,
          pointerEvents: "none",
          zIndex: 20,
          filter: isCursorClicking
            ? "drop-shadow(0 0 8px rgba(204,255,0,0.9))"
            : "drop-shadow(0 2px 6px rgba(0,0,0,0.7))",
          transform: isCursorClicking ? "scale(0.86)" : "scale(1)",
        }}>
          <ShareCursor clicking={isCursorClicking} />
        </div>
      )}

      {/* ── Sent toast ── */}
      {relFrame >= T_SENT && (
        <div style={{
          transform: `scale(${sentScale})`,
          opacity: sentOpacity,
          background: `${accent}18`,
          border: `1px solid ${accent}55`,
          borderRadius: 40,
          padding: "7px 18px",
          display: "flex", alignItems: "center", gap: 7,
          boxShadow: `0 0 24px ${accent}30`,
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: 13, color: accent, letterSpacing: 0.4 }}>
            Sent
          </span>
        </div>
      )}
    </div>
  );
}
