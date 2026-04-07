/**
 * MotionBackground.tsx
 *
 * All animations are frame-deterministic using Remotion's:
 *   - useCurrentFrame() — frame number drives every value
 *   - spring()          — physics curves (damping, stiffness, mass)
 *   - interpolate()     — multi-keyframe value mapping
 *
 * No CSS animations, no requestAnimationFrame, no wall-clock time.
 * Framer Motion is intentionally NOT used here because it runs on
 * wall-clock and breaks Remotion's frame-accurate export.
 */

import type { ReactElement } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import type { OverlayConfig, MotionBgConfig, LyricLine } from "@/types/studio";

// ─── Shared helpers ───────────────────────────────────────────────────────────

/** Deterministic pseudo-random 0..1 from an integer seed */
function sr(seed: number): number {
  return Math.abs(Math.sin(seed * 127.1 + 311.7) * 43758.5453123) % 1;
}

/** Linear interpolation */
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/** Smooth sinusoidal oscillation centred on 0, amplitude 1 */
function osc(frame: number, periodFrames: number, phaseFrames = 0) {
  return Math.sin(((frame + phaseFrames) / periodFrames) * Math.PI * 2);
}

/** Cosine oscillation */
function cosc(frame: number, periodFrames: number, phaseFrames = 0) {
  return Math.cos(((frame + phaseFrames) / periodFrames) * Math.PI * 2);
}

/** Hex colour → [r,g,b] 0..255 */
function hexToRgb(hex: string): [number, number, number] {
  const c = hex.replace("#", "");
  const n = parseInt(c.length === 3 ? c.split("").map((x) => x + x).join("") : c, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Interpolate between two hex colours, t 0..1 */
function lerpColor(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const r = Math.round(lerp(ar, br, t));
  const g = Math.round(lerp(ag, bg, t));
  const bv = Math.round(lerp(ab, bb, t));
  return `rgb(${r},${g},${bv})`;
}

// ─── 1. LIQUID CHROMATIC ──────────────────────────────────────────────────────
//
// True lava-lamp / oil-slick effect.
// The key visual signature: SVG feTurbulence + feDisplacementMap warps colour
// blobs into organic amoeba shapes that MORPH. No displacement map = plain
// circles which look identical to Ink Drop.
//
// Architecture:
//   • 5 large coloured "lava cells" whose SVG gradient centres move on slow paths
//   • feTurbulence baseFrequency animates by shifting `seed` each frame —
//     deterministic because seed = Math.floor(frame * speed) % 1000
//   • feDisplacementMap warps the colour layer by the turbulence field
//   • A second feBlend layer mixes a complementary colour film on top
//   • feColorMatrix saturate boosts colour vibrancy

const LAVA_CELLS = Array.from({ length: 5 }, (_, i) => ({
  baseX: 15 + sr(i * 7) * 70,
  baseY: 10 + sr(i * 7 + 1) * 80,
  ampX: 25 + sr(i * 11) * 25,
  ampY: 20 + sr(i * 11 + 1) * 30,
  periodX: 200 + sr(i * 13) * 250,
  periodY: 180 + sr(i * 13 + 1) * 220,
  phaseX: sr(i * 17) * 400,
  phaseY: sr(i * 17 + 1) * 400,
  radius: 35 + sr(i * 19) * 30,
  colorIdx: i % 4,
}));

function LiquidChromatic({ cfg, frame, fps }: { cfg: MotionBgConfig; frame: number; fps: number }) {
  const spd = cfg.speed;
  const colors = [
    cfg.colors[0],
    cfg.colors[1],
    cfg.colors[2] ?? cfg.colors[0],
    cfg.colors[3] ?? cfg.colors[1],
  ];

  // Turbulence seed advances each frame → organic morphing
  const turbSeed = Math.floor(frame * spd * 0.4) % 1000;
  // turbulence frequency oscillates slowly for breathing effect
  const turbFreq = 0.008 + osc(frame * spd, 300, 0) * 0.003;
  // Displacement scale pulses — bigger = more distorted / oil-slick
  const dispScale = (12 + osc(frame * spd, 150, 50) * 6) * cfg.intensity;

  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", inset: 0, background: "#02020a" }} />

      {/* Layer A — the colour blobs that get displacement-warped */}
      <svg
        id="lc-color-layer"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {LAVA_CELLS.map((c, i) => {
            const cx = c.baseX + osc(frame * spd, c.periodX, c.phaseX) * c.ampX;
            const cy = c.baseY + osc(frame * spd, c.periodY, c.phaseY) * c.ampY;
            const colorT = interpolate(osc(frame * spd, 200 + i * 31, c.phaseX), [-1, 1], [0, 1]);
            const col = lerpColor(colors[c.colorIdx], colors[(c.colorIdx + 1) % 4], colorT);
            return (
              <radialGradient key={i} id={`lc-blob-${i}`} cx={`${cx}%`} cy={`${cy}%`} r={`${c.radius}%`} gradientUnits="userSpaceOnUse">
                <stop offset="0%"   stopColor={col} stopOpacity={cfg.intensity} />
                <stop offset="35%"  stopColor={col} stopOpacity={cfg.intensity * 0.7} />
                <stop offset="70%"  stopColor={col} stopOpacity={cfg.intensity * 0.2} />
                <stop offset="100%" stopColor={col} stopOpacity="0" />
              </radialGradient>
            );
          })}

          {/* Turbulence displacement — this is what makes it look like lava/oil */}
          <filter id="lc-warp" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
            <feTurbulence
              type="turbulence"
              baseFrequency={turbFreq}
              numOctaves={4}
              seed={turbSeed}
              result="turb"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="turb"
              scale={dispScale}
              xChannelSelector="R"
              yChannelSelector="G"
              result="displaced"
            />
            <feGaussianBlur in="displaced" stdDeviation="1.5" result="softened" />
            <feColorMatrix type="saturate" values="2.5" />
          </filter>

          {/* Thin film iridescence layer — shifts hue across canvas */}
          <linearGradient id="lc-film" x1="0%" y1="0%" x2="100%" y2="100%"
            gradientTransform={`rotate(${(frame * spd * 0.3) % 360}, 50, 50)`}
          >
            <stop offset="0%"   stopColor={colors[1]} stopOpacity={0.15 * cfg.intensity} />
            <stop offset="33%"  stopColor={colors[2] ?? colors[0]} stopOpacity={0.1 * cfg.intensity} />
            <stop offset="66%"  stopColor={colors[3] ?? colors[1]} stopOpacity={0.18 * cfg.intensity} />
            <stop offset="100%" stopColor={colors[0]} stopOpacity={0.12 * cfg.intensity} />
          </linearGradient>
        </defs>

        {/* Colour blobs with warp filter */}
        <g filter="url(#lc-warp)">
          {LAVA_CELLS.map((_, i) => (
            <rect key={i} x="0" y="0" width="100" height="100"
              fill={`url(#lc-blob-${i})`}
              style={{ mixBlendMode: "screen" }}
            />
          ))}
        </g>

        {/* Thin film sheen on top */}
        <rect x="0" y="0" width="100" height="100" fill="url(#lc-film)" style={{ mixBlendMode: "overlay" }} />
      </svg>

      {/* Vignette + dark centre punch */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.65) 100%)",
      }} />
    </AbsoluteFill>
  );
}

// ─── 2. STELLAR DRIFT ─────────────────────────────────────────────────────────
//
// Three depth layers of particles.
// Every particle's life cycle is driven by spring() for the pop-in,
// and interpolate() for the drift path.
//
// Layer 0 (deep): large, dim, slow — barely perceptible depth haze
// Layer 1 (mid):  medium, moderate speed
// Layer 2 (near): small, bright, fast — crisp sharp sparks

const NEAR_COUNT = 40;
const MID_COUNT = 30;
const DEEP_COUNT = 20;

