import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import type { OverlayConfig, LyricLine, WordStyle } from "@/types/studio";
import type { LyricsVariant } from "@/types/studio";

interface Props {
  overlay: OverlayConfig;
}

// Builds shared text style properties used across all variants
function sharedTextStyle(overlay: OverlayConfig): React.CSSProperties {
  const font = overlay.font;
  const textShadow = overlay.textShadow;
  return {
    fontFamily: `${font?.family ?? "Outfit"}, sans-serif`,
    fontSize: font?.size ?? 52,
    fontWeight: font?.weight ?? 700,
    letterSpacing: font?.letterSpacing ?? 0,
    lineHeight: font?.lineHeight ?? 1.3,
    WebkitTextStroke: overlay.textStroke
      ? `${overlay.textStroke.width}px ${overlay.textStroke.color}`
      : undefined,
    textShadow: textShadow
      ? `${textShadow.x}px ${textShadow.y}px ${textShadow.blur}px ${textShadow.color}`
      : "0 2px 20px rgba(0,0,0,0.8)",
  };
}

// Apply word-level style overrides when wordStyles is set
function WordsRenderer({
  text,
  wordStyles,
  baseStyle,
  baseColor,
}: {
  text: string;
  wordStyles: WordStyle[] | undefined;
  baseStyle: React.CSSProperties;
  baseColor: string;
}) {
  if (!wordStyles || wordStyles.length === 0) {
    return <span style={{ color: baseColor }}>{text}</span>;
  }
  const words = text.split(" ");
  const styleMap = new Map(wordStyles.map((ws) => [ws.wordIndex, ws]));

  return (
    <span style={{ display: "inline-flex", flexWrap: "wrap", gap: "0.25em", alignItems: "baseline" }}>
      {words.map((word, i) => {
        const ws = styleMap.get(i);
        const wordStyle: React.CSSProperties = {
          color: ws?.color ?? baseColor,
          fontWeight: ws?.bold ? 900 : baseStyle.fontWeight,
          fontStyle: ws?.italic ? "italic" : "normal",
          fontSize: ws?.scale ? `${(baseStyle.fontSize as number) * ws.scale}px` : undefined,
          display: "inline-block",
        };
        return (
          <span key={i} style={wordStyle}>
            {word}
          </span>
        );
      })}
    </span>
  );
}

// --- Variant renderers ---

