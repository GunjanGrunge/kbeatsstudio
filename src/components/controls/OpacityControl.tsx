"use client";

import { useStudioStore } from "@/store/studioStore";
import { Slider } from "@/components/ui/slider";

interface Props {
  overlayId: string;
}

export function OpacityControl({ overlayId }: Props) {
  const overlay = useStudioStore((s) => s.overlays.find((o) => o.id === overlayId));
  const updateOverlay = useStudioStore((s) => s.updateOverlay);

  if (!overlay) return null;

  const opacity = overlay.opacity ?? 1;

  return (
    <div className="space-y-4">
      <p className="text-[10px] uppercase tracking-[0.2em] text-[#F7F6E5]" style={{ fontFamily: "Unbounded, sans-serif" }}>
        Opacity
      </p>
      <div className="space-y-1.5">
        <div className="flex justify-between text-[10px] text-[#F7F6E5]" style={{ fontFamily: "Outfit, sans-serif" }}>
          <span>Opacity</span>
          <span>{Math.round(opacity * 100)}%</span>
        </div>
        <Slider
          min={0} max={1} step={0.01}
          value={[opacity]}
          onValueChange={(vals) => updateOverlay(overlayId, { opacity: (vals as number[])[0] })}
        />
      </div>
    </div>
  );
}
