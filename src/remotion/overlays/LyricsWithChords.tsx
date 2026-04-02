import { useCurrentFrame, interpolate } from "remotion";
import type { OverlayConfig, ChordLine } from "@/types/studio";
import type { LyricsVariant } from "@/types/studio";

interface Props {
  overlay: OverlayConfig;
}

function ChordLineRenderer({
  line,
  relativeFrame,
  overlay,
  variant,
}: {
  line: ChordLine;
  relativeFrame: number;
  overlay: OverlayConfig;
  variant: LyricsVariant;
}) {
  const duration = line.durationInFrames ?? 90;
  const fadeIn = interpolate(relativeFrame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(relativeFrame, [duration - 10, duration], [1, 0], { extrapolateLeft: "clamp" });
  const alpha = Math.min(fadeIn, fadeOut);
  const slideY = interpolate(relativeFrame, [0, 12], [16, 0], { extrapolateRight: "clamp" });

  const font = overlay.font;
  const lyricSize = font?.size ?? 48;
  const chordSize = Math.round(lyricSize * 0.5);
  const lyricColor = overlay.color ?? "#ffffff";
  const chordColor = "#ccff00";
  const charWidth = lyricSize * 0.55;

  const sharedLyricStyle: React.CSSProperties = {
    fontFamily: `${font?.family ?? "Outfit"}, sans-serif`,
    fontSize: lyricSize,
    fontWeight: font?.weight ?? 700,
    letterSpacing: font?.letterSpacing ?? 0,
    lineHeight: 1.2,
    textShadow: overlay.textShadow
      ? `${overlay.textShadow.x}px ${overlay.textShadow.y}px ${overlay.textShadow.blur}px ${overlay.textShadow.color}`
      : "0 2px 20px rgba(0,0,0,0.8)",
    WebkitTextStroke: overlay.textStroke
      ? `${overlay.textStroke.width}px ${overlay.textStroke.color}`
      : undefined,
    whiteSpace: "nowrap",
  };

  // color-fill: two-layer karaoke on the lyric text
  const fillPercent =
    variant === "color-fill"
      ? interpolate(relativeFrame, [10, duration - 10], [0, 100], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 100;

  return (
    <div
      style={{
        opacity: alpha,
        transform: `translateY(${slideY}px)`,
        position: "relative",
        display: "inline-block",
        padding: `${chordSize + 12}px 32px 0`,
      }}
    >
      {/* Chord names — always #ccff00, never affected by fill */}
      {line.chords.map((ct, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            top: 0,
            left: `calc(32px + ${ct.charOffset * charWidth}px)`,
            fontFamily: `${font?.family ?? "Outfit"}, monospace`,
            fontSize: chordSize,
            fontWeight: 700,
            color: chordColor,
            textShadow: `0 0 20px rgba(204,255,0,0.5)`,
            letterSpacing: 1,
            whiteSpace: "nowrap",
          }}
        >
          {ct.chord}
        </span>
      ))}

      {/* Lyric text */}
      {variant === "color-fill" ? (
        <span style={{ position: "relative", display: "inline-block" }}>
          {/* Grey base */}
          <span style={{ ...sharedLyricStyle, color: "#F7F6E5" }}>{line.lyric}</span>
          {/* Color fill layer */}
          <span
            style={{
              ...sharedLyricStyle,
              color: lyricColor,
              position: "absolute",
              top: 0,
              left: 0,
              overflow: "hidden",
              width: `${fillPercent}%`,
            }}
          >
            {line.lyric}
          </span>
        </span>
      ) : (
        <span style={{ ...sharedLyricStyle, color: lyricColor }}>{line.lyric}</span>
      )}
    </div>
  );
}

export function LyricsWithChords({ overlay }: Props) {
  const frame = useCurrentFrame();
  const lines = overlay.chords ?? [];
  const overlayOpacity = overlay.opacity ?? 1;
  const align = overlay.font?.align ?? "center";
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
        alignItems: align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center",
        gap: 16,
      }}
    >
      {lines.map((line, i) => {
        const duration = line.durationInFrames ?? 90;
        const relFrame = frame - line.startFrame;
        if (relFrame < 0 || relFrame > duration) return null;

        return (
          <ChordLineRenderer
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