function FadeSlideLine({
  line,
  relativeFrame,
  overlay,
}: {
  line: LyricLine;
  relativeFrame: number;
  overlay: OverlayConfig;
}) {
  const lineDuration = line.durationInFrames ?? 90;
  const fadeIn = interpolate(relativeFrame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(relativeFrame, [lineDuration - 10, lineDuration], [1, 0], { extrapolateLeft: "clamp" });
  const alpha = Math.min(fadeIn, fadeOut);
  const slideY = interpolate(relativeFrame, [0, 12], [20, 0], { extrapolateRight: "clamp" });
  const base = sharedTextStyle(overlay);

  return (
    <div style={{ opacity: alpha, transform: `translateY(${slideY}px)`, textAlign: overlay.font?.align ?? "center" }}>
      <WordsRenderer text={line.text} wordStyles={line.wordStyles} baseStyle={base} baseColor={overlay.color ?? "#ffffff"} />
    </div>
  );
}

function ColorFillLine({
  line,
  relativeFrame,
  overlay,
}: {
  line: LyricLine;
  relativeFrame: number;
  overlay: OverlayConfig;
}) {
  const lineDuration = line.durationInFrames ?? 90;
  const fadeIn = interpolate(relativeFrame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(relativeFrame, [lineDuration - 10, lineDuration], [1, 0], { extrapolateLeft: "clamp" });
  const alpha = Math.min(fadeIn, fadeOut);
  const slideY = interpolate(relativeFrame, [0, 12], [20, 0], { extrapolateRight: "clamp" });
  const fillPercent = interpolate(relativeFrame, [10, lineDuration - 10], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const base = sharedTextStyle(overlay);
  const sharedSpanStyle: React.CSSProperties = { ...base, whiteSpace: "nowrap" };
  const color = overlay.color ?? "#ffffff";

  return (
    <div
      style={{
        opacity: alpha,
        transform: `translateY(${slideY}px)`,
        textAlign: overlay.font?.align ?? "center",
        position: "relative",
        display: "inline-block",
      }}
    >
      {/* Base layer: grey */}
      <span style={{ ...sharedSpanStyle, color: "#F7F6E5" }}>{line.text}</span>
      {/* Color layer: clipped by animated width */}
      <span
        style={{
          ...sharedSpanStyle,
          color,
          position: "absolute",
          top: 0,
          left: 0,
          overflow: "hidden",
          width: `${fillPercent}%`,
        }}
      >
        {line.text}
      </span>
    </div>
  );
}

function TypewriterLine({
  line,
  relativeFrame,
  overlay,
  fillColor,
}: {
  line: LyricLine;
  relativeFrame: number;
  overlay: OverlayConfig;
  fillColor: boolean;
}) {
  const lineDuration = line.durationInFrames ?? 90;
  const fadeOut = interpolate(relativeFrame, [lineDuration - 10, lineDuration], [1, 0], { extrapolateLeft: "clamp" });
  const chars = [...line.text];
  const framesPerChar = Math.max(1, Math.floor((lineDuration * 0.7) / chars.length));
  const base = sharedTextStyle(overlay);
  const color = overlay.color ?? "#ffffff";

  return (
    <div style={{ opacity: fadeOut, textAlign: overlay.font?.align ?? "center", ...base }}>
      {chars.map((ch, i) => {
        const charFrame = i * framesPerChar;
        const charOpacity = interpolate(relativeFrame, [charFrame, charFrame + 3], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        let charColor = color;
        if (fillColor) {
          const fillFrame = charFrame + 6;
          charColor =
            relativeFrame >= fillFrame
              ? color
              : "#F7F6E5";
        }
        return (
          <span
            key={i}
            style={{
              opacity: ch === " " ? 1 : charOpacity,
              color: ch === " " ? "transparent" : charColor,
              display: "inline-block",
            }}
          >
            {ch === " " ? "\u00a0" : ch}
          </span>
        );
      })}
    </div>
  );
}

function WordPopLine({
  line,
  relativeFrame,
  overlay,
}: {
  line: LyricLine;
  relativeFrame: number;
  overlay: OverlayConfig;
}) {
  const { fps } = useVideoConfig();
  const lineDuration = line.durationInFrames ?? 90;
  const fadeOut = interpolate(relativeFrame, [lineDuration - 10, lineDuration], [1, 0], { extrapolateLeft: "clamp" });
  const words = line.text.split(" ");
  const framesPerWord = Math.max(4, Math.floor((lineDuration * 0.6) / words.length));
  const base = sharedTextStyle(overlay);
  const styleMap = new Map((line.wordStyles ?? []).map((ws) => [ws.wordIndex, ws]));
  const baseColor = overlay.color ?? "#ffffff";

  return (
    <div
      style={{
        opacity: fadeOut,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: overlay.font?.align === "left" ? "flex-start" : overlay.font?.align === "right" ? "flex-end" : "center",
        gap: "0.3em",
        textAlign: overlay.font?.align ?? "center",
      }}
    >
      {words.map((word, i) => {
        const wordRelFrame = relativeFrame - i * framesPerWord;
        const wordScale = spring({
          frame: Math.max(0, wordRelFrame),
          fps,
          config: { damping: 10, stiffness: 400, mass: 0.4 },
          from: 0,
          to: 1,
        });
        const wordOpacity = wordRelFrame >= 0 ? 1 : 0;
        const ws = styleMap.get(i);
        return (
          <span
            key={i}
            style={{
              ...base,
              display: "inline-block",
              opacity: wordOpacity,
              transform: `scale(${wordScale})`,
              color: ws?.color ?? baseColor,
              fontWeight: ws?.bold ? 900 : base.fontWeight,
              fontStyle: ws?.italic ? "italic" : "normal",
              fontSize: ws?.scale ? `${(base.fontSize as number) * ws.scale}px` : base.fontSize,
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
}

function GlowPulseLine({
  line,
  relativeFrame,
  overlay,
}: {
  line: LyricLine;
  relativeFrame: number;
  overlay: OverlayConfig;
}) {
  const lineDuration = line.durationInFrames ?? 90;
  const fadeIn = interpolate(relativeFrame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(relativeFrame, [lineDuration - 10, lineDuration], [1, 0], { extrapolateLeft: "clamp" });
  const alpha = Math.min(fadeIn, fadeOut);

  const glowIntensity = (Math.sin(relativeFrame * 0.12) + 1) / 2;
  const glowSize = interpolate(glowIntensity, [0, 1], [8, 32]);
  const color = overlay.color ?? "#ffffff";
  const base = sharedTextStyle(overlay);
  const extraShadow = `0 0 ${glowSize}px ${color}, 0 0 ${glowSize * 2}px ${color}40`;
  const existingShadow = base.textShadow ? `${base.textShadow}, ${extraShadow}` : extraShadow;

  return (
    <div
      style={{
        opacity: alpha,
        textAlign: overlay.font?.align ?? "center",
        ...base,
        textShadow: existingShadow,
      }}
    >
      <WordsRenderer text={line.text} wordStyles={line.wordStyles} baseStyle={base} baseColor={color} />
    </div>
  );
}

function KaraokeLine({
  line,
  relativeFrame,
  overlay,
}: {
  line: LyricLine;
  relativeFrame: number;
  overlay: OverlayConfig;
}) {
  const lineDuration = line.durationInFrames ?? 90;
  const fadeIn = interpolate(relativeFrame, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(relativeFrame, [lineDuration - 8, lineDuration], [1, 0], { extrapolateLeft: "clamp" });
  const alpha = Math.min(fadeIn, fadeOut);

  // Fill sweeps left-to-right over the duration (leave a small buffer at start/end)
  const fillPercent = interpolate(relativeFrame, [6, lineDuration - 8], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const base = sharedTextStyle(overlay);
  const color = overlay.color ?? "#ccff00";
  const sharedSpanStyle: React.CSSProperties = { ...base, whiteSpace: "nowrap" };

  // Glow intensity follows the fill edge
  const glowX = fillPercent;

  return (
    <div
      style={{
        opacity: alpha,
        textAlign: overlay.font?.align ?? "center",
        position: "relative",
        display: "inline-block",
      }}
    >
      {/* Base layer: dim/grey text */}
      <span style={{ ...sharedSpanStyle, color: "rgba(255,255,255,0.25)" }}>{line.text}</span>

      {/* Highlighted fill layer: clips at current fill width */}
      <span
        style={{
          ...sharedSpanStyle,
          color,
          position: "absolute",
          top: 0,
          left: 0,
          overflow: "hidden",
          width: `${fillPercent}%`,
          // Glow at the fill edge
          textShadow: `0 0 18px ${color}, 0 0 40px ${color}88`,
        }}
      >
        {line.text}
      </span>

      {/* Edge glow bar — thin vertical shimmer at the fill boundary */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: `${glowX}%`,
          width: 3,
          height: "100%",
          background: `linear-gradient(to bottom, transparent, ${color}, transparent)`,
          opacity: interpolate(fillPercent, [0, 5, 95, 100], [0, 0.9, 0.9, 0], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          }),
          filter: `blur(2px)`,
          pointerEvents: "none",
          transform: "translateX(-50%)",
        }}
      />
    </div>
  );
}

// Deterministic pseudo-random seeded by index
function seededRand(seed: number) {
  const x = Math.sin(seed + 1) * 43758.5453123;
  return x - Math.floor(x);
}

function GlitchScatterLine({
  line,
  relativeFrame,
  overlay,
}: {
  line: LyricLine;
  relativeFrame: number;
  overlay: OverlayConfig;
}) {
  const { fps } = useVideoConfig();
  const lineDuration = line.durationInFrames ?? 90;
  const base = sharedTextStyle(overlay);
  const color = overlay.color ?? "#ffffff";
  const chars = [...line.text];

  // ── Phase timing ──
  // [0 .. GATHER_END]   : chars scatter in from random offsets → settle to position
  // [GATHER_END .. HOLD] : text holds with occasional glitch flicker
  // [HOLD .. lineDuration]: chars scatter back out + fade
  const GATHER_END = Math.min(22, Math.floor(lineDuration * 0.25));
  const HOLD_START = GATHER_END;
  const SCATTER_START = Math.max(HOLD_START + 10, lineDuration - 28);

  const fadeIn = interpolate(relativeFrame, [0, 6], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(relativeFrame, [lineDuration - 8, lineDuration], [1, 0], { extrapolateLeft: "clamp" });
  const globalAlpha = Math.min(fadeIn, fadeOut);

  // Glitch flicker: random-ish intensity during hold phase
  const isHold = relativeFrame >= HOLD_START && relativeFrame < SCATTER_START;
  // Hit every ~18 frames for a 3-frame burst
  const glitchCycle = relativeFrame % 18;
  const glitchActive = isHold && glitchCycle < 3;
  const glitchIntensity = glitchActive
    ? interpolate(glitchCycle, [0, 1, 2], [0.8, 1, 0.5], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    : 0;

  // RGB split offsets during glitch
  const rgbShiftX = glitchActive ? interpolate(glitchCycle, [0, 1, 2], [3, -4, 2]) : 0;
  const rgbShiftY = glitchActive ? interpolate(glitchCycle, [0, 1, 2], [-1, 2, -1]) : 0;

  // Per-char scatter spring
  const scatterSprings = chars.map((_, i) => {
    const stagger = i * 1.5;
    const gatherFrame = Math.max(0, relativeFrame - stagger);
    return spring({
      frame: gatherFrame,
      fps,
      config: { damping: 9, stiffness: 320, mass: 0.6 },
      from: 0,
      to: 1,
    });
  });

  // Scatter-out spring (chars fly back out on exit)
  const scatterOutSprings = chars.map((_, i) => {
    const stagger = i * 1.2;
    const scatterFrame = Math.max(0, relativeFrame - SCATTER_START - stagger);
    return spring({
      frame: scatterFrame,
      fps,
      config: { damping: 7, stiffness: 280, mass: 0.8 },
      from: 0,
      to: 1,
    });
  });

  const isScatteringOut = relativeFrame >= SCATTER_START;

  return (
    <div
      style={{
        opacity: globalAlpha,
        textAlign: overlay.font?.align ?? "center",
        display: "flex",
        flexWrap: "wrap",
        justifyContent:
          overlay.font?.align === "left" ? "flex-start"
          : overlay.font?.align === "right" ? "flex-end"
          : "center",
        gap: 0,
        position: "relative",
      }}
    >
      {/* RGB aberration layers during glitch */}
      {glitchActive && (
        <>
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexWrap: "wrap",
            justifyContent: overlay.font?.align === "left" ? "flex-start" : overlay.font?.align === "right" ? "flex-end" : "center",
            transform: `translate(${rgbShiftX}px, ${rgbShiftY}px)`,
            opacity: glitchIntensity * 0.45,
            pointerEvents: "none",
          }}>
            {chars.map((ch, i) => (
              <span key={i} style={{ ...base, color: "#ff0055", display: "inline-block", whiteSpace: "pre" }}>{ch}</span>
            ))}
          </div>
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexWrap: "wrap",
            justifyContent: overlay.font?.align === "left" ? "flex-start" : overlay.font?.align === "right" ? "flex-end" : "center",
            transform: `translate(${-rgbShiftX}px, ${-rgbShiftY}px)`,
            opacity: glitchIntensity * 0.35,
            pointerEvents: "none",
          }}>
            {chars.map((ch, i) => (
              <span key={i} style={{ ...base, color: "#00ffee", display: "inline-block", whiteSpace: "pre" }}>{ch}</span>
            ))}
          </div>
        </>
      )}

      {chars.map((ch, i) => {
        const gatherSpring = scatterSprings[i];
        const outSpring = scatterOutSprings[i];

        // Entry: chars come from random scatter positions
        const rx = (seededRand(i * 7 + 1) - 0.5) * 140;
        const ry = (seededRand(i * 13 + 3) - 0.5) * 100;
        const rRot = (seededRand(i * 5 + 2) - 0.5) * 180;

        // Exit: scatter in different directions
        const ex = (seededRand(i * 11 + 9) - 0.5) * 200;
        const ey = (seededRand(i * 17 + 7) - 0.5) * 140;
        const eRot = (seededRand(i * 3 + 5) - 0.5) * 240;

        const enterX = isScatteringOut ? 0 : interpolate(gatherSpring, [0, 1], [rx, 0]);
        const enterY = isScatteringOut ? 0 : interpolate(gatherSpring, [0, 1], [ry, 0]);
        const enterRot = isScatteringOut ? 0 : interpolate(gatherSpring, [0, 1], [rRot, 0]);
        const enterOpacity = isScatteringOut ? 1 : interpolate(gatherSpring, [0, 0.1, 1], [0, 0.6, 1]);

        const exitX = isScatteringOut ? interpolate(outSpring, [0, 1], [0, ex]) : 0;
        const exitY = isScatteringOut ? interpolate(outSpring, [0, 1], [0, ey]) : 0;
        const exitRot = isScatteringOut ? interpolate(outSpring, [0, 1], [0, eRot]) : 0;
        const exitOpacity = isScatteringOut ? interpolate(outSpring, [0, 0.1, 0.8, 1], [1, 0.9, 0.3, 0]) : 1;

        // Subtle jitter during glitch
        const jitterX = glitchActive ? (seededRand(i + relativeFrame * 37) - 0.5) * 6 : 0;
        const jitterY = glitchActive ? (seededRand(i + relativeFrame * 53) - 0.5) * 4 : 0;

        const x = enterX + exitX + jitterX;
        const y = enterY + exitY + jitterY;
        const rot = enterRot + exitRot;
        const charOpacity = enterOpacity * exitOpacity;

        // Char color: flash white/accent during glitch flicker
        const charColor = glitchActive && seededRand(i + relativeFrame) > 0.6
          ? (seededRand(i * 2 + relativeFrame) > 0.5 ? "#ffffff" : "#ccff00")
          : color;

        return (
          <span
            key={i}
            style={{
              ...base,
              display: "inline-block",
              whiteSpace: "pre",
              color: charColor,
              opacity: charOpacity,
              transform: `translate(${x}px, ${y}px) rotate(${rot}deg)`,
            }}
          >
            {ch}
          </span>
        );
      })}
    </div>
  );
}

// ── Fragment Shatter ──
// Text assembles from shattered shards that fly in and lock into place,
// then at exit explodes outward like glass breaking.
function FragmentShatterLine({
  line,
  relativeFrame,
  overlay,
}: {
  line: LyricLine;
  relativeFrame: number;
  overlay: OverlayConfig;
}) {
  const { fps } = useVideoConfig();
  const lineDuration = line.durationInFrames ?? 90;
  const base = sharedTextStyle(overlay);
  const color = overlay.color ?? "#ffffff";
  const words = line.text.split(" ");

  // Phase timing
  const ASSEMBLE_END   = Math.min(30, Math.floor(lineDuration * 0.30));
  const SHATTER_START  = Math.max(ASSEMBLE_END + 12, lineDuration - 26);

  const globalFadeOut = interpolate(relativeFrame, [lineDuration - 6, lineDuration], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // Each word is a "shard" with a unique entry trajectory
  const wordData = words.map((word, i) => {
    const stagger = i * 3.5;
    const assembleFrame = Math.max(0, relativeFrame - stagger);
    const assembleSpring = spring({
      frame: assembleFrame,
      fps,
      config: { damping: 8, stiffness: 380, mass: 0.55 },
      from: 0,
      to: 1,
    });

    // Each shard comes from a distinct direction (alternating quadrants)
    const angle = (seededRand(i * 7 + 1) * Math.PI * 2);
    const dist = 120 + seededRand(i * 3 + 2) * 80;
    const entryX = Math.cos(angle) * dist;
    const entryY = Math.sin(angle) * dist;
    const entryRot = (seededRand(i * 11) - 0.5) * 90;
    const entryScale = 0.3 + seededRand(i * 5) * 0.4;

    // Shatter-out: same shard flies further in same direction
    const shatterFrame = Math.max(0, relativeFrame - SHATTER_START - i * 2);
    const shatterSpring = spring({
      frame: shatterFrame,
      fps,
      config: { damping: 6, stiffness: 260, mass: 0.9 },
      from: 0,
      to: 1,
    });

    const isShatterPhase = relativeFrame >= SHATTER_START;
    const isAssembled = assembleFrame > 0;

    const x = isShatterPhase
      ? interpolate(shatterSpring, [0, 1], [0, entryX * 1.8])
      : isAssembled ? interpolate(assembleSpring, [0, 1], [entryX, 0]) : entryX;

    const y = isShatterPhase
      ? interpolate(shatterSpring, [0, 1], [0, entryY * 1.8 + 30]) // gravity bias down
      : isAssembled ? interpolate(assembleSpring, [0, 1], [entryY, 0]) : entryY;

    const rot = isShatterPhase
      ? interpolate(shatterSpring, [0, 1], [0, entryRot * 2])
      : isAssembled ? interpolate(assembleSpring, [0, 1], [entryRot, 0]) : entryRot;

    const scale = isShatterPhase
      ? interpolate(shatterSpring, [0, 0.4, 1], [1, 1.05, entryScale])
      : isAssembled ? interpolate(assembleSpring, [0, 0.3, 0.7, 1], [entryScale, 1.15, 0.95, 1]) : entryScale;

    const alpha = isShatterPhase
      ? interpolate(shatterSpring, [0, 0.1, 0.7, 1], [1, 1, 0.4, 0])
      : isAssembled ? interpolate(assembleSpring, [0, 0.1, 1], [0, 0.7, 1]) : 0;

    // Impact flash: brief white flash as the shard locks in
    const impactFrame = ASSEMBLE_END - (words.length - 1 - i) * 3.5;
    const impactBrightness = !isShatterPhase && relativeFrame >= impactFrame && relativeFrame < impactFrame + 4
      ? interpolate(relativeFrame, [impactFrame, impactFrame + 2, impactFrame + 4], [0, 1, 0], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp",
        })
      : 0;

    const wordColor = impactBrightness > 0.2
      ? `rgba(255,255,255,${0.5 + impactBrightness * 0.5})`
      : color;

    // Crack-line decoration: thin SVG line that appears briefly on impact
    const showCrack = impactBrightness > 0.3;

    return { word, x, y, rot, scale, alpha, wordColor, showCrack, impactBrightness };
  });

  // Hold phase: subtle shimmer on assembled text
  const isHold = relativeFrame >= ASSEMBLE_END && relativeFrame < SHATTER_START;
  const shimmer = isHold
    ? interpolate(relativeFrame % 60, [0, 30, 60], [0, 0.15, 0], {
        extrapolateLeft: "clamp", extrapolateRight: "clamp",
      })
    : 0;

  return (
    <div
      style={{
        opacity: globalFadeOut,
        display: "flex",
        flexWrap: "wrap",
        justifyContent:
          overlay.font?.align === "left" ? "flex-start"
          : overlay.font?.align === "right" ? "flex-end"
          : "center",
        gap: "0.32em",
        textAlign: overlay.font?.align ?? "center",
        position: "relative",
      }}
    >
      {wordData.map(({ word, x, y, rot, scale, alpha, wordColor, showCrack, impactBrightness }, i) => (
        <span
          key={i}
          style={{
            ...base,
            display: "inline-block",
            color: wordColor,
            opacity: alpha,
            transform: `translate(${x}px, ${y}px) rotate(${rot}deg) scale(${scale})`,
            textShadow: shimmer > 0
              ? `0 0 ${shimmer * 30}px ${color}88`
              : impactBrightness > 0.2
              ? `0 0 20px #fff, 0 0 40px ${color}`
              : `0 2px 16px rgba(0,0,0,0.6)`,
            filter: showCrack ? `brightness(${1 + impactBrightness})` : "none",
          }}
        >
          {word}
        </span>
      ))}
    </div>
  );
}

// ── Pulse Smoke ──
// Text materialises through drifting smoke/particle clouds,
// pulses gently while visible, then dissolves back into smoke on exit.
function PulseSmokeLine({
  line,
  relativeFrame,
  overlay,
}: {
  line: LyricLine;
  relativeFrame: number;
  overlay: OverlayConfig;
}) {
  const { fps } = useVideoConfig();
  const lineDuration = line.durationInFrames ?? 90;
  const base = sharedTextStyle(overlay);
  const color = overlay.color ?? "#ffffff";

  // Phase timing
  const EMERGE_END    = Math.min(28, Math.floor(lineDuration * 0.28));
  const DISSOLVE_START = Math.max(EMERGE_END + 10, lineDuration - 30);

  // Text itself: fade + slight scale reveal from 0.88 → 1
  const emergeProgress = interpolate(relativeFrame, [0, EMERGE_END], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const dissolveProgress = interpolate(relativeFrame, [DISSOLVE_START, lineDuration], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  const textOpacity = Math.max(0,
    interpolate(emergeProgress, [0, 0.4, 1], [0, 0.5, 1]) *
    interpolate(dissolveProgress, [0, 0.5, 1], [1, 0.4, 0])
  );
  const textScale = interpolate(emergeProgress, [0, 1], [0.86, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  }) * interpolate(dissolveProgress, [0, 1], [1, 1.06], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // Idle pulse: scale breathes + glow oscillates
  const isHold = relativeFrame >= EMERGE_END && relativeFrame < DISSOLVE_START;
  const pulseCycle = relativeFrame % 50;
  const idlePulse = isHold
    ? interpolate(pulseCycle, [0, 25, 50], [1, 1.025, 1], {
        extrapolateLeft: "clamp", extrapolateRight: "clamp",
      })
    : 1;
  const glowIntensity = isHold
    ? interpolate(pulseCycle, [0, 25, 50], [0.3, 0.9, 0.3], {
        extrapolateLeft: "clamp", extrapolateRight: "clamp",
      })
    : interpolate(emergeProgress, [0, 1], [0, 0.5]);

  // Smoke particles: 14 wisps that drift upward, fade, and blur
  const SMOKE_COUNT = 14;
  const smokeParticles = Array.from({ length: SMOKE_COUNT }, (_, i) => {
    // Each particle has an offset phase so they don't all pulse together
    const phaseOffset = i * (lineDuration / SMOKE_COUNT);
    const pf = ((relativeFrame + phaseOffset) % lineDuration);

    // During emerge: smoke is dense and concentrated
    // During hold: smoke drifts slowly from behind the text
    // During dissolve: smoke blooms outward

    const lifeFraction = pf / lineDuration;
    const smokeOpacityBase = emergeProgress > 0 && dissolveProgress < 1
      ? interpolate(lifeFraction, [0, 0.15, 0.6, 1], [0, 0.35, 0.2, 0], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp",
        })
      : 0;

    // Dissolve boosts smoke opacity
    const smokeOpacity = smokeOpacityBase + dissolveProgress * 0.5 * (1 - lifeFraction);

    const xBase = (seededRand(i * 7) - 0.5) * 160;
    const xDrift = xBase + (seededRand(i * 3 + 1) - 0.5) * 30 * lifeFraction;
    const yDrift = -50 * lifeFraction - seededRand(i * 11) * 30;
    const wispScale = (0.8 + seededRand(i * 5) * 1.4) * (1 + dissolveProgress * 1.2);
    const wispBlur = 6 + seededRand(i * 9) * 10 + dissolveProgress * 16;

    return { x: xDrift, y: yDrift, opacity: smokeOpacity, scale: wispScale, blur: wispBlur, i };
  });

  const textShadow = `
    0 0 ${glowIntensity * 24}px ${color},
    0 0 ${glowIntensity * 48}px ${color}66,
    0 2px 20px rgba(0,0,0,0.7)
  `;

  return (
    <div
      style={{
        position: "relative",
        textAlign: overlay.font?.align ?? "center",
        display: "inline-block",
      }}
    >
      {/* Smoke wisps — behind text */}
      {smokeParticles.map((p) => (
        <div
          key={p.i}
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: 60 * p.scale,
            height: 60 * p.scale,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${color}44 0%, ${color}11 50%, transparent 75%)`,
            transform: `translate(calc(-50% + ${p.x}px), calc(-50% + ${p.y}px)) scale(${p.scale})`,
            opacity: Math.min(p.opacity, 1),
            filter: `blur(${p.blur}px)`,
            pointerEvents: "none",
          }}
        />
      ))}

      {/* Main text */}
      <div
        style={{
          ...base,
          color,
          opacity: textOpacity,
          transform: `scale(${textScale * idlePulse})`,
          textShadow,
          position: "relative",
          zIndex: 1,
          display: "inline-block",
        }}
      >
        <WordsRenderer
          text={line.text}
          wordStyles={line.wordStyles}
          baseStyle={base}
          baseColor={color}
        />
      </div>
    </div>
  );
}

// --- Dispatcher ---

function LyricLineRenderer({
  line,
  relativeFrame,
  overlay,
  variant,
}: {
  line: LyricLine;
  relativeFrame: number;
  overlay: OverlayConfig;
  variant: LyricsVariant;
}) {
  // Per-line override takes precedence
  const effectiveVariant = line.animationVariant ?? variant;

  switch (effectiveVariant) {
    case "color-fill":
      return <ColorFillLine line={line} relativeFrame={relativeFrame} overlay={overlay} />;
    case "typewriter":
      return <TypewriterLine line={line} relativeFrame={relativeFrame} overlay={overlay} fillColor={false} />;
    case "typewriter-fill":
      return <TypewriterLine line={line} relativeFrame={relativeFrame} overlay={overlay} fillColor={true} />;
    case "word-pop":
      return <WordPopLine line={line} relativeFrame={relativeFrame} overlay={overlay} />;
    case "glow-pulse":
      return <GlowPulseLine line={line} relativeFrame={relativeFrame} overlay={overlay} />;
    case "karaoke":
      return <KaraokeLine line={line} relativeFrame={relativeFrame} overlay={overlay} />;
    case "glitch-scatter":
      return <GlitchScatterLine line={line} relativeFrame={relativeFrame} overlay={overlay} />;
    case "fragment-shatter":
      return <FragmentShatterLine line={line} relativeFrame={relativeFrame} overlay={overlay} />;
    case "pulse-smoke":
      return <PulseSmokeLine line={line} relativeFrame={relativeFrame} overlay={overlay} />;
    default:
      return <FadeSlideLine line={line} relativeFrame={relativeFrame} overlay={overlay} />;
  }
}

export function LyricsDisplay({ overlay }: Props) {
  const frame = useCurrentFrame();
  const lines = overlay.lyrics ?? [];
  const overlayOpacity = overlay.opacity ?? 1;
  const variant = (overlay.animationVariant ?? "fade-slide") as LyricsVariant;
  const containerW = overlay.containerWidth;

  return (
    <div
      style={{
        position: "absolute",
        left: `${overlay.position.x}%`,
        top: `${overlay.position.y}%`,
        transform: "translate(-50%, -50%)",
        opacity: overlayOpacity,
        display: "flex",
        flexDirection: "column",
        alignItems:
          overlay.font?.align === "left"
            ? "flex-start"
            : overlay.font?.align === "right"
            ? "flex-end"
            : "center",
        gap: 8,
        // containerWidth controls wrapping; when unset fall back to a sensible min
        width: containerW !== undefined ? containerW : undefined,
        minWidth: containerW !== undefined ? containerW : 400,
        maxWidth: containerW !== undefined ? containerW : undefined,
      }}
    >
      {lines.map((line, i) => {
        const lineDuration = line.durationInFrames ?? 90;
        const relFrame = frame - line.startFrame;
        if (relFrame < 0 || relFrame > lineDuration) return null;

        // Merge all per-segment overrides into a shallow-cloned overlay so variant
        // renderers don't need to know about per-line overrides at all.
        const hasOverride =
          line.fontSize !== undefined ||
          line.color !== undefined ||
          line.fontFamily !== undefined ||
          line.fontWeight !== undefined;

        const lineOverlay = hasOverride && overlay.font
          ? {
              ...overlay,
              color: line.color ?? overlay.color,
              font: {
                ...overlay.font,
                size: line.fontSize ?? overlay.font.size,
                family: line.fontFamily ?? overlay.font.family,
                weight: line.fontWeight ?? overlay.font.weight,
              },
            }
          : overlay;

        return (
          <LyricLineRenderer
            key={i}
            line={line}
            relativeFrame={relFrame}
            overlay={lineOverlay}
            variant={variant}
          />
        );
      })}
    </div>
  );
}
