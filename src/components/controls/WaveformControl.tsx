"use client";

import { useStudioStore } from "@/store/studioStore";
import { Slider } from "@/components/ui/slider";
import { HexColorPicker } from "react-colorful";
import { useState } from "react";

interface Props {
  overlayId: string;
}

const PRESET_COLORS = ["#ccff00", "#ffffff", "#ff006e", "#3a86ff", "#06ffa5", "#ffbe0b", "#8338ec"];

export function WaveformControl({ overlayId }: Props) {
  const overlay = useStudioStore((s) => s.overlays.find((o) => o.id === overlayId));
  const updateOverlay = useStudioStore((s) => s.updateOverlay);
  const [showPicker, setShowPicker] = useState(false);

  if (!overlay) return null;

  const color = overlay.waveformColor ?? "#ccff00";
  const bars = overlay.waveformBars ?? 64;

  return (
    <div className="space-y-4">
      <p className="text-[10px] uppercase tracking-[0.2em] text-[#555555]" style={{ fontFamily: "Unbounded, sans-serif" }}>
        Waveform
      </p>

      {/* Bar count */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[10px] text-[#555555]" style={{ fontFamily: "Outfit, sans-serif" }}>
          <span>Bars</span>
          <span>{bars}</span>
        </div>
        <Slider
          min={16} max={128} step={4}
          value={[bars]}
          onValueChange={(vals) => updateOverlay(overlayId, { waveformBars: (vals as number[])[0] })}
        />
      </div>

      {/* Color */}
      <div className="space-y-2">
        <p className="text-[10px] text-[#555555]" style={{ fontFamily: "Outfit, sans-serif" }}>Bar Color</p>
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
            className="w-7 h-7 rounded-lg border border-[rgba(255,255,255,0.1)] flex items-center justify-center text-[10px] text-[#888888]"
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
