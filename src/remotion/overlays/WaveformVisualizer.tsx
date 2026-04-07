import { useCurrentFrame, useVideoConfig, interpolate, delayRender, continueRender } from "remotion";
import { getAudioData, visualizeAudio } from "@remotion/media-utils";
import type { AudioData } from "@remotion/media-utils";
import { useState, useEffect, useRef } from "react";
import type { OverlayConfig } from "@/types/studio";

interface Props {
  overlay: OverlayConfig;
  audioSrc: string;
}

/* ─────────────────────────────────────────
   1. BARS — spectrum analyser (original)
───────────────────────────────────────── */
function BarsVisualizer({
  frequencies, color, w, h,
}: { frequencies: number[]; color: string; w: number; h: number }) {
  const bars = frequencies.length;
  const barW = (w / bars) * 0.65;
  const gap = w / bars;
  // overflow hidden prevents the reflection rect from painting outside the overlay bounds
  return (
    <svg width={w} height={h} style={{ overflow: "hidden" }}>
      {frequencies.map((freq, i) => {
        const barH = Math.max(3, freq * h);
        const x = i * gap + (gap - barW) / 2;
        const y = h - barH;
        const glow = Math.round(freq * 14);
        // Reflection capped at h * 0.15 so it fits inside the SVG viewport
        const reflH = Math.min(barH * 0.3, h * 0.15);
        return (
          <g key={i}>
            <rect
              x={x} y={y} width={barW} height={barH}
              rx={barW / 2}
              fill={color}
              style={{ filter: `drop-shadow(0 0 ${glow}px ${color})` }}
            />
            {/* Reflection — positioned just below the bar, within SVG bounds */}
            <rect
              x={x} y={h - reflH} width={barW} height={reflH}
              rx={barW / 2}
              fill={color}
              opacity={0.18}
            />
          </g>
        );
      })}
    </svg>
  );
}

