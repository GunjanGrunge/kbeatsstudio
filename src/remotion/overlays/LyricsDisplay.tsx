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
    default:
      return <FadeSlideLine line={line} relativeFrame={relativeFrame} overlay={overlay} />;
  }
}

export function LyricsDisplay({ overlay }: Props) {
  const frame = useCurrentFrame();
  const lines = overlay.lyrics ?? [];
  const overlayOpacity = overlay.opacity ?? 1;
  const variant = (overlay.animationVariant ?? "fade-slide") as LyricsVariant;

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
        minWidth: 400,
      }}
    >
      {lines.map((line, i) => {
        const lineDuration = line.durationInFrames ?? 90;
        const relFrame = frame - overlay.startFrame - line.startFrame;
        if (relFrame < 0 || relFrame > lineDuration) return null;

        return (
          <LyricLineRenderer
            key={i}
            line={line}
            relativeFrame={relFrame}
            overlay={overlay}
            variant={variant}
          />
        );
      })}
    </div>
  );
}
