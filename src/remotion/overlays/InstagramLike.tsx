import { useCurrentFrame, spring, interpolate, useVideoConfig } from "remotion";
import type { OverlayConfig } from "@/types/studio";

interface Props {
  overlay: OverlayConfig;
}

/* ── Timing (frames) ── */
const T_TAP1        = 12;   // first tap
const T_TAP2        = 26;   // second tap (double-tap)
const T_HEART_BURST = 28;   // big heart animates in
const T_IDLE        = 70;   // looping from here

/* ── Floating heart particles ── */
const PARTICLES = [
  { angle: -40, delay: 0,  size: 14, drift: 28 },
  { angle: -15, delay: 3,  size: 10, drift: 22 },
  { angle:  10, delay: 6,  size: 16, drift: 32 },
  { angle:  35, delay: 1,  size: 11, drift: 25 },
  { angle: -60, delay: 4,  size: 9,  drift: 20 },
  { angle:  55, delay: 2,  size: 13, drift: 30 },
];

function HeartIcon({ size, fill, opacity }: { size: number; fill: string; opacity?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ opacity: opacity ?? 1 }}>
      <path
        d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
        fill={fill}
        stroke={fill === "none" ? "rgba(255,255,255,0.6)" : "none"}
        strokeWidth={fill === "none" ? 1.5 : 0}
      />
    </svg>
  );
}