// Sizes in % of canvas width (so they scale with resolution)
const STELLAR_PARTICLES = [
  // deep — big diffuse glow orbs
  ...Array.from({ length: DEEP_COUNT }, (_, i) => ({
    layer: 0,
    x: sr(i * 3) * 100,
    y: sr(i * 3 + 1) * 100,
    sizePct: 1.8 + sr(i * 3 + 2) * 2.2,   // 1.8%–4% of canvas width
    birthFrame: Math.floor(sr(i * 7) * 400),
    lifeFrames: 180 + Math.floor(sr(i * 7 + 1) * 180),
    driftX: (sr(i * 11) - 0.5) * 18,
    driftY: -8 - sr(i * 11 + 1) * 14,
    colorIdx: Math.floor(sr(i * 13) * 4),
  })),
  // mid — medium bright orbs with strong glow
  ...Array.from({ length: MID_COUNT }, (_, i) => ({
    layer: 1,
    x: sr((i + 100) * 3) * 100,
    y: sr((i + 100) * 3 + 1) * 100,
    sizePct: 0.8 + sr((i + 100) * 3 + 2) * 1.0,  // 0.8%–1.8%
    birthFrame: Math.floor(sr((i + 100) * 7) * 300),
    lifeFrames: 120 + Math.floor(sr((i + 100) * 7 + 1) * 120),
    driftX: (sr((i + 100) * 11) - 0.5) * 28,
    driftY: -12 - sr((i + 100) * 11 + 1) * 20,
    colorIdx: Math.floor(sr((i + 100) * 13) * 4),
  })),
  // near — sharp crisp sparks with huge halo
  ...Array.from({ length: NEAR_COUNT }, (_, i) => ({
    layer: 2,
    x: sr((i + 200) * 3) * 100,
    y: sr((i + 200) * 3 + 1) * 100,
    sizePct: 0.3 + sr((i + 200) * 3 + 2) * 0.5,  // 0.3%–0.8% core + massive halo
    birthFrame: Math.floor(sr((i + 200) * 7) * 200),
    lifeFrames: 60 + Math.floor(sr((i + 200) * 7 + 1) * 80),
    driftX: (sr((i + 200) * 11) - 0.5) * 40,
    driftY: -20 - sr((i + 200) * 11 + 1) * 30,
    colorIdx: Math.floor(sr((i + 200) * 13) * 4),
  })),
];

const LAYER_BLUR = ["4%", "1.5%", "0"];
const LAYER_PEAK_OPACITY = [0.5, 0.8, 1.0];

function StellarDrift({
  cfg,
  frame,
  fps,
}: {
  cfg: MotionBgConfig;
  frame: number;
  fps: number;
}) {
  const spd = cfg.speed;
  const totalFrames = 900; // wrap cycle
  const colors = [
    cfg.colors[0],
    cfg.colors[1],
    cfg.colors[2] ?? "#ffffff",
    cfg.colors[3] ?? "#aaccff",
  ];

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "#020206" }} />

      {STELLAR_PARTICLES.map((p, idx) => {
        const effectiveFrame = (frame * spd + p.birthFrame) % (totalFrames / spd);
        const relFrame = effectiveFrame % (p.lifeFrames + 30); // +30 gap between births
        if (relFrame > p.lifeFrames) return null;

        const progress = relFrame / p.lifeFrames;

        // Spring pop-in at birth
        const popIn = spring({
          frame: relFrame,
          fps,
          config: { damping: 8, stiffness: 200, mass: 0.3 },
          durationInFrames: 20,
        });

        // Fade: quick in, long hold, quick out
        const opacity =
          interpolate(progress, [0, 0.08, 0.75, 1], [0, 1, 1, 0]) *
          LAYER_PEAK_OPACITY[p.layer] *
          cfg.intensity *
          popIn;

        // Position drift
        const x = p.x + p.driftX * progress;
        const y = p.y + p.driftY * progress;

        // Scale breathes gently (spring oscillation via sin on frame)
        const breathe =
          1 +
          osc(relFrame, 40 + idx * 3, idx * 7) *
            (p.layer === 2 ? 0.25 : 0.1);

        const color = colors[p.colorIdx];
        const blurVal = LAYER_BLUR[p.layer];
        // Core dot size as % of canvas width
        const coreSize = `${p.sizePct * breathe}vw`;
        // Halo: much larger diffuse glow ring behind the core
        const haloSize = p.layer === 2
          ? `${p.sizePct * 10}vw`   // near: tiny core, massive halo
          : p.layer === 1
          ? `${p.sizePct * 6}vw`    // mid: medium halo
          : `${p.sizePct * 4}vw`;   // deep: large soft blob
        const haloOpacity = opacity * (p.layer === 2 ? 0.25 : 0.3);
        const glowStr = p.layer === 2
          ? `0 0 ${p.sizePct * 3}vw ${color}, 0 0 ${p.sizePct * 6}vw ${color}80`
          : p.layer === 1
          ? `0 0 ${p.sizePct * 4}vw ${color}cc`
          : "none";

        return (
          <div key={idx} style={{ position: "absolute", left: `${x}%`, top: `${y}%`, transform: "translate(-50%,-50%)" }}>
            {/* Halo */}
            <div
              style={{
                position: "absolute",
                width: haloSize,
                height: haloSize,
                borderRadius: "50%",
                background: `radial-gradient(circle, ${color}55 0%, ${color}00 70%)`,
                opacity: haloOpacity,
                transform: "translate(-50%,-50%)",
                filter: blurVal !== "0" ? `blur(${blurVal})` : undefined,
              }}
            />
            {/* Core */}
            <div
              style={{
                position: "absolute",
                width: coreSize,
                height: coreSize,
                borderRadius: "50%",
                background: color,
                opacity,
                boxShadow: glowStr,
                transform: "translate(-50%,-50%)",
              }}
            />
          </div>
        );
      })}
    </AbsoluteFill>
  );
}

// ─── 3. PLASMA AURORA ─────────────────────────────────────────────────────────
//
// Flowing organic ribbon bands built from per-point spring oscillators.
// Each ribbon point has its own spring that drives Y offset.
// Ribbons bleed light into each other via SVG feBlend.

const AURORA_BAND_COUNT = 6;
const POINTS_PER_BAND = 20;

const AURORA_BANDS = Array.from({ length: AURORA_BAND_COUNT }, (_, bi) => ({
  baseY: 10 + bi * (80 / AURORA_BAND_COUNT),
  height: 8 + sr(bi * 7) * 18,
  colorIdx: bi % 4,
  colorIdx2: (bi + 2) % 4,
  speedMult: 0.4 + sr(bi * 11) * 0.8,
  phaseBias: sr(bi * 13) * 300,
  points: Array.from({ length: POINTS_PER_BAND }, (_, pi) => ({
    period: 80 + sr(bi * 100 + pi * 3) * 160,
    amp: 3 + sr(bi * 100 + pi * 3 + 1) * 10,
    phase: sr(bi * 100 + pi * 3 + 2) * 300,
    period2: 50 + sr(bi * 100 + pi * 7) * 100,
    amp2: 1.5 + sr(bi * 100 + pi * 7 + 1) * 5,
  })),
}));