/* ─────────────────────────────────────────
   2. WAVE — classic amplitude wave (smooth SVG path)
───────────────────────────────────────── */
function WaveVisualizer({
  frequencies, color, w, h,
}: { frequencies: number[]; color: string; w: number; h: number }) {
  const bars = frequencies.length;
  // Need at least 2 points to avoid (bars - 1) = 0 division producing NaN coords
  if (bars <= 1) return null;

  const midY = h / 2;

  // Build smooth cubic bezier path through points
  const points = frequencies.map((freq, i) => {
    const x = (i / (bars - 1)) * w;
    const amp = freq * (h / 2) * 0.9;
    // alternate above/below for wave feel
    const y = midY + (i % 2 === 0 ? -amp : amp);
    return { x, y };
  });

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpX = (prev.x + curr.x) / 2;
    d += ` C ${cpX} ${prev.y}, ${cpX} ${curr.y}, ${curr.x} ${curr.y}`;
  }

  // Close the fill by returning along the midline — creates a non-self-intersecting band
  const dMirror = ` L ${w} ${midY} L 0 ${midY} Z`;

  const maxFreq = Math.max(...frequencies);
  const glowIntensity = Math.round(maxFreq * 18);

  return (
    <svg width={w} height={h} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="waveGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.03" />
        </linearGradient>
      </defs>
      {/* Fill area */}
      <path d={d + dMirror} fill="url(#waveGrad)" />
      {/* Main line */}
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 ${glowIntensity}px ${color})` }}
      />
    </svg>
  );
}

/* ─────────────────────────────────────────
   3. CIRCULAR — radial bars emanating from centre
───────────────────────────────────────── */
function CircularVisualizer({
  frequencies, color, size,
}: { frequencies: number[]; color: string; size: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const innerR = size * 0.22;
  const maxBarH = size * 0.26;
  const bars = frequencies.length;

  return (
    <svg width={size} height={size} style={{ overflow: "visible" }}>
      <defs>
        <radialGradient id="circleCore" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Pulsing core circle */}
      <circle
        cx={cx} cy={cy}
        r={innerR * (0.85 + Math.max(...frequencies) * 0.25)}
        fill="url(#circleCore)"
      />
      <circle
        cx={cx} cy={cy} r={innerR}
        fill="none" stroke={color} strokeWidth={1.5} opacity={0.5}
      />
      {/* Radial bars */}
      {frequencies.map((freq, i) => {
        const angle = (i / bars) * Math.PI * 2 - Math.PI / 2;
        const barH = Math.max(3, freq * maxBarH);
        const x1 = cx + Math.cos(angle) * innerR;
        const y1 = cy + Math.sin(angle) * innerR;
        const x2 = cx + Math.cos(angle) * (innerR + barH);
        const y2 = cy + Math.sin(angle) * (innerR + barH);
        const barW = Math.max(1.5, (2 * Math.PI * innerR / bars) * 0.6);
        const glow = Math.round(freq * 12);
        return (
          <line
            key={i}
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={color}
            strokeWidth={barW}
            strokeLinecap="round"
            style={{ filter: freq > 0.5 ? `drop-shadow(0 0 ${glow}px ${color})` : undefined }}
          />
        );
      })}
    </svg>
  );
}

/* ─────────────────────────────────────────
   4. PARTICLES — dots that jump with bass
───────────────────────────────────────── */
function ParticlesVisualizer({
  frequencies, color, w, h, frame,
}: { frequencies: number[]; color: string; w: number; h: number; frame: number }) {
  const bars = frequencies.length;
  // Use a seeded layout so particles don't jump on re-render
  const particles = frequencies.map((freq, i) => {
    // Knuth multiplicative hash — evenly distributes across [0, 1) unlike linear % 1
    const seed = ((i * 2654435761) >>> 0) / 0xFFFFFFFF;
    const baseX = (i / bars) * w;
    const baseY = h * 0.5 + (seed - 0.5) * h * 0.4;
    const jumpY = freq * h * 0.7;
    const size = 3 + freq * 10;
    const glow = Math.round(freq * 16);
    // Orbit drift
    const drift = Math.sin(frame * 0.04 + i * 0.6) * 4;
    return { x: baseX + drift, y: baseY - jumpY, size, glow, freq };
  });

  return (
    <svg width={w} height={h} style={{ overflow: "visible" }}>
      {particles.map((p, i) => (
        <g key={i}>
          {/* Glow halo */}
          {p.freq > 0.3 && (
            <circle
              cx={p.x} cy={p.y} r={p.size * 2.5}
              fill={color} opacity={p.freq * 0.12}
            />
          )}
          {/* Core dot */}
          <circle
            cx={p.x} cy={p.y} r={p.size / 2}
            fill={color}
            style={{ filter: p.freq > 0.4 ? `drop-shadow(0 0 ${p.glow}px ${color})` : undefined }}
          />
        </g>
      ))}
      {/* Connecting lines between close neighbours */}
      {particles.map((p, i) => {
        if (i === 0) return null;
        const prev = particles[i - 1];
        const dist = Math.hypot(p.x - prev.x, p.y - prev.y);
        if (dist > 60) return null;
        const lineOpacity = (1 - dist / 60) * 0.3 * Math.max(p.freq, prev.freq);
        return (
          <line
            key={`l${i}`}
            x1={prev.x} y1={prev.y} x2={p.x} y2={p.y}
            stroke={color} strokeWidth={0.8} opacity={lineOpacity}
          />
        );
      })}
    </svg>
  );
}

/* ─────────────────────────────────────────
   5. OSCILLOSCOPE — raw waveform line
───────────────────────────────────────── */
function OscilloscopeVisualizer({
  frequencies, color, w, h,
}: { frequencies: number[]; color: string; w: number; h: number }) {
  const bars = frequencies.length;
  // Need at least 2 points to avoid (bars - 1) = 0 division producing NaN coords
  if (bars <= 1) return null;

  const midY = h / 2;

  // Oscilloscope: treat frequency bins as amplitude samples across time
  const points = frequencies.map((freq, i) => {
    const x = (i / (bars - 1)) * w;
    // Centre around midY, oscillate using the raw value as bipolar signal
    const bipolar = (freq - 0.5) * 2; // convert 0-1 → -1 to 1
    const y = midY + bipolar * midY * 0.85;
    return `${x},${y}`;
  });

  const maxFreq = Math.max(...frequencies);

  return (
    <svg width={w} height={h} style={{ overflow: "visible" }}>
      {/* Grid lines */}
      {[0.25, 0.5, 0.75].map((frac) => (
        <line
          key={frac}
          x1={0} y1={h * frac} x2={w} y2={h * frac}
          stroke={color} strokeWidth={0.5} opacity={0.12}
        />
      ))}
      <line x1={0} y1={midY} x2={w} y2={midY} stroke={color} strokeWidth={0.8} opacity={0.2} />
      {/* Glow duplicate */}
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.08}
      />
      {/* Main line */}
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 ${Math.round(maxFreq * 16)}px ${color})` }}
      />
      {/* Scan dot at peak frequency bin */}
      {(() => {
        const peak = frequencies.reduce((mi, v, i) => v > frequencies[mi] ? i : mi, 0);
        const px = (peak / (bars - 1)) * w;
        const bip = (frequencies[peak] - 0.5) * 2;
        const py = midY + bip * midY * 0.85;
        return (
          <circle cx={px} cy={py} r={4} fill={color}
            style={{ filter: `drop-shadow(0 0 8px ${color})` }} />
        );
      })()}
    </svg>
  );
}