export function InstagramLike({ overlay }: Props) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const relFrame = frame - overlay.startFrame;
  const totalFrames = overlay.durationInFrames;

  const fadeOut = interpolate(relFrame, [totalFrames - 15, totalFrames], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const opacity = (overlay.opacity ?? 1) * fadeOut;
  const componentScale = overlay.componentScale ?? 1;

  /* ── Card entrance ── */
  const cardScale = spring({ frame: relFrame, fps, config: { damping: 11, stiffness: 200, mass: 0.8 }, from: 0.6, to: 1 });
  const cardSlideY = spring({ frame: relFrame, fps, config: { damping: 14, stiffness: 180 }, from: 30, to: 0 });

  /* ── Tap ripples ── */
  const ripple1 = interpolate(relFrame, [T_TAP1, T_TAP1 + 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ripple2 = interpolate(relFrame, [T_TAP2, T_TAP2 + 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const rippleOpacity1 = relFrame >= T_TAP1 && relFrame < T_TAP1 + 20 ? interpolate(ripple1, [0, 0.3, 1], [0.7, 0.4, 0]) : 0;
  const rippleOpacity2 = relFrame >= T_TAP2 && relFrame < T_TAP2 + 20 ? interpolate(ripple2, [0, 0.3, 1], [0.7, 0.4, 0]) : 0;

  /* ── Big heart burst ── */
  const heartBurstScale = spring({ frame: Math.max(0, relFrame - T_HEART_BURST), fps, config: { damping: 7, stiffness: 400, mass: 0.6 }, from: 0, to: 1 });
  const heartBurstOvershoot = interpolate(heartBurstScale, [0, 0.6, 0.8, 1], [0, 1.4, 0.9, 1]);
  const heartGlow = relFrame >= T_HEART_BURST
    ? interpolate(relFrame, [T_HEART_BURST, T_HEART_BURST + 15, T_IDLE], [0, 1, 0.5], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    : 0;

  /* ── Idle pulse ── */
  const idlePulse = relFrame >= T_IDLE
    ? interpolate(relFrame % 50, [0, 25, 50], [1, 1.08, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    : 1;

  /* ── Floating particle hearts ── */
  const particleProgress = relFrame >= T_HEART_BURST ? (relFrame - T_HEART_BURST) % 60 : -1;

  return (
    <div style={{
      position: "absolute",
      left: `${overlay.position.x}%`,
      top: `${overlay.position.y}%`,
      transform: `translate(-50%, -50%) scale(${cardScale * componentScale}) translateY(${cardSlideY}px)`,
      opacity,
    }}>
      <div style={{
        position: "relative",
        background: "rgba(10,10,10,0.92)",
        backdropFilter: "blur(24px)",
        borderRadius: 22,
        padding: "22px 32px",
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "0 12px 60px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.07)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 14,
      }}>

        {/* Tap ripples */}
        {rippleOpacity1 > 0 && (
          <div style={{
            position: "absolute", borderRadius: "50%",
            width: interpolate(ripple1, [0, 1], [20, 130]),
            height: interpolate(ripple1, [0, 1], [20, 130]),
            border: "1.5px solid rgba(255,48,108,0.6)",
            left: "50%", top: "50%",
            transform: "translate(-50%, -50%)",
            opacity: rippleOpacity1,
            pointerEvents: "none",
          }} />
        )}
        {rippleOpacity2 > 0 && (
          <div style={{
            position: "absolute", borderRadius: "50%",
            width: interpolate(ripple2, [0, 1], [20, 150]),
            height: interpolate(ripple2, [0, 1], [20, 150]),
            border: "1.5px solid rgba(255,48,108,0.6)",
            left: "50%", top: "50%",
            transform: "translate(-50%, -50%)",
            opacity: rippleOpacity2,
            pointerEvents: "none",
          }} />
        )}

        {/* "Double tap to like" label */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="2" width="20" height="20" rx="5" stroke="url(#igGradL)" strokeWidth="2"/>
            <circle cx="12" cy="12" r="5" stroke="url(#igGradL)" strokeWidth="2"/>
            <circle cx="17.5" cy="6.5" r="1.5" fill="url(#igGradL)"/>
            <defs>
              <linearGradient id="igGradL" x1="2" y1="22" x2="22" y2="2" gradientUnits="userSpaceOnUse">
                <stop stopColor="#f09433"/><stop offset="0.5" stopColor="#e1306c"/><stop offset="1" stopColor="#833ab4"/>
              </linearGradient>
            </defs>
          </svg>
          <span style={{ fontFamily: "Outfit, sans-serif", fontSize: 13, fontWeight: 500, color: "rgba(247,246,229,0.55)", letterSpacing: 0.2 }}>
            Double tap to like
          </span>
        </div>

        {/* Heart with particles */}
        <div style={{ position: "relative", width: 80, height: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {heartGlow > 0 && (
            <div style={{
              position: "absolute", inset: -20, borderRadius: "50%",
              background: `radial-gradient(circle, rgba(255,48,108,${heartGlow * 0.5}) 0%, transparent 70%)`,
              pointerEvents: "none",
            }} />
          )}

          {relFrame >= T_HEART_BURST && PARTICLES.map((p, i) => {
            const t = Math.max(0, particleProgress - p.delay);
            const progress = Math.min(t / 55, 1);
            const yPos = interpolate(progress, [0, 1], [0, -(p.drift + 40)]);
            const xPos = Math.sin(progress * Math.PI) * p.drift * Math.cos(p.angle * Math.PI / 180) * 0.8;
            const pOpacity = interpolate(progress, [0, 0.1, 0.6, 1], [0, 0.9, 0.7, 0]);
            const pScale = interpolate(progress, [0, 0.15, 1], [0, 1.2, 0.7]);
            return (
              <div key={i} style={{
                position: "absolute", pointerEvents: "none",
                transform: `translate(${xPos}px, ${yPos}px) scale(${pScale})`,
                opacity: pOpacity,
              }}>
                <HeartIcon size={p.size} fill="#ff306c" />
              </div>
            );
          })}

          <div style={{
            transform: `scale(${relFrame >= T_HEART_BURST ? heartBurstOvershoot * idlePulse : 0.7})`,
            filter: heartGlow > 0 ? `drop-shadow(0 0 ${heartGlow * 18}px rgba(255,48,108,0.9))` : undefined,
          }}>
            <HeartIcon size={62} fill={relFrame >= T_HEART_BURST ? "url(#heartGradL)" : "none"} />
            <svg width="0" height="0" style={{ position: "absolute" }}>
              <defs>
                <linearGradient id="heartGradL" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ff6b6b"/>
                  <stop offset="100%" stopColor="#ff306c"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