function PlasmaAurora({
  cfg,
  frame,
  fps,
}: {
  cfg: MotionBgConfig;
  frame: number;
  fps: number;
}) {
  const spd = cfg.speed;
  const colors = [
    cfg.colors[0],
    cfg.colors[1],
    cfg.colors[2] ?? cfg.colors[0],
    cfg.colors[3] ?? cfg.colors[1],
  ];

  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", inset: 0, background: "#020408" }} />

      <svg
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <defs>
          {AURORA_BANDS.map((band, bi) => (
            <linearGradient
              key={bi}
              id={`aurora-${bi}`}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor={colors[band.colorIdx]} stopOpacity="0" />
              <stop
                offset="15%"
                stopColor={colors[band.colorIdx]}
                stopOpacity={0.6 * cfg.intensity}
              />
              <stop
                offset="50%"
                stopColor={lerpColor(
                  colors[band.colorIdx],
                  colors[band.colorIdx2],
                  interpolate(
                    osc(frame * spd, 200 + bi * 30, band.phaseBias),
                    [-1, 1],
                    [0, 1]
                  )
                )}
                stopOpacity={0.8 * cfg.intensity}
              />
              <stop
                offset="85%"
                stopColor={colors[band.colorIdx2]}
                stopOpacity={0.5 * cfg.intensity}
              />
              <stop offset="100%" stopColor={colors[band.colorIdx2]} stopOpacity="0" />
            </linearGradient>
          ))}
          <filter id="aurora-blur">
            <feGaussianBlur stdDeviation="1.2" />
          </filter>
        </defs>

        {AURORA_BANDS.map((band, bi) => {
          // Build top edge points
          const topPoints = band.points.map((pt, pi) => {
            const xFrac = pi / (POINTS_PER_BAND - 1);
            const yOff =
              osc(frame * spd * band.speedMult, pt.period, pt.phase + pi * 12) * pt.amp +
              osc(frame * spd * band.speedMult, pt.period2, pt.phase * 1.7 + pi * 8) * pt.amp2;
            return { x: xFrac * 100, y: band.baseY + yOff };
          });

          // Bottom edge is top + height with its own spring offsets
          const botPoints = band.points.map((pt, pi) => {
            const xFrac = pi / (POINTS_PER_BAND - 1);
            const yOff =
              osc(frame * spd * band.speedMult, pt.period * 1.2, pt.phase + 50 + pi * 9) *
                pt.amp *
                0.7 +
              osc(frame * spd * band.speedMult, pt.period2 * 0.9, pt.phase * 1.3 + pi * 11) *
                pt.amp2;
            return { x: xFrac * 100, y: band.baseY + band.height + yOff };
          });

          // Build SVG path: top L-chain forward, bottom L-chain backward
          const topPath = topPoints
            .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
            .join(" ");
          const botPath = [...botPoints]
            .reverse()
            .map((p) => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
            .join(" ");

          // Brightness pulses with a slow spring-like beat
          const brightness =
            0.7 +
            interpolate(
              osc(frame * spd, 120 + bi * 17, band.phaseBias),
              [-1, 1],
              [0, 0.3]
            );

          return (
            <path
              key={bi}
              d={`${topPath} ${botPath} Z`}
              fill={`url(#aurora-${bi})`}
              filter="url(#aurora-blur)"
              opacity={brightness}
            />
          );
        })}
      </svg>
    </AbsoluteFill>
  );
}

// ─── 4. CHROMATIC INK DROP ────────────────────────────────────────────────────
//
// Completely different from Liquid Chromatic.
// Ink tendrils: sharp crack-like lines shoot radially outward from spawn
// points on a dark wet-paper background.
//
// Visual: black canvas, multiple ink eruptions.
// Each eruption: 8–14 primary tendrils radiating outward via spring().
// Each tendril: 2–3 branch forks at random distances.
// Colour: deep saturated ink colour at origin fading to near-black at tips.
// feTurbulence bends each tendril slightly for organic feel.

// Pre-generate tendril geometry (deterministic)
interface InkTendril {
  angle: number;        // radians
  length: number;       // max length in viewBox units
  branches: { tFork: number; branchAngle: number; branchLen: number }[];
  strokeW: number;
  colorIdx: number;
}

interface InkEruption {
  cx: number;
  cy: number;
  birthFrame: number;
  lifeFrames: number;
  tendrils: InkTendril[];
  colorIdx: number;
}

const INK_ERUPTIONS: InkEruption[] = Array.from({ length: 8 }, (_, ei) => {
  const tendrilCount = 8 + Math.floor(sr(ei * 3) * 7);
  const tendrils: InkTendril[] = Array.from({ length: tendrilCount }, (_, ti) => {
    const branchCount = 1 + Math.floor(sr(ei * 100 + ti * 7) * 2);
    return {
      angle: (ti / tendrilCount) * Math.PI * 2 + sr(ei * 50 + ti) * 0.4,
      length: 18 + sr(ei * 100 + ti * 3) * 22,
      branches: Array.from({ length: branchCount }, (_, bi) => ({
        tFork: 0.3 + sr(ei * 200 + ti * 13 + bi) * 0.5,
        branchAngle: (sr(ei * 300 + ti * 17 + bi) - 0.5) * 1.2,
        branchLen: 0.3 + sr(ei * 400 + ti * 19 + bi) * 0.5,
      })),
      strokeW: 0.3 + sr(ei * 100 + ti * 11) * 0.6,
      colorIdx: Math.floor(sr(ei * 100 + ti * 23) * 4),
    };
  });
  return {
    cx: 10 + sr(ei * 3) * 80,
    cy: 10 + sr(ei * 3 + 1) * 80,
    birthFrame: Math.floor(sr(ei * 7) * 400),
    lifeFrames: 120 + Math.floor(sr(ei * 11) * 180),
    tendrils,
    colorIdx: Math.floor(sr(ei * 13) * 4),
  };
});

