import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import type { OverlayConfig } from "@/types/studio";
import type { TextVariant } from "@/types/studio";

interface Props {
  overlay: OverlayConfig;
}

const FADE_FRAMES = 10;

/** Returns [0→1] progress for a spring-based entrance */
function useSpringIn(startFrame: number, fps: number) {
  const frame = useCurrentFrame();
  return spring({ frame: frame - startFrame, fps, config: { damping: 14, stiffness: 120, mass: 0.8 } });
}

function TextContent({ overlay, style }: { overlay: OverlayConfig; style: React.CSSProperties }) {
  const font = overlay.font;
  const textStyle: React.CSSProperties = {
    fontFamily: `${font?.family ?? "Outfit"}, sans-serif`,
    fontSize: font?.size ?? 52,
    fontWeight: font?.weight ?? 700,
    letterSpacing: font?.letterSpacing ?? 0,
    lineHeight: font?.lineHeight ?? 1.3,
    textAlign: font?.align ?? "center",
    textShadow: overlay.textShadow
      ? `${overlay.textShadow.x}px ${overlay.textShadow.y}px ${overlay.textShadow.blur}px ${overlay.textShadow.color}`
      : undefined,
    WebkitTextStroke: overlay.textStroke
      ? `${overlay.textStroke.width}px ${overlay.textStroke.color}`
      : undefined,
    maxWidth: "80%",
    wordBreak: "break-word",
    whiteSpace: "pre-wrap",
    ...style,
  };

  if (overlay.gradientColors) {
    Object.assign(textStyle, {
      background: `linear-gradient(135deg, ${overlay.gradientColors[0]}, ${overlay.gradientColors[1]})`,
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
    });
  } else {
    textStyle.color = overlay.color ?? "#ffffff";
  }

  return <span style={textStyle}>{overlay.text ?? "Your text"}</span>;
}

/** Typewriter — reveals characters progressively */
function TypewriterText({ overlay, alpha }: { overlay: OverlayConfig; alpha: number }) {
  const frame = useCurrentFrame();
  const totalFrames = overlay.durationInFrames;
  const text = overlay.text ?? "Your text";
  const font = overlay.font;

  const revealDuration = Math.min(totalFrames * 0.6, text.length * 2);
  const charsToShow = Math.floor(interpolate(frame, [0, revealDuration], [0, text.length], { extrapolateRight: "clamp" }));
  const visibleText = text.slice(0, charsToShow);

  const textStyle: React.CSSProperties = {
    fontFamily: `${font?.family ?? "Outfit"}, sans-serif`,
    fontSize: font?.size ?? 52,
    fontWeight: font?.weight ?? 700,
    letterSpacing: font?.letterSpacing ?? 0,
    lineHeight: font?.lineHeight ?? 1.3,
    textAlign: font?.align ?? "center",
    textShadow: overlay.textShadow
      ? `${overlay.textShadow.x}px ${overlay.textShadow.y}px ${overlay.textShadow.blur}px ${overlay.textShadow.color}`
      : undefined,
    WebkitTextStroke: overlay.textStroke
      ? `${overlay.textStroke.width}px ${overlay.textStroke.color}`
      : undefined,
    maxWidth: "80%",
    wordBreak: "break-word",
    whiteSpace: "pre-wrap",
    opacity: alpha,
    color: overlay.gradientColors ? undefined : (overlay.color ?? "#ffffff"),
  };

  if (overlay.gradientColors) {
    Object.assign(textStyle, {
      background: `linear-gradient(135deg, ${overlay.gradientColors[0]}, ${overlay.gradientColors[1]})`,
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
    });
  }

  return <span style={textStyle}>{visibleText}<span style={{ opacity: charsToShow < text.length ? 1 : 0 }}>|</span></span>;
}