/* ─────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────── */
/** Snap n to the nearest power of 2 — required by visualizeAudio. Minimum 16. */
function nearestPow2(n: number): number {
  return Math.pow(2, Math.round(Math.log2(Math.max(16, n))));
}

/** Route private S3 URLs through the media proxy to avoid 403 errors */
function toProxiedUrl(src: string): string {
  const match = src.match(/\.amazonaws\.com\/(.+)/);
  if (match) return `/api/s3/media?key=${encodeURIComponent(match[1])}`;
  return src;
}

/**
 * Safe replacement for useAudioData: uses delayRender/continueRender so Lambda
 * rendering waits for audio, but calls continueRender (not cancelRender) on
 * failure — so a 403 or network error shows flat bars instead of crashing the Player.
 */
function useSafeAudioData(src: string): AudioData | null {
  const [audioData, setAudioData] = useState<AudioData | null>(null);
  const handleRef = useRef<number | null>(null);

  useEffect(() => {
    // Create a new delay handle each time src changes
    const handle = delayRender(`Loading audio for waveform: ${src}`);
    handleRef.current = handle;

    getAudioData(src)
      .then((data) => {
        setAudioData(data);
        continueRender(handle);
      })
      .catch(() => {
        // On error (e.g. 403 private S3, network failure): show flat waveform,
        // do NOT call cancelRender — that would crash the Remotion Player.
        setAudioData(null);
        continueRender(handle);
      });

    return () => {
      // If the component unmounts before the fetch completes, still release the handle
      if (handleRef.current === handle) {
        continueRender(handle);
      }
    };
  }, [src]);

  return audioData;
}

export function WaveformVisualizer({ overlay, audioSrc }: Props) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Route private S3 URLs through the proxy so the fetch works from the browser
  const proxiedSrc = toProxiedUrl(audioSrc);
  const audioData = useSafeAudioData(proxiedSrc);

  // visualizeAudio requires numberOfSamples to be a power of 2 (16, 32, 64, 128…)
  const bars = nearestPow2(overlay.waveformBars ?? 64);
  const color = overlay.waveformColor ?? "#ccff00";
  const opacity = overlay.opacity ?? 0.85;
  const style = overlay.waveformStyle ?? "bars";

  // frame is relative to the Sequence start; audio position needs the absolute frame
  const audioFrame = frame + overlay.startFrame;

  const fadeIn = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [overlay.durationInFrames - 8, overlay.durationInFrames], [1, 0], { extrapolateLeft: "clamp" });
  const alpha = Math.min(fadeIn, fadeOut) * opacity;

  const frequencies = audioData
    ? visualizeAudio({ fps, frame: audioFrame, audioData, numberOfSamples: bars })
    : new Array(bars).fill(0.05);

  // Dimensions vary by style
  const isCircular = style === "circular";
  const circSize = 300;
  const rectW = 600;
  const rectH = style === "oscilloscope" ? 100 : style === "wave" ? 90 : 80;

  return (
    <div
      style={{
        position: "absolute",
        left: `${overlay.position.x}%`,
        top: `${overlay.position.y}%`,
        transform: "translate(-50%, -50%)",
        opacity: alpha,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: isCircular ? circSize : rectW,
        height: isCircular ? circSize : rectH,
      }}
    >
      {style === "bars" && (
        <BarsVisualizer frequencies={frequencies} color={color} w={rectW} h={rectH} />
      )}
      {style === "wave" && (
        <WaveVisualizer frequencies={frequencies} color={color} w={rectW} h={rectH} />
      )}
      {style === "circular" && (
        <CircularVisualizer frequencies={frequencies} color={color} size={circSize} />
      )}
      {style === "particles" && (
        <ParticlesVisualizer frequencies={frequencies} color={color} w={rectW} h={rectH} frame={frame} />
      )}
      {style === "oscilloscope" && (
        <OscilloscopeVisualizer frequencies={frequencies} color={color} w={rectW} h={rectH} />
      )}
    </div>
  );
}