function ChromaticInkDrop({ cfg, frame, fps }: { cfg: MotionBgConfig; frame: number; fps: number }) {
  const spd = cfg.speed;
  const wrapCycle = 700;
  const colors = [
    cfg.colors[0],
    cfg.colors[1],
    cfg.colors[2] ?? cfg.colors[0],
    cfg.colors[3] ?? cfg.colors[1],
  ];

  // Wet paper / dark base shifts slightly per frame
  const paperShift = osc(frame * spd, 400, 0) * 0.015;

  return (
    <AbsoluteFill>
      {/* Deep dark wet base — NOT the same dark as LC */}
      <div style={{
        position: "absolute", inset: 0,
        background: `radial-gradient(ellipse 120% 120% at ${50 + paperShift * 100}% 50%, #080410 0%, #020108 60%, #000000 100%)`,
      }} />

      <svg
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Slight organic bend on tendrils */}
          <filter id="ink-bend" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="42" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.8" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <filter id="ink-glow">
            <feGaussianBlur stdDeviation="0.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {INK_ERUPTIONS.map((erupt, ei) => {
          const effectiveFrame = (frame * spd + erupt.birthFrame) % wrapCycle;
          const relFrame = effectiveFrame % (erupt.lifeFrames + 80);
          if (relFrame > erupt.lifeFrames) return null;

          const progress = relFrame / erupt.lifeFrames;

          // How far tendrils have extended (spring-driven)
          const extendSpring = spring({
            frame: relFrame,
            fps,
            config: { damping: 18, stiffness: 120, mass: 0.8 },
            durationInFrames: erupt.lifeFrames * 0.45,
          });

          // Overall opacity envelope
          const opacity = interpolate(progress, [0, 0.05, 0.6, 1], [0, 1, 0.85, 0]) * cfg.intensity;

          // Spread bloom at origin
          const originRadius = extendSpring * 3 * cfg.intensity;
          const originColor = colors[erupt.colorIdx];

          return (
            <g key={ei} filter="url(#ink-bend)">
              {/* Origin bloom */}
              <circle
                cx={erupt.cx} cy={erupt.cy}
                r={originRadius}
                fill={originColor}
                opacity={opacity * 0.9}
                filter="url(#ink-glow)"
              />

              {erupt.tendrils.map((t, ti) => {
                const tipX = erupt.cx + Math.cos(t.angle) * t.length * extendSpring;
                const tipY = erupt.cy + Math.sin(t.angle) * t.length * extendSpring;
                const color = colors[t.colorIdx];
                const gradId = `ink-tend-${ei}-${ti}`;

                return (
                  <g key={ti}>
                    <defs>
                      <linearGradient id={gradId}
                        x1={`${erupt.cx}%`} y1={`${erupt.cy}%`}
                        x2={`${tipX}%`} y2={`${tipY}%`}
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop offset="0%"   stopColor={color} stopOpacity={opacity} />
                        <stop offset="50%"  stopColor={color} stopOpacity={opacity * 0.7} />
                        <stop offset="100%" stopColor={color} stopOpacity="0" />
                      </linearGradient>
                    </defs>

                    {/* Main tendril */}
                    <line
                      x1={erupt.cx} y1={erupt.cy}
                      x2={tipX} y2={tipY}
                      stroke={`url(#${gradId})`}
                      strokeWidth={t.strokeW}
                      strokeLinecap="round"
                      filter="url(#ink-glow)"
                    />

                    {/* Branch forks */}
                    {t.branches.map((b, bi) => {
                      const forkX = erupt.cx + Math.cos(t.angle) * t.length * extendSpring * b.tFork;
                      const forkY = erupt.cy + Math.sin(t.angle) * t.length * extendSpring * b.tFork;
                      const branchAngle = t.angle + b.branchAngle;
                      const branchLen = t.length * b.branchLen * extendSpring;
                      const bTipX = forkX + Math.cos(branchAngle) * branchLen;
                      const bTipY = forkY + Math.sin(branchAngle) * branchLen;
                      return (
                        <line key={bi}
                          x1={forkX} y1={forkY}
                          x2={bTipX} y2={bTipY}
                          stroke={color}
                          strokeWidth={t.strokeW * 0.55}
                          strokeOpacity={opacity * 0.7}
                          strokeLinecap="round"
                        />
                      );
                    })}
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
}

// ─── 5. GEOMETRIC PULSE ───────────────────────────────────────────────────────
//
// Shapes spring into existence, orbit a centre point, morph between
// circle/ring/hexagon, and leave light trails.
// Every property is driven by spring() or interpolate() on frame number.

const GEO_ITEMS = Array.from({ length: 22 }, (_, i) => ({
  orbitRadius: 8 + sr(i * 3) * 38,      // % of viewBox
  orbitSpeed: (sr(i * 3 + 1) - 0.5) * 0.8, // degrees per frame (signed = CW/CCW)
  orbitPhase: sr(i * 3 + 2) * 360,      // initial angle deg
  orbitCX: 30 + sr(i * 7) * 40,         // orbit centre X %
  orbitCY: 20 + sr(i * 7 + 1) * 60,     // orbit centre Y %
  shapeSize: 3 + sr(i * 11) * 10,       // radius in viewBox units
  pulsePeriod: 40 + sr(i * 13) * 120,   // frames per size pulse
  pulsePhase: sr(i * 17) * 200,
  colorIdx: Math.floor(sr(i * 19) * 4),
  birthFrame: Math.floor(sr(i * 23) * 120),
  morphPeriod: 180 + sr(i * 29) * 300,  // frames per shape morph cycle
  trailLength: 3 + Math.floor(sr(i * 31) * 5), // ghost copies behind
  strokeOnly: sr(i * 37) > 0.5,
}));

function hexPoints(cx: number, cy: number, r: number, rotDeg: number): string {
  return Array.from({ length: 7 }, (_, k) => {
    const a = (rotDeg + k * 60) * (Math.PI / 180);
    return `${(cx + Math.cos(a) * r).toFixed(2)},${(cy + Math.sin(a) * r).toFixed(2)}`;
  }).join(" ");
}

function GeometricPulse({
  cfg,
  frame,
  fps,
}: {
  cfg: MotionBgConfig;
  frame: number;
  fps: number;
}) {
  const spd = cfg.speed;
  const colors = [
    cfg.colors[0],
    cfg.colors[1],
    cfg.colors[2] ?? cfg.colors[0],
    cfg.colors[3] ?? cfg.colors[1],
  ];

  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", inset: 0, background: "#030308" }} />

      <svg
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <filter id="geo-glow">
            <feGaussianBlur stdDeviation="0.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {GEO_ITEMS.map((item, i) => {
          const effectiveFrame = Math.max(0, frame - item.birthFrame);

          // Spring entry
          const entry = spring({
            frame: effectiveFrame,
            fps,
            config: { damping: 10, stiffness: 120, mass: 0.6 },
            durationInFrames: 30,
          });

          // Orbit angle: linear accumulation from frame
          const angle =
            ((item.orbitPhase + effectiveFrame * spd * item.orbitSpeed * 1.5) % 360) *
            (Math.PI / 180);
          const cx = item.orbitCX + Math.cos(angle) * item.orbitRadius;
          const cy = item.orbitCY + Math.sin(angle) * item.orbitRadius;

          // Size pulse using spring-like oscillation
          const sizePulse =
            1 +
            interpolate(
              osc(effectiveFrame * spd, item.pulsePeriod, item.pulsePhase),
              [-1, 1],
              [-0.3, 0.4]
            );
          const r = item.shapeSize * sizePulse * entry;

          // Shape morphs: 0=circle, 1=ring, 2=hexagon based on slow cycle
          const morphT = ((effectiveFrame * spd) % item.morphPeriod) / item.morphPeriod;
          const shapePhase = Math.floor(morphT * 3); // 0,1,2

          const color = colors[item.colorIdx];
          const opacity =
            (0.3 + sr(i * 41) * 0.5) * entry * cfg.intensity;
          const strokeW =
            0.3 +
            interpolate(
              osc(effectiveFrame * spd, item.pulsePeriod * 0.7, item.pulsePhase + 30),
              [-1, 1],
              [0, 0.5]
            );
          const rotDeg = effectiveFrame * spd * (sr(i * 43) - 0.5) * 90;

          // Trail ghosts (past positions)
          const trailElements: ReactElement[] = [];
          for (let t = 1; t <= item.trailLength; t++) {
            const trailFrame = Math.max(0, effectiveFrame - t * 4);
            const tAngle =
              ((item.orbitPhase + trailFrame * spd * item.orbitSpeed * 1.5) % 360) *
              (Math.PI / 180);
            const tx = item.orbitCX + Math.cos(tAngle) * item.orbitRadius;
            const ty = item.orbitCY + Math.sin(tAngle) * item.orbitRadius;
            const tOpacity = opacity * (1 - t / (item.trailLength + 1)) * 0.4;
            trailElements.push(
              <circle
                key={t}
                cx={tx}
                cy={ty}
                r={r * (1 - t * 0.12)}
                fill="none"
                stroke={color}
                strokeWidth={strokeW * 0.5}
                opacity={tOpacity}
              />
            );
          }

          const shapeEl =
            shapePhase === 0 ? (
              // Circle — filled or stroke
              item.strokeOnly ? (
                <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={strokeW} opacity={opacity} filter="url(#geo-glow)" />
              ) : (
                <circle cx={cx} cy={cy} r={r} fill={color} fillOpacity={opacity * 0.4} stroke={color} strokeWidth={strokeW * 0.5} strokeOpacity={opacity} filter="url(#geo-glow)" />
              )
            ) : shapePhase === 1 ? (
              // Ring
              <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={strokeW * 1.5} opacity={opacity} filter="url(#geo-glow)" />
            ) : (
              // Hexagon
              <polygon
                points={hexPoints(cx, cy, r, rotDeg)}
                fill="none"
                stroke={color}
                strokeWidth={strokeW}
                opacity={opacity}
                filter="url(#geo-glow)"
              />
            );

          return (
            <g key={i}>
              {trailElements}
              {shapeEl}
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
}

// ─── 6. NEON GRID ─────────────────────────────────────────────────────────────
//
// Synthwave-style perspective vanishing-point grid floor + horizon glow.
// Grid lines converge to a vanishing point; each line pulses independently
// with an offset spring wave travelling from horizon to camera.

const GRID_H_LINES = 16;  // horizontal lines (depth)
const GRID_V_LINES = 20;  // vertical lines (width)
const VP_X = 50;          // vanishing point X (% of viewBox)
const VP_Y = 42;          // vanishing point Y (%)
const GRID_BOTTOM = 105;  // bottom of grid Y (below canvas)
const GRID_LEFT = -30;    // left edge of grid at bottom
const GRID_RIGHT = 130;   // right edge at bottom

function NeonGrid({
  cfg,
  frame,
  fps,
}: {
  cfg: MotionBgConfig;
  frame: number;
  fps: number;
}) {
  const spd = cfg.speed;
  const c0 = cfg.colors[0];
  const c1 = cfg.colors[1];
  const c2 = cfg.colors[2] ?? c0;

  // The grid scrolls toward the camera: lines shift downward each frame.
  // We compute how far each line is from VP and add a scroll offset.
  const scrollOffset = ((frame * spd * 0.8) % (GRID_BOTTOM - VP_Y)) / (GRID_BOTTOM - VP_Y);

  // Horizon glow pulses
  const horizGlow =
    0.4 +
    interpolate(osc(frame * spd, 60, 0), [-1, 1], [0, 0.4]) * cfg.intensity;

  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", inset: 0, background: "#040208" }} />

      <svg
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <defs>
          <filter id="grid-glow">
            <feGaussianBlur stdDeviation="0.3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="horizGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={c2} stopOpacity="0" />
            <stop offset="30%" stopColor={c1} stopOpacity={horizGlow * 0.8} />
            <stop offset="50%" stopColor={c0} stopOpacity={horizGlow} />
            <stop offset="70%" stopColor={c1} stopOpacity={horizGlow * 0.8} />
            <stop offset="100%" stopColor={c2} stopOpacity="0" />
          </linearGradient>
          <linearGradient id="vLineGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={c1} stopOpacity="0" />
            <stop offset="40%" stopColor={c1} stopOpacity="0.1" />
            <stop offset="100%" stopColor={c1} stopOpacity="0.6" />
          </linearGradient>
        </defs>

        {/* Sky: upper half dark with subtle colour bleed from horizon */}
        <defs>
          <radialGradient id="skyGlow" cx="50%" cy={`${VP_Y}%`} r="60%">
            <stop offset="0%" stopColor={c0} stopOpacity={0.25 * cfg.intensity} />
            <stop offset="100%" stopColor={c0} stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width="100" height={VP_Y} fill="url(#skyGlow)" />

        {/* Horizon glow bar */}
        <rect
          x="0"
          y={VP_Y - 1.5}
          width="100"
          height="3"
          fill="url(#horizGrad)"
        />

        {/* Horizontal grid lines — scrolling toward camera */}
        {Array.from({ length: GRID_H_LINES }, (_, i) => {
          // Lines spaced in perspective: closer lines are further apart
          const tBase = (i + 1) / GRID_H_LINES;
          // Add scroll offset that loops
          const tScrolled = (tBase + scrollOffset) % 1;
          // Perspective: y moves faster near camera
          const perspT = tScrolled * tScrolled; // quadratic perspective
          const lineY = VP_Y + perspT * (GRID_BOTTOM - VP_Y);

          if (lineY < VP_Y || lineY > GRID_BOTTOM) return null;

          // Line X extents narrow toward vanishing point
          const xLeft = lerp(VP_X, GRID_LEFT, perspT);
          const xRight = lerp(VP_X, GRID_RIGHT, perspT);

          // Pulse: wave travelling from horizon to camera, ~1.5s period
          const pulsePeriod = Math.round(fps * 1.5 / spd);
          const waveOffset = Math.round(tScrolled * pulsePeriod);
          const pulseVal = spring({
            frame: Math.max(0, (frame * Math.ceil(spd)) % pulsePeriod - waveOffset),
            fps,
            config: { damping: 20, stiffness: 300, mass: 0.5 },
            durationInFrames: 12,
          });
          const lineOpacity =
            interpolate(perspT, [0, 0.05, 0.9, 1], [0, 0.15, 0.55, 0.7]) *
            (0.7 + pulseVal * 0.5) *
            cfg.intensity;

          const pulseColor = lerpColor(c1, c0, pulseVal * 0.6);

          return (
            <line
              key={i}
              x1={xLeft}
              y1={lineY}
              x2={xRight}
              y2={lineY}
              stroke={pulseColor}
              strokeWidth={0.2 + perspT * 0.5}
              opacity={lineOpacity}
              filter="url(#grid-glow)"
            />
          );
        })}

        {/* Vertical grid lines — converging to vanishing point */}
        {Array.from({ length: GRID_V_LINES + 1 }, (_, i) => {
          const t = i / GRID_V_LINES;
          const bottomX = lerp(GRID_LEFT, GRID_RIGHT, t);
          // Pulse: each vertical line pulses independently
          const vPulsePeriod = Math.round(fps * 2 / spd);
          const vPhase = Math.round(t * vPulsePeriod * 0.8);
          const vPulse = spring({
            frame: Math.max(0, (frame * Math.ceil(spd) + vPhase) % vPulsePeriod),
            fps,
            config: { damping: 18, stiffness: 200, mass: 0.8 },
            durationInFrames: 15,
          });
          const vOpacity = (0.15 + vPulse * 0.3) * cfg.intensity;
          const vColor = lerpColor(c1, c2, vPulse * 0.7);

          return (
            <line
              key={i}
              x1={VP_X}
              y1={VP_Y}
              x2={bottomX}
              y2={GRID_BOTTOM}
              stroke={vColor}
              strokeWidth={0.15 + vPulse * 0.25}
              opacity={vOpacity}
              filter="url(#grid-glow)"
            />
          );
        })}
      </svg>
    </AbsoluteFill>
  );
}

// ─── 7. CYBER RAIN ────────────────────────────────────────────────────────────
//
// Matrix-inspired digital rain: columns of falling glyphs with varying speeds,
// heads burn bright, tails fade into the dark.
// Each column: spring pop-in, position driven purely from frame.

const GLYPH_CHARS = "アイウエオカキクケコサシスセソタチツテトナニヌネノ01101010BEATSKBEATSFLOW∆∑∞≡▲▼◆♩♪♫".split("");

const RAIN_COLS = 40; // number of columns
const COLS_DATA = Array.from({ length: RAIN_COLS }, (_, ci) => ({
  x: (ci / RAIN_COLS) * 100 + (sr(ci * 7) * 2.2),
  speed: 0.4 + sr(ci * 3) * 1.2,        // chars-per-frame multiplier
  tailLength: 6 + Math.floor(sr(ci * 11) * 18),
  birthFrame: Math.floor(sr(ci * 13) * 300),
  fontSize: 1.0 + sr(ci * 17) * 1.2,    // vw
  colorIdx: Math.floor(sr(ci * 19) * 2), // picks from colors[0..1]
  glyphOffset: Math.floor(sr(ci * 23) * GLYPH_CHARS.length),
  changeRate: 3 + Math.floor(sr(ci * 29) * 8), // frames between glyph scrambles
}));

function CyberRain({ cfg, frame, fps }: { cfg: MotionBgConfig; frame: number; fps: number }) {
  const spd = cfg.speed;
  const colors = [
    cfg.colors[2] ?? "#00ff88",
    cfg.colors[3] ?? "#00ccff",
    cfg.colors[1],
  ];
  const headColor = "#ffffff";
  const totalRows = 20; // logical rows visible

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "#000a04" }} />

      {/* Global glow overlay */}
      <div style={{
        position: "absolute", inset: 0,
        background: `radial-gradient(ellipse 80% 60% at 50% 30%, ${cfg.colors[2] ?? "#00ff44"}18 0%, transparent 70%)`,
      }} />

      {COLS_DATA.map((col, ci) => {
        const effectiveFrame = (frame * spd + col.birthFrame);
        // Head position in row units (wraps)
        const headRow = (effectiveFrame * col.speed) % (totalRows + col.tailLength + 5);

        return (
          <div key={ci} style={{ position: "absolute", left: `${col.x}%`, top: 0 }}>
            {Array.from({ length: col.tailLength }, (_, ti) => {
              const rowPos = headRow - ti;
              if (rowPos < 0 || rowPos > totalRows + 2) return null;

              const y = (rowPos / totalRows) * 100;
              const isHead = ti === 0;

              // Tail fade: head = full bright, tail end = nearly invisible
              const tailFade = isHead ? 1 : interpolate(ti, [0, col.tailLength], [0.95, 0.03]);
              const opacity = tailFade * cfg.intensity * (isHead ? 1 : 0.85);

              // Glyph scrambles every changeRate frames
              const glyphFrame = Math.floor(effectiveFrame / col.changeRate);
              const glyphIdx = (col.glyphOffset + ti * 7 + glyphFrame * (ti + 1)) % GLYPH_CHARS.length;
              const glyph = GLYPH_CHARS[Math.abs(glyphIdx)];

              const color = isHead ? headColor : colors[col.colorIdx % colors.length];
              const glowStr = isHead
                ? `0 0 ${col.fontSize * 1.5}vw #fff, 0 0 ${col.fontSize * 3}vw ${colors[col.colorIdx % colors.length]}`
                : ti < 3
                ? `0 0 ${col.fontSize}vw ${color}88`
                : "none";

              return (
                <div
                  key={ti}
                  style={{
                    position: "absolute",
                    top: `${y}vh`,
                    fontSize: `${col.fontSize * (isHead ? 1.15 : 1)}vw`,
                    fontFamily: "monospace",
                    fontWeight: isHead ? 900 : 400,
                    color,
                    opacity,
                    textShadow: glowStr,
                    lineHeight: 1,
                    transform: "translateX(-50%)",
                    letterSpacing: 0,
                  }}
                >
                  {glyph}
                </div>
              );
            })}
          </div>
        );
      })}
    </AbsoluteFill>
  );
}

// ─── 8. FREQUENCY WAVE ────────────────────────────────────────────────────────
//
// Dual-ring radial spectrum: bars shoot outward from TWO concentric rings,
// mirrored so inner ring = bass, outer ring = treble.
// Each bar is spring-slammed: it jumps to peak height in ~3 frames, decays
// over ~12 frames. Combined with a rotatable ring for a DJ-deck feel.
// Additionally, a horizontal linear EQ fills the lower third.

const FREQ_BANDS = 80;
const RING_BANDS = 120; // for the radial ring

const BAND_DATA2 = Array.from({ length: FREQ_BANDS }, (_, bi) => {
  const freqNorm = bi / FREQ_BANDS;
  // Sub-bass (0-0.1): very slow, very tall hits
  // Bass (0.1-0.3): medium period, tall
  // Mids (0.3-0.7): fast, medium height
  // Highs (0.7-1.0): very fast, short spiky
  const hitPeriod = freqNorm < 0.15
    ? 25 + sr(bi * 7) * 15        // sub-bass: hits every ~25-40 frames
    : freqNorm < 0.4
    ? 18 + sr(bi * 7) * 14        // bass: ~18-32
    : freqNorm < 0.7
    ? 12 + sr(bi * 7) * 10        // mids
    : 6 + sr(bi * 7) * 8;         // highs: super fast flutter
  const peakAmp = freqNorm < 0.15
    ? 0.75 + sr(bi * 11) * 0.25   // sub-bass: slams to 75-100% height
    : freqNorm < 0.4
    ? 0.55 + sr(bi * 11) * 0.3
    : freqNorm < 0.7
    ? 0.3 + sr(bi * 11) * 0.35
    : 0.15 + sr(bi * 11) * 0.25;  // highs: shorter spikes
  return {
    hitPeriod: Math.round(hitPeriod),
    phaseOffset: Math.floor(sr(bi * 13) * hitPeriod),
    peakAmp,
    colorT: freqNorm,
  };
});

const RING_DATA = Array.from({ length: RING_BANDS }, (_, ri) => {
  const freqNorm = ri / RING_BANDS;
  return {
    hitPeriod: Math.round(8 + freqNorm * 30 + sr(ri * 7) * 20),
    phaseOffset: Math.floor(sr(ri * 13) * 40),
    peakAmp: 0.2 + sr(ri * 11) * 0.6,
    angle: (ri / RING_BANDS) * Math.PI * 2,
  };
});

function FrequencyWave({ cfg, frame, fps }: { cfg: MotionBgConfig; frame: number; fps: number }) {
  const spd = cfg.speed;
  const c0 = cfg.colors[0];
  const c1 = cfg.colors[1];
  const c2 = cfg.colors[2] ?? c1;
  const c3 = cfg.colors[3] ?? c0;

  // Master beat: kicks every ~1s, affects whole visual
  const masterPeriod = Math.round(fps * 1.0 / spd);
  const masterBeat = spring({
    frame: (frame * Math.ceil(spd)) % masterPeriod,
    fps,
    config: { damping: 8, stiffness: 300, mass: 0.6 },
    durationInFrames: Math.round(fps * 0.25),
  });

  // Ring slowly rotates
  const ringRotation = (frame * spd * 0.3) % 360;

  // Centre glow pulses with master beat
  const centreGlow = 0.15 + masterBeat * 0.35 * cfg.intensity;

  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", inset: 0, background: "#020108" }} />

      {/* Centre energy core */}
      <div style={{
        position: "absolute",
        top: "50%", left: "50%",
        width: `${(20 + masterBeat * 10) * cfg.intensity}vw`,
        height: `${(20 + masterBeat * 10) * cfg.intensity}vw`,
        transform: "translate(-50%,-50%)",
        borderRadius: "50%",
        background: `radial-gradient(circle, ${c1}${Math.round(centreGlow * 255).toString(16).padStart(2,"0")} 0%, ${c0}00 70%)`,
        pointerEvents: "none",
      }} />

      <svg
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <filter id="fq-glow">
            <feGaussianBlur stdDeviation="0.3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="fq-hot">
            <feGaussianBlur stdDeviation="0.8" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          {/* Radial gradient for ring bars */}
          <radialGradient id="fq-ring-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor={c1} stopOpacity="0.05" />
            <stop offset="60%"  stopColor={c0} stopOpacity="0" />
            <stop offset="100%" stopColor={c0} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* ── Radial ring bars ─────────────────────────────────── */}
        <g transform={`rotate(${ringRotation}, 50, 50)`}>
          {RING_DATA.map((band, ri) => {
            const f = (frame * Math.ceil(spd) + band.phaseOffset) % band.hitPeriod;
            const barHeight = spring({
              frame: f,
              fps,
              config: { damping: 5, stiffness: 500, mass: 0.2 },
              durationInFrames: Math.round(band.hitPeriod * 0.5),
            }) * band.peakAmp * cfg.intensity;

            const innerR = 18;
            const outerR = innerR + barHeight * 22;
            const x1 = 50 + Math.cos(band.angle) * innerR;
            const y1 = 50 + Math.sin(band.angle) * innerR;
            const x2 = 50 + Math.cos(band.angle) * outerR;
            const y2 = 50 + Math.sin(band.angle) * outerR;

            const colorT = ri / RING_BANDS;
            const col = lerpColor(c1, c2, colorT);
            const isHot = barHeight > 0.55;

            return (
              <line key={ri}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={isHot ? "#ffffff" : col}
                strokeWidth={isHot ? 0.35 : 0.2}
                opacity={0.5 + barHeight * 0.5}
                filter={isHot ? "url(#fq-hot)" : "url(#fq-glow)"}
              />
            );
          })}
        </g>

        {/* ── Linear EQ bottom strip ───────────────────────────── */}
        {BAND_DATA2.map((band, bi) => {
          const f = (frame * Math.ceil(spd) + band.phaseOffset) % band.hitPeriod;
          // Sharp spring slam: peaks fast, decays fast
          const barH = spring({
            frame: f,
            fps,
            config: { damping: 5, stiffness: 600, mass: 0.15 },
            durationInFrames: Math.round(band.hitPeriod * 0.45),
          }) * band.peakAmp * cfg.intensity;

          const maxBarH = 22; // max 22 units tall (out of 100 viewBox)
          const h = Math.max(0.3, barH * maxBarH);
          const barW = 100 / FREQ_BANDS;
          const barX = bi * barW + barW * 0.12;
          const barActualW = barW * 0.76;
          const baseY = 95; // bottom of canvas

          const col = lerpColor(lerpColor(c0, c1, band.colorT), lerpColor(c2, c3, band.colorT), masterBeat * 0.4);
          const isHot = barH > 0.7;
          const opac = (0.55 + barH * 0.45) * cfg.intensity;

          const gradId = `fq-bar-${bi}`;

          return (
            <g key={bi}>
              <defs>
                <linearGradient id={gradId} x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%"   stopColor={col} stopOpacity={opac} />
                  <stop offset="60%"  stopColor={isHot ? "#ffffff" : col} stopOpacity={opac * 0.9} />
                  <stop offset="100%" stopColor={isHot ? "#ffffff" : c3 ?? col} stopOpacity={opac * 0.4} />
                </linearGradient>
              </defs>
              <rect
                x={barX} y={baseY - h}
                width={barActualW} height={h}
                fill={`url(#${gradId})`}
                filter={isHot ? "url(#fq-hot)" : "url(#fq-glow)"}
              />
              {/* Mirror downward below floor — subtle reflection */}
              <rect
                x={barX} y={baseY}
                width={barActualW} height={h * 0.4}
                fill={col}
                opacity={opac * 0.2}
              />
            </g>
          );
        })}

        {/* Ring circle outlines */}
        <circle cx="50" cy="50" r="18" fill="none" stroke={c1} strokeWidth="0.15" opacity={0.2 + masterBeat * 0.3} />
        <circle cx="50" cy="50" r="40" fill="none" stroke={c0} strokeWidth="0.1" opacity={0.1} />
      </svg>
    </AbsoluteFill>
  );
}

