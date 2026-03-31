"use client";

import { useStudioStore } from "@/store/studioStore";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";

interface Props {
  overlayId: string;
}

// 9 anchor positions
const ANCHORS = [
  { label: "TL", x: 10, y: 10 }, { label: "TC", x: 50, y: 10 }, { label: "TR", x: 90, y: 10 },
  { label: "ML", x: 10, y: 50 }, { label: "MC", x: 50, y: 50 }, { label: "MR", x: 90, y: 50 },
  { label: "BL", x: 10, y: 85 }, { label: "BC", x: 50, y: 85 }, { label: "BR", x: 90, y: 85 },
];

export function PositionControl({ overlayId }: Props) {
  const overlay = useStudioStore((s) => s.overlays.find((o) => o.id === overlayId));
  const updateOverlay = useStudioStore((s) => s.updateOverlay);

  if (!overlay) return null;

  const { x, y } = overlay.position;

  return (
    <div className="space-y-4">
      <p className="text-[10px] uppercase tracking-[0.2em] text-[#555555]" style={{ fontFamily: "Unbounded, sans-serif" }}>
        Position
      </p>

      {/* Quick anchor grid */}
      <div className="grid grid-cols-3 gap-1.5">
        {ANCHORS.map((anchor) => (
          <button
            key={anchor.label}
            className="h-8 rounded-lg text-[10px] transition-all duration-200 border"
            style={{
              fontFamily: "Outfit, sans-serif",
              background: Math.abs(x - anchor.x) < 5 && Math.abs(y - anchor.y) < 5
                ? "rgba(204,255,0,0.1)"
                : "rgba(255,255,255,0.03)",
              borderColor: Math.abs(x - anchor.x) < 5 && Math.abs(y - anchor.y) < 5
                ? "rgba(204,255,0,0.4)"
                : "rgba(255,255,255,0.06)",
              color: Math.abs(x - anchor.x) < 5 && Math.abs(y - anchor.y) < 5 ? "#ccff00" : "#666666",
            }}
            onClick={() => updateOverlay(overlayId, { position: { x: anchor.x, y: anchor.y } })}
          >
            {anchor.label}
          </button>
        ))}
      </div>

      {/* X slider */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[10px] text-[#555555]" style={{ fontFamily: "Outfit, sans-serif" }}>
          <span>X Position</span>
          <span>{Math.round(x)}%</span>
        </div>
        <Slider
          min={0} max={100} step={0.5}
          value={[x]}
          onValueChange={(vals) => updateOverlay(overlayId, { position: { x: (vals as number[])[0], y } })}
        />
      </div>

      {/* Y slider */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[10px] text-[#555555]" style={{ fontFamily: "Outfit, sans-serif" }}>
          <span>Y Position</span>
          <span>{Math.round(y)}%</span>
        </div>
        <Slider
          min={0} max={100} step={0.5}
          value={[y]}
          onValueChange={(vals) => updateOverlay(overlayId, { position: { x, y: (vals as number[])[0] } })}
        />
      </div>
    </div>
  );
}
