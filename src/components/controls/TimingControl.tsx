"use client";

import { useState, useEffect } from "react";
import { useStudioStore } from "@/store/studioStore";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  overlayId: string;
}

export function framesToTime(frames: number, fps: number): string {
  const totalSec = frames / fps;
  const m = Math.floor(totalSec / 60);
  const s = Math.floor(totalSec % 60);
  const f = frames % fps;
  return `${m}:${String(s).padStart(2, "0")}.${String(f).padStart(2, "0")}`;
}

// User-friendly timestamp string — shows m:ss or Xs for sub-minute durations
function toDisplay(frames: number, fps: number): string {
  const totalSec = frames / fps;
  if (totalSec < 60) {
    // show as seconds with one decimal
    return `${totalSec.toFixed(1)}s`;
  }
  const m = Math.floor(totalSec / 60);
  const s = (totalSec % 60).toFixed(1);
  const sFull = Math.floor(totalSec % 60);
  const frac = Math.round((totalSec % 1) * 10);
  return `${m}:${String(sFull).padStart(2, "0")}.${frac}`;
}

export function parseTimestamp(input: string, fps: number): number | null {
  const t = input.trim().replace(/s$/i, "");

  // m:ss or m:ss.f
  const colonMatch = t.match(/^(\d+):(\d{1,2})(?:\.(\d))?$/);
  if (colonMatch) {
    const mins = parseInt(colonMatch[1]);
    const secs = parseInt(colonMatch[2]);
    const tenth = colonMatch[3] ? parseInt(colonMatch[3]) : 0;
    if (secs >= 60) return null;
    return Math.round((mins * 60 + secs + tenth / 10) * fps);
  }

  // plain number (seconds)
  const numMatch = t.match(/^(\d+(?:\.\d+)?)$/);
  if (numMatch) return Math.round(parseFloat(numMatch[1]) * fps);

  return null;
}

export function TimingControl({ overlayId }: Props) {
  const overlay = useStudioStore((s) => s.overlays.find((o) => o.id === overlayId));
  const durationInFrames = useStudioStore((s) => s.durationInFrames);
  const fps = useStudioStore((s) => s.template.fps);
  const updateOverlay = useStudioStore((s) => s.updateOverlay);

  const [startInput, setStartInput] = useState("");
  const [durInput, setDurInput] = useState("");

  // Sync inputs when overlay or fps changes
  useEffect(() => {
    if (!overlay) return;
    setStartInput(toDisplay(overlay.startFrame, fps));
    setDurInput(toDisplay(overlay.durationInFrames, fps));
  }, [overlay?.startFrame, overlay?.durationInFrames, fps, overlayId]);

  if (!overlay) return null;

  const startFrame = overlay.startFrame;
  const endFrame = startFrame + overlay.durationInFrames;

  function commitStart() {
    const f = parseTimestamp(startInput, fps);
    if (f !== null) {
      const clamped = Math.max(0, Math.min(durationInFrames, f));
      updateOverlay(overlayId, { startFrame: clamped });
    } else {
      setStartInput(toDisplay(overlay!.startFrame, fps));
    }
  }

  function commitDur() {
    const f = parseTimestamp(durInput, fps);
    if (f !== null && f >= 1) {
      updateOverlay(overlayId, { durationInFrames: f });
    } else {
      setDurInput(toDisplay(overlay!.durationInFrames, fps));
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-[10px] uppercase tracking-[0.2em] text-[#F7F6E5]" style={{ fontFamily: "Unbounded, sans-serif" }}>
        Timing
      </p>

      {/* Timeline slider */}
      <div className="space-y-2">
        <div className="flex justify-between text-[10px] text-[#F7F6E5]" style={{ fontFamily: "Outfit, sans-serif" }}>
          <span>{framesToTime(startFrame, fps)}</span>
          <span>{framesToTime(endFrame, fps)}</span>
        </div>
        <Slider
          min={0}
          max={durationInFrames}
          step={1}
          value={[startFrame, endFrame]}
          onValueChange={(vals) => {
            const [start, end] = vals as [number, number];
            updateOverlay(overlayId, {
              startFrame: start,
              durationInFrames: Math.max(1, end - start),
            });
          }}
          className="w-full"
        />
        <div className="flex justify-between text-[9px] text-[#333333]" style={{ fontFamily: "Outfit, sans-serif" }}>
          <span>0s</span>
          <span>{toDisplay(durationInFrames, fps)}</span>
        </div>
      </div>

      {/* Timestamp inputs */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-[10px] text-[#F7F6E5]" style={{ fontFamily: "Outfit, sans-serif" }}>
            Start
          </Label>
          <Input
            type="text"
            value={startInput}
            onChange={(e) => setStartInput(e.target.value)}
            onBlur={commitStart}
            onFocus={(e) => e.currentTarget.select()}
            onKeyDown={(e) => e.key === "Enter" && commitStart()}
            className="h-8 text-xs bg-[rgba(255,255,255,0.05)] border-[#333333] text-white"
            style={{ fontFamily: "Outfit, sans-serif" }}
          />
          <p className="text-[9px] text-[#333333]" style={{ fontFamily: "Outfit, sans-serif" }}>
            e.g. 0:30 or 5s
          </p>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] text-[#F7F6E5]" style={{ fontFamily: "Outfit, sans-serif" }}>
            Duration
          </Label>
          <Input
            type="text"
            value={durInput}
            onChange={(e) => setDurInput(e.target.value)}
            onBlur={commitDur}
            onFocus={(e) => e.currentTarget.select()}
            onKeyDown={(e) => e.key === "Enter" && commitDur()}
            className="h-8 text-xs bg-[rgba(255,255,255,0.05)] border-[#333333] text-white"
            style={{ fontFamily: "Outfit, sans-serif" }}
          />
          <p className="text-[9px] text-[#333333]" style={{ fontFamily: "Outfit, sans-serif" }}>
            e.g. 3s or 1:30
          </p>
        </div>
      </div>

      {/* Convenience: set to full duration */}
      <button
        className="text-[10px] text-[#F7F6E5] hover:text-[#ccff00] transition-colors"
        style={{ fontFamily: "Outfit, sans-serif" }}
        onClick={() => updateOverlay(overlayId, { startFrame: 0, durationInFrames })}
      >
        Set to full duration →
      </button>
    </div>
  );
}