// ─── 9. LYRICS FLOAT ─────────────────────────────────────────────────────────
//
// Words have 5 distinct movement behaviours, each using spring() for entry,
// with different drift paths and exit animations.
//
// Behaviour modes:
//   0  DRIFT_UP      — floats gently upward, slow fade
//   1  DRIFT_DOWN    — sinks downward from top
//   2  STRAFE        — slides horizontally L→R or R→L
//   3  WARP_ZOOM     — starts tiny at centre, zooms huge, fades
//   4  BURST         — springs outward from a random point, fast decay
//
// Depth layers: some words are large+dim (background feel),
// some are medium, some small+sharp (foreground).

type BehaviourMode = 0 | 1 | 2 | 3 | 4;

interface FloatWord {
  word: string;
  mode: BehaviourMode;
  x: number;         // spawn X %
  y: number;         // spawn Y %
  startFrame: number;
  lifeFrames: number;
  peakOpacity: number;
  fontSize: number;  // vh
  colorIdx: number;
  phase: number;
  // mode-specific
  driftAngle: number;    // radians — for DRIFT_UP, DRIFT_DOWN, STRAFE
  driftSpeed: number;    // % per lifeFrame
  burstDist: number;     // % — for BURST
  glowRadius: number;    // px blur for glow
  wobbleAmp: number;     // subtle secondary wobble
  wobblePeriod: number;
}