/** Word-pop — each word springs in individually */
function WordPopText({ overlay, alpha }: { overlay: OverlayConfig; alpha: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const text = overlay.text ?? "Your text";
  const words = text.split(" ");
  const font = overlay.font;

  const baseStyle: React.CSSProperties = {
    fontFamily: `${font?.family ?? "Outfit"}, sans-serif`,
    fontSize: font?.size ?? 52,
    fontWeight: font?.weight ?? 700,
    letterSpacing: font?.letterSpacing ?? 0,
    lineHeight: font?.lineHeight ?? 1.3,
    textAlign: font?.align ?? "center",
    maxWidth: "80%",
    wordBreak: "break-word",
    flexWrap: "wrap",
    display: "flex",
    gap: "0.25em",
    justifyContent: font?.align === "left" ? "flex-start" : font?.align === "right" ? "flex-end" : "center",
    opacity: alpha,
  };

  const wordColor = overlay.gradientColors ? undefined : (overlay.color ?? "#ffffff");

  return (
    <div style={baseStyle}>
      {words.map((word, i) => {
        const delay = i * 3;
        const s = spring({ frame: frame - delay, fps, config: { damping: 10, stiffness: 200, mass: 0.5 } });
        const wordStyle: React.CSSProperties = {
          display: "inline-block",
          transform: `scale(${s}) translateY(${(1 - s) * 20}px)`,
          opacity: s,
          WebkitTextStroke: overlay.textStroke
            ? `${overlay.textStroke.width}px ${overlay.textStroke.color}`
            : undefined,
          textShadow: overlay.textShadow
            ? `${overlay.textShadow.x}px ${overlay.textShadow.y}px ${overlay.textShadow.blur}px ${overlay.textShadow.color}`
            : undefined,
        };
        if (overlay.gradientColors) {
          Object.assign(wordStyle, {
            background: `linear-gradient(135deg, ${overlay.gradientColors[0]}, ${overlay.gradientColors[1]})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          });
        } else {
          wordStyle.color = wordColor;
        }
        return <span key={i} style={wordStyle}>{word}</span>;
      })}
    </div>
  );
}

/** Glitch — RGB split flicker on entrance */
function GlitchText({ overlay, alpha }: { overlay: OverlayConfig; alpha: number }) {
  const frame = useCurrentFrame();
  const totalFrames = overlay.durationInFrames;
  const font = overlay.font;

  // Glitch active in first 20 frames and last 10
  const entranceGlitch = frame < 20;
  const exitGlitch = frame > totalFrames - 10;
  const glitchIntensity = entranceGlitch
    ? interpolate(frame, [0, 20], [12, 0], { extrapolateRight: "clamp" })
    : exitGlitch
    ? interpolate(frame, [totalFrames - 10, totalFrames], [0, 12], { extrapolateLeft: "clamp" })
    : 0;

  const flicker = glitchIntensity > 0 && frame % 3 === 0;
  const offsetX = flicker ? (Math.random() - 0.5) * glitchIntensity : 0;
  const offsetY = flicker ? (Math.random() - 0.5) * glitchIntensity * 0.5 : 0;

  const textStyle: React.CSSProperties = {
    fontFamily: `${font?.family ?? "Outfit"}, sans-serif`,
    fontSize: font?.size ?? 52,
    fontWeight: font?.weight ?? 700,
    letterSpacing: font?.letterSpacing ?? 0,
    lineHeight: font?.lineHeight ?? 1.3,
    textAlign: font?.align ?? "center",
    maxWidth: "80%",
    wordBreak: "break-word",
    whiteSpace: "pre-wrap",
    opacity: alpha,
    position: "relative",
    color: overlay.gradientColors ? undefined : (overlay.color ?? "#ffffff"),
    WebkitTextStroke: overlay.textStroke
      ? `${overlay.textStroke.width}px ${overlay.textStroke.color}`
      : undefined,
  };

  if (overlay.gradientColors) {
    Object.assign(textStyle, {
      background: `linear-gradient(135deg, ${overlay.gradientColors[0]}, ${overlay.gradientColors[1]})`,
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
    });
  }

  const text = overlay.text ?? "Your text";

  const wrapStyle: React.CSSProperties = {
    position: "relative",
    transform: `translate(${offsetX}px, ${offsetY}px)`,
  };

  const redGhost: React.CSSProperties = {
    ...textStyle,
    position: "absolute",
    top: 0,
    left: 0,
    color: "rgba(255,0,60,0.7)",
    WebkitTextFillColor: glitchIntensity > 0 ? "rgba(255,0,60,0.7)" : undefined,
    transform: `translate(${-glitchIntensity * 0.4}px, 0)`,
    opacity: glitchIntensity > 0 ? 0.7 : 0,
    pointerEvents: "none",
  };

  const blueGhost: React.CSSProperties = {
    ...textStyle,
    position: "absolute",
    top: 0,
    left: 0,
    color: "rgba(0,200,255,0.7)",
    WebkitTextFillColor: glitchIntensity > 0 ? "rgba(0,200,255,0.7)" : undefined,
    transform: `translate(${glitchIntensity * 0.4}px, 0)`,
    opacity: glitchIntensity > 0 ? 0.7 : 0,
    pointerEvents: "none",
  };

  return (
    <div style={wrapStyle}>
      <span style={redGhost}>{text}</span>
      <span style={blueGhost}>{text}</span>
      <span style={textStyle}>{text}</span>
    </div>
  );
}

export function TextOverlay({ overlay }: Props) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const totalFrames = overlay.durationInFrames;
  const variant = (overlay.animationVariant ?? "fade") as TextVariant;

  const fadeIn = interpolate(frame, [0, FADE_FRAMES], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [totalFrames - FADE_FRAMES, totalFrames], [1, 0], { extrapolateLeft: "clamp" });
  const alpha = Math.min(fadeIn, fadeOut) * (overlay.opacity ?? 1);

  const sp = spring({ frame, fps, config: { damping: 14, stiffness: 120, mass: 0.8 } });
  const spBounce = spring({ frame, fps, config: { damping: 8, stiffness: 180, mass: 0.6 } });

  const font = overlay.font;
  const alignJustify = font?.align === "left" ? "flex-start" : font?.align === "right" ? "flex-end" : "center";

  // Per-variant transform and filter
  let transform = "translate(-50%, -50%)";
  let filter: string | undefined;
  let extraOpacity = 1;

  switch (variant) {
    case "slide-up":
      transform = `translate(-50%, calc(-50% + ${(1 - sp) * 60}px))`;
      extraOpacity = sp;
      break;
    case "slide-down":
      transform = `translate(-50%, calc(-50% - ${(1 - sp) * 60}px))`;
      extraOpacity = sp;
      break;
    case "slide-left":
      transform = `translate(calc(-50% + ${(1 - sp) * 80}px), -50%)`;
      extraOpacity = sp;
      break;
    case "slide-right":
      transform = `translate(calc(-50% - ${(1 - sp) * 80}px), -50%)`;
      extraOpacity = sp;
      break;
    case "zoom-in":
      transform = `translate(-50%, -50%) scale(${interpolate(sp, [0, 1], [0.4, 1])})`;
      extraOpacity = sp;
      break;
    case "zoom-bounce":
      transform = `translate(-50%, -50%) scale(${interpolate(spBounce, [0, 1], [0.3, 1])})`;
      extraOpacity = spBounce;
      break;
    case "rotate-in": {
      const deg = interpolate(sp, [0, 1], [-25, 0]);
      transform = `translate(-50%, -50%) rotate(${deg}deg) scale(${interpolate(sp, [0, 1], [0.7, 1])})`;
      extraOpacity = sp;
      break;
    }
    case "blur-in": {
      const blurPx = interpolate(sp, [0, 1], [20, 0]);
      filter = `blur(${blurPx}px)`;
      extraOpacity = sp;
      break;
    }
    // typewriter, word-pop, glitch handle their own rendering below
    case "typewriter":
    case "word-pop":
    case "glitch":
    case "fade":
    default:
      break;
  }

  const containerStyle: React.CSSProperties = {
    position: "absolute",
    left: `${overlay.position.x}%`,
    top: `${overlay.position.y}%`,
    transform,
    filter,
    opacity: alpha * (variant === "fade" ? 1 : extraOpacity > alpha ? alpha : extraOpacity),
    display: "flex",
    justifyContent: alignJustify,
  };

  if (variant === "typewriter") {
    return (
      <div style={{ ...containerStyle, opacity: alpha }}>
        <TypewriterText overlay={overlay} alpha={1} />
      </div>
    );
  }

  if (variant === "word-pop") {
    return (
      <div style={{ ...containerStyle, opacity: alpha }}>
        <WordPopText overlay={overlay} alpha={1} />
      </div>
    );
  }

  if (variant === "glitch") {
    return (
      <div style={{ ...containerStyle, opacity: alpha }}>
        <GlitchText overlay={overlay} alpha={1} />
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <TextContent overlay={overlay} style={{}} />
    </div>
  );
}
