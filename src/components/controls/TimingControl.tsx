"use client";

import { useStudioStore } from "@/store/studioStore";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  overlayId: string;
}

function framesToTime(frames: number, fps: number): string {
  const totalSec = frames / fps;
  const m = Math.floor(totalSec / 60);
  const s = Math.floor(totalSec % 60);
  const f = frames % fps;
  return `${m}:${String(s).padStart(2, "0")}.${String(f).padStart(2, "0")}`;
}

export function TimingControl({ overlayId }: Props) {
  const overlay = useStudioStore((s) => s.overlays.find((o) => o.id === overlayId));
  const durationInFrames = useStudioStore((s) => s.durationInFrames);
  const fps = useStudioStore((s) => s.template.fps);
  const updateOverlay = useStudioStore((s) => s.updateOverlay);

  if (!overlay) return null;

  const startFrame = overlay.startFrame;
  const endFrame = startFrame + overlay.durationInFrames;

  return (
    <div className="space-y-4">
      <p className="text-[10px] uppercase tracking-[0.2em] text-[#555555]" style={{ fontFamily: "Unbounded, sans-serif" }}>
        Timing
      </p>

      {/* Timeline slider */}
      <div className="space-y-2">
        <div className="flex justify-between text-[10px] text-[#555555]" style={{ fontFamily: "Outfit, sans-serif" }}>
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
          <span>0</span>
          <span>{durationInFrames}f</span>
        </div>
      </div>

      {/* Numeric inputs */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-[10px] text-[#555555]" style={{ fontFamily: "Outfit, sans-serif" }}>
            Start (frame)
          </Label>
          <Input
            type="number"
            min={0}
            max={durationInFrames}
            value={startFrame}
            onChange={(e) => {
              const val = Math.max(0, Math.min(durationInFrames, parseInt(e.target.value) || 0));
              updateOverlay(overlayId, { startFrame: val });
            }}
            className="h-8 text-xs bg-[rgba(255,255,255,0.05)] border-[#333333] text-white"
            style={{ fontFamily: "Outfit, sans-serif" }}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] text-[#555555]" style={{ fontFamily: "Outfit, sans-serif" }}>
            Duration (frames)
          </Label>
          <Input
            type="number"
            min={1}
            max={durationInFrames}
            value={overlay.durationInFrames}
            onChange={(e) => {
              const val = Math.max(1, parseInt(e.target.value) || 1);
              updateOverlay(overlayId, { durationInFrames: val });
            }}
            className="h-8 text-xs bg-[rgba(255,255,255,0.05)] border-[#333333] text-white"
            style={{ fontFamily: "Outfit, sans-serif" }}
          />
        </div>
      </div>

      {/* Convenience: set to full duration */}
      <button
        className="text-[10px] text-[#555555] hover:text-[#ccff00] transition-colors"
        style={{ fontFamily: "Outfit, sans-serif" }}
        onClick={() => updateOverlay(overlayId, { startFrame: 0, durationInFrames })}
      >
        Set to full duration →
      </button>
    </div>
  );
}