function buildFloatWords(
  sourceWords: string[],
  totalFrames: number,
  fps: number,
  speed: number,
  intensity: number,
): FloatWord[] {
  if (sourceWords.length === 0) return [];

  // Fewer simultaneous words to reduce center clutter
  const targetCount = Math.max(30, Math.ceil((totalFrames / fps) * 1.5));
  const repeated: string[] = [];
  while (repeated.length < targetCount) repeated.push(...sourceWords);
  const words = repeated.slice(0, targetCount);

  // Spawn helper that avoids the center dead-zone (35–65% × 35–65%)
  function spawnX(seed: number): number {
    const raw = 5 + sr(seed) * 90;
    // If in center band, push to either left or right third
    if (raw > 35 && raw < 65) return sr(seed + 0.5) < 0.5 ? 5 + sr(seed) * 28 : 67 + sr(seed) * 28;
    return raw;
  }
  function spawnY(seed: number): number {
    const raw = 5 + sr(seed) * 90;
    if (raw > 35 && raw < 65) return sr(seed + 0.5) < 0.5 ? 5 + sr(seed) * 28 : 67 + sr(seed) * 28;
    return raw;
  }

  return words.map((word, i) => {
    const mode = Math.floor(sr(i * 3) * 5) as BehaviourMode;
    const layer = Math.floor(sr(i * 5) * 3); // 0=deep, 1=mid, 2=near

    // Reduced deep-layer font sizes so they read as texture, not competing text
    const fontSize = layer === 0 ? 1 + sr(i * 7) * 1.5 : layer === 1 ? 0.8 + sr(i * 7) * 1.2 : 0.5 + sr(i * 7) * 0.8;
    const peakOpacity = layer === 0
      ? 0.12 + sr(i * 11) * 0.10   // deep: subtle but readable
      : layer === 1
      ? 0.28 + sr(i * 11) * 0.18   // mid: clearly visible
      : 0.55 + sr(i * 11) * 0.30;  // near: bold

    // speed slider scales lifeFrames inversely and driftSpeed directly
    const baseLife = mode === 3
      ? Math.round(fps * (0.8 + sr(i * 13) * 0.8)) // WARP: short
      : mode === 4
      ? Math.round(fps * (0.5 + sr(i * 13) * 0.6)) // BURST: very short
      : Math.round(fps * (2 + sr(i * 13) * 5));    // others: long
    const lifeFrames = Math.max(10, Math.round(baseLife / Math.max(0.1, speed)));

    const baseDrift = mode === 2 ? 40 + sr(i * 37) * 40 : 15 + sr(i * 37) * 25;

    // WARP_ZOOM: scatter around center instead of hardcoding 50,50
    const warpX = 38 + sr(i * 71) * 24; // 38–62%
    const warpY = 38 + sr(i * 73) * 24; // 38–62%

    return {
      word,
      mode,
      x: mode === 3 ? warpX : spawnX(i * 17),
      y: mode === 3 ? warpY : spawnY(i * 17 + 1),
      startFrame: Math.floor(sr(i * 19) * totalFrames),
      lifeFrames,
      peakOpacity: peakOpacity * intensity,
      fontSize,
      colorIdx: Math.floor(sr(i * 23) * 4),
      phase: sr(i * 29) * Math.PI * 2,
      driftAngle: mode === 0
        ? -Math.PI / 2 + (sr(i * 31) - 0.5) * 0.5  // mostly up
        : mode === 1
        ? Math.PI / 2 + (sr(i * 31) - 0.5) * 0.5   // mostly down
        : (sr(i * 31) - 0.5) < 0                    // STRAFE: L or R
        ? Math.PI + (sr(i * 31 + 1) - 0.5) * 0.4
        : (sr(i * 31 + 1) - 0.5) * 0.4,
      driftSpeed: baseDrift * speed,
      burstDist: 20 + sr(i * 41) * 40,
      glowRadius: layer === 2 ? 2 + sr(i * 43) * 4 : 0,
      wobbleAmp: (sr(i * 47) - 0.5) * 3,
      wobblePeriod: 30 + sr(i * 53) * 80,
    };
  });
}

