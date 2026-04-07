"use client";

import { useStudioStore } from "@/store/studioStore";
import { Slider } from "@/components/ui/slider";
import { HexColorPicker } from "react-colorful";
import { useState } from "react";

interface Props {
  overlayId: string;
}

type WaveformStyle = "bars" | "wave" | "circular" | "particles" | "oscilloscope";

const STYLES: {
  value: WaveformStyle;
  label: string;
  icon: React.ReactNode;
  description: string;
}[] = [
  {
    value: "bars",
    label: "Spectrum",
    description: "Frequency bars",
    icon: (
      <svg width="36" height="22" viewBox="0 0 36 22">
        {[3, 6, 14, 10, 18, 8, 12, 5].map((h, i) => (
          <rect key={i} x={i * 4 + 1} y={22 - h} width={3} height={h} rx={1.5} fill="currentColor" />
        ))}
      </svg>
    ),
  },
  {
    value: "wave",
    label: "Wave",
    description: "Amplitude wave",
    icon: (
      <svg width="36" height="22" viewBox="0 0 36 22">
        <path
          d="M0,11 C3,4 6,18 9,11 C12,4 15,18 18,11 C21,4 24,18 27,11 C30,4 33,18 36,11"
          fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    value: "circular",
    label: "Radial",
    description: "Circular visualizer",
    icon: (
      <svg width="36" height="22" viewBox="0 0 36 22">
        <circle cx="18" cy="11" r="5" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
          const r = Math.PI * deg / 180;
          const h = 3 + (i % 3) * 2;
          return (
            <line
              key={i}
              x1={18 + Math.cos(r) * 5} y1={11 + Math.sin(r) * 5}
              x2={18 + Math.cos(r) * (5 + h)} y2={11 + Math.sin(r) * (5 + h)}
              stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
            />
          );
        })}
      </svg>
    ),
  },
  {
    value: "particles",
    label: "Particles",
    description: "Pulse visualizer",
    icon: (
      <svg width="36" height="22" viewBox="0 0 36 22">
        {[
          [5, 14, 2.5], [10, 8, 1.5], [15, 16, 2], [20, 6, 3],
          [25, 12, 1.5], [30, 9, 2.5], [33, 15, 1.5],
        ].map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} fill="currentColor" opacity={0.85} />
        ))}
        <line x1="5" y1="14" x2="10" y2="8" stroke="currentColor" strokeWidth="0.7" opacity="0.3" />
        <line x1="10" y1="8" x2="15" y2="16" stroke="currentColor" strokeWidth="0.7" opacity="0.3" />
        <line x1="15" y1="16" x2="20" y2="6" stroke="currentColor" strokeWidth="0.7" opacity="0.3" />
        <line x1="20" y1="6" x2="25" y2="12" stroke="currentColor" strokeWidth="0.7" opacity="0.3" />
        <line x1="25" y1="12" x2="30" y2="9" stroke="currentColor" strokeWidth="0.7" opacity="0.3" />
      </svg>
    ),
  },
  {
    value: "oscilloscope",
    label: "Scope",
    description: "Oscilloscope",
    icon: (
      <svg width="36" height="22" viewBox="0 0 36 22">
        <line x1="0" y1="11" x2="36" y2="11" stroke="currentColor" strokeWidth="0.6" opacity="0.25" />
        <polyline
          points="0,11 4,6 8,16 12,5 16,14 20,8 24,15 28,7 32,13 36,11"
          fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
        />
        <circle cx="20" cy="8" r="2" fill="currentColor" />
      </svg>
    ),
  },
];

const PRESET_COLORS = ["#ccff00", "#ffffff", "#ff006e", "#3a86ff", "#06ffa5", "#ffbe0b", "#8338ec"];