function LyricsFloat({
  cfg,
  frame,
  fps,
  totalFrames,
  allOverlays,
}: {
  cfg: MotionBgConfig;
  frame: number;
  fps: number;
  totalFrames: number;
  allOverlays: OverlayConfig[];
}) {
  // ── Collect words ──────────────────────────────────────────────────────────
  const words: string[] = [];

  const sourceOverlays =
    !cfg.lyricsSourceId || cfg.lyricsSourceId === "all"
      ? allOverlays.filter((o) => o.type === "lyrics" || o.type === "lyrics-chords")
      : allOverlays.filter((o) => o.id === cfg.lyricsSourceId);

  for (const ov of sourceOverlays) {
    for (const line of (ov.lyrics ?? []) as LyricLine[]) {
      words.push(
        ...line.text
          .split(/\s+/)
          .map((w) => w.replace(/[^\w']/g, ""))
          .filter(Boolean)
      );
    }
  }
  if (cfg.customLyricsText) {
    words.push(
      ...cfg.customLyricsText.split(/\s+/).map((w) => w.replace(/[^\w']/g, "")).filter(Boolean)
    );
  }
  if (words.length === 0) {
    words.push("music", "beats", "vibe", "flow", "sound", "pulse", "wave", "drop", "bass", "rhythm", "groove", "fire", "soul");
  }

  const floatWords = buildFloatWords(words, totalFrames, fps, cfg.speed, cfg.intensity);
  const colors = [
    cfg.colors[0],
    cfg.colors[1],
    cfg.colors[2] ?? "#ffffff",
    cfg.colors[3] ?? "#aaaaaa",
  ];

  return (
    <AbsoluteFill style={{ overflow: "hidden", pointerEvents: "none" }}>
      <div style={{ position: "absolute", inset: 0, background: "#030305" }} />

      {floatWords.map((fw, i) => {
        // Wrap lifecycle
        const cycle = fw.lifeFrames + Math.round(fps * 0.5); // gap
        const relFrame = ((frame - fw.startFrame) % totalFrames + totalFrames) % totalFrames % cycle;
        if (relFrame >= fw.lifeFrames) return null;

        const progress = relFrame / fw.lifeFrames;

        // ── Entry spring ──────────────────────────────────────────────────────
        const entrySpring = spring({
          frame: relFrame,
          fps,
          config: { damping: 8, stiffness: 180, mass: 0.4 },
          durationInFrames: Math.min(25, fw.lifeFrames * 0.3),
        });

        // ── Fade ──────────────────────────────────────────────────────────────
        const fadeOut =
          fw.mode === 3 || fw.mode === 4
            ? interpolate(progress, [0.4, 1], [1, 0], { extrapolateLeft: "clamp" })
            : interpolate(progress, [0.7, 1], [1, 0], { extrapolateLeft: "clamp" });
        const opacity = entrySpring * fadeOut * fw.peakOpacity;
        if (opacity < 0.004) return null;

        // ── Position & transform per mode ────────────────────────────────────
        let x = fw.x;
        let y = fw.y;
        let scale = 1;
        let rotation = 0;
        let blurPx = 0;

        const wobble = osc(relFrame, fw.wobblePeriod, fw.phase) * fw.wobbleAmp;

        if (fw.mode === 0 || fw.mode === 1) {
          // DRIFT_UP / DRIFT_DOWN
          x = fw.x + Math.cos(fw.driftAngle) * fw.driftSpeed * progress + wobble;
          y = fw.y + Math.sin(fw.driftAngle) * fw.driftSpeed * progress;
          scale = 0.85 + entrySpring * 0.15;
          rotation = wobble * 0.4;

        } else if (fw.mode === 2) {
          // STRAFE — slides across, slight Y wobble
          x = fw.x + Math.cos(fw.driftAngle) * fw.driftSpeed * progress;
          y = fw.y + osc(relFrame, fw.wobblePeriod * 2, fw.phase) * 3;
          scale = 0.9 + entrySpring * 0.1;
          // motion blur effect: stretch in direction of travel
          blurPx = interpolate(progress, [0, 0.15, 0.85, 1], [6, 0, 0, 4]);

        } else if (fw.mode === 3) {
          // WARP_ZOOM — starts tiny, zooms to fill, then fades
          const zoomSpring = spring({
            frame: relFrame,
            fps,
            config: { damping: 12, stiffness: 60, mass: 1.5 },
            durationInFrames: fw.lifeFrames,
          });
          x = fw.x; // scattered around center (set in buildFloatWords)
          y = fw.y;
          scale = zoomSpring * 8 + 0.05; // 0.05 → 8+
          blurPx = interpolate(zoomSpring, [0, 0.3, 1], [8, 2, 0]);

        } else {
          // BURST — springs outward from spawn point
          const burstSpring = spring({
            frame: relFrame,
            fps,
            config: { damping: 6, stiffness: 300, mass: 0.3 },
            durationInFrames: Math.round(fw.lifeFrames * 0.4),
          });
          const angle = fw.driftAngle + sr(i * 59) * Math.PI * 2;
          x = fw.x + Math.cos(angle) * fw.burstDist * burstSpring;
          y = fw.y + Math.sin(angle) * fw.burstDist * burstSpring;
          scale = (1 + burstSpring * 0.5) * (1 - progress * 0.3);
          rotation = burstSpring * (sr(i * 61) - 0.5) * 30;
        }

        const color = colors[fw.colorIdx];
        const glow = fw.glowRadius > 0 ? `0 0 ${fw.glowRadius * 2}px ${color}` : undefined;
        const motionBlur = blurPx > 0 ? `blur(${blurPx.toFixed(1)}px)` : undefined;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${x}%`,
              top: `${y}%`,
              transform: `translate(-50%,-50%) scale(${scale}) rotate(${rotation}deg)`,
              fontSize: `${fw.fontSize}vh`,
              fontFamily: "Outfit, sans-serif",
              fontWeight: 700,
              color,
              opacity,
              whiteSpace: "nowrap",
              userSelect: "none",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              filter: motionBlur,
              textShadow: glow,
            }}
          >
            {fw.word}
          </div>
        );
      })}
    </AbsoluteFill>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  overlay: OverlayConfig;
  allOverlays: OverlayConfig[];
}

export function MotionBackground({ overlay, allOverlays }: Props) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const cfg: MotionBgConfig = overlay.motionBg ?? {
    style: "gradient-shift",
    colors: ["#0d0d2b", "#6600cc", "#00ccff", "#cc00ff"],
    speed: 1,
    intensity: 0.8,
  };

  const opacity = overlay.opacity ?? 1;

  return (
    <AbsoluteFill style={{ opacity }}>
      {cfg.style === "gradient-shift" && (
        <LiquidChromatic cfg={cfg} frame={frame} fps={fps} />
      )}
      {cfg.style === "particle-field" && (
        <StellarDrift cfg={cfg} frame={frame} fps={fps} />
      )}
      {cfg.style === "aurora" && (
        <PlasmaAurora cfg={cfg} frame={frame} fps={fps} />
      )}
      {cfg.style === "noise-wave" && (
        <ChromaticInkDrop cfg={cfg} frame={frame} fps={fps} />
      )}
      {cfg.style === "geometric-pulse" && (
        <GeometricPulse cfg={cfg} frame={frame} fps={fps} />
      )}
      {cfg.style === "lyrics-float" && (
        <LyricsFloat
          cfg={cfg}
          frame={frame}
          fps={fps}
          totalFrames={durationInFrames}
          allOverlays={allOverlays}
        />
      )}
      {cfg.style === "neon-grid" && (
        <NeonGrid cfg={cfg} frame={frame} fps={fps} />
      )}
      {cfg.style === "cyber-rain" && (
        <CyberRain cfg={cfg} frame={frame} fps={fps} />
      )}
      {cfg.style === "frequency-wave" && (
        <FrequencyWave cfg={cfg} frame={frame} fps={fps} />
      )}
    </AbsoluteFill>
  );
}