export function WaveformControl({ overlayId }: Props) {
  const overlay = useStudioStore((s) => s.overlays.find((o) => o.id === overlayId));
  const updateOverlay = useStudioStore((s) => s.updateOverlay);
  const [showPicker, setShowPicker] = useState(false);

  if (!overlay) return null;

  const color = overlay.waveformColor ?? "#ccff00";
  const bars = overlay.waveformBars ?? 64;
  const activeStyle = overlay.waveformStyle ?? "bars";

  return (
    <div className="space-y-5">
      <p className="text-[10px] uppercase tracking-[0.2em] text-[#F7F6E5]" style={{ fontFamily: "Unbounded, sans-serif" }}>
        Visualizer
      </p>

      {/* ── Style picker ── */}
      <div className="space-y-2">
        <p className="text-[10px] text-[#F7F6E5]" style={{ fontFamily: "Outfit, sans-serif" }}>Style</p>
        <div className="grid grid-cols-5 gap-1.5">
          {STYLES.map((s) => {
            const isActive = activeStyle === s.value;
            return (
              <button
                key={s.value}
                onClick={() => updateOverlay(overlayId, { waveformStyle: s.value })}
                className="flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-xl transition-all duration-150"
                style={{
                  background: isActive ? "rgba(204,255,0,0.08)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${isActive ? "rgba(204,255,0,0.4)" : "rgba(255,255,255,0.06)"}`,
                  color: isActive ? "#ccff00" : "#555555",
                  boxShadow: isActive ? "0 0 12px rgba(204,255,0,0.1)" : undefined,
                }}
                title={s.description}
              >
                {s.icon}
                <span
                  className="text-[8px] leading-none"
                  style={{
                    fontFamily: "Outfit, sans-serif",
                    color: isActive ? "#ccff00" : "#555555",
                    fontWeight: isActive ? 600 : 400,
                  }}
                >
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Bar / sample count — must be a power of 2 for visualizeAudio ── */}
      <div className="space-y-2">
        <div className="flex justify-between text-[10px] text-[#F7F6E5]" style={{ fontFamily: "Outfit, sans-serif" }}>
          <span>{activeStyle === "particles" ? "Particles" : activeStyle === "oscilloscope" ? "Samples" : activeStyle === "circular" ? "Spokes" : "Bars"}</span>
          <span>{bars}</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {([16, 32, 64, 128] as const).map((v) => (
            <button
              key={v}
              onClick={() => updateOverlay(overlayId, { waveformBars: v })}
              className="py-1.5 rounded-lg text-[10px] transition-all duration-150"
              style={{
                background: bars === v ? "rgba(204,255,0,0.08)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${bars === v ? "rgba(204,255,0,0.4)" : "rgba(255,255,255,0.06)"}`,
                color: bars === v ? "#ccff00" : "#555555",
                fontFamily: "Outfit, sans-serif",
                fontWeight: bars === v ? 600 : 400,
              }}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* ── Color ── */}
      <div className="space-y-2">
        <p className="text-[10px] text-[#F7F6E5]" style={{ fontFamily: "Outfit, sans-serif" }}>Color</p>
        <div className="flex gap-1.5 flex-wrap">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              className="w-7 h-7 rounded-lg transition-transform hover:scale-110"
              style={{
                background: c,
                border: c === color ? "2px solid #ccff00" : "1px solid rgba(255,255,255,0.1)",
                boxShadow: c === color ? `0 0 12px ${c}80` : undefined,
              }}
              onClick={() => updateOverlay(overlayId, { waveformColor: c })}
            />
          ))}
          <button
            className="w-7 h-7 rounded-lg border border-[rgba(255,255,255,0.1)] flex items-center justify-center text-[10px] text-[#F7F6E5] hover:text-white transition-colors"
            onClick={() => setShowPicker((v) => !v)}
          >
            +
          </button>
        </div>

        {showPicker && (
          <div className="rounded-xl overflow-hidden border border-[#333333]">
            <HexColorPicker
              color={color}
              onChange={(c) => updateOverlay(overlayId, { waveformColor: c })}
              style={{ width: "100%" }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
