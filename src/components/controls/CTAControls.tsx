"use client";

import { useStudioStore } from "@/store/studioStore";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

interface Props {
  overlayId: string;
}

function ScaleControl({ overlayId }: { overlayId: string }) {
  const overlay = useStudioStore((s) => s.overlays.find((o) => o.id === overlayId));
  const updateOverlay = useStudioStore((s) => s.updateOverlay);
  if (!overlay) return null;
  const scale = overlay.componentScale ?? 1;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[10px] text-[#555555]" style={{ fontFamily: "Outfit, sans-serif" }}>
        <span>Size</span>
        <span>{Math.round(scale * 100)}%</span>
      </div>
      <Slider
        min={0.2} max={3} step={0.05}
        value={[scale]}
        onValueChange={(vals) => updateOverlay(overlayId, { componentScale: (vals as number[])[0] })}
      />
      <div className="flex gap-1.5 mt-1">
        {[0.5, 0.75, 1, 1.5, 2].map((v) => (
          <button
            key={v}
            className="flex-1 py-1 rounded text-[10px] transition-all duration-150 border"
            style={{
              fontFamily: "Outfit, sans-serif",
              background: Math.abs(scale - v) < 0.03 ? "rgba(204,255,0,0.1)" : "rgba(255,255,255,0.03)",
              borderColor: Math.abs(scale - v) < 0.03 ? "rgba(204,255,0,0.4)" : "rgba(255,255,255,0.06)",
              color: Math.abs(scale - v) < 0.03 ? "#ccff00" : "#666666",
            }}
            onClick={() => updateOverlay(overlayId, { componentScale: v })}
          >
            {v === 1 ? "1×" : `${v}×`}
          </button>
        ))}
      </div>
    </div>
  );
}

export function CTAControls({ overlayId }: Props) {
  const overlay = useStudioStore((s) => s.overlays.find((o) => o.id === overlayId));
  const updateOverlay = useStudioStore((s) => s.updateOverlay);

  if (!overlay) return null;

  if (overlay.type === "yt-subscribe") {
    return (
      <div className="space-y-3">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#555555]" style={{ fontFamily: "Unbounded, sans-serif" }}>
          Subscribe CTA
        </p>
        <div className="space-y-1">
          <Label className="text-[10px] text-[#555555]" style={{ fontFamily: "Outfit, sans-serif" }}>Channel Name</Label>
          <Input
            value={overlay.channelName ?? ""}
            onChange={(e) => updateOverlay(overlayId, { channelName: e.target.value })}
            placeholder="KBeats"
            className="h-8 text-xs bg-[rgba(255,255,255,0.05)] border-[#333333] text-white"
            style={{ fontFamily: "Outfit, sans-serif" }}
          />
        </div>
        <ScaleControl overlayId={overlayId} />
      </div>
    );
  }

  if (overlay.type === "yt-like") {
    return (
      <div className="space-y-3">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#555555]" style={{ fontFamily: "Unbounded, sans-serif" }}>
          Like CTA
        </p>
        <ScaleControl overlayId={overlayId} />
      </div>
    );
  }

  if (overlay.type === "ig-follow") {
    return (
      <div className="space-y-3">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#555555]" style={{ fontFamily: "Unbounded, sans-serif" }}>
          Instagram Follow
        </p>
        <div className="space-y-1">
          <Label className="text-[10px] text-[#555555]" style={{ fontFamily: "Outfit, sans-serif" }}>Username</Label>
          <Input
            value={overlay.username ?? ""}
            onChange={(e) => updateOverlay(overlayId, { username: e.target.value })}
            placeholder="@kbeats"
            className="h-8 text-xs bg-[rgba(255,255,255,0.05)] border-[#333333] text-white"
            style={{ fontFamily: "Outfit, sans-serif" }}
          />
        </div>
        <ScaleControl overlayId={overlayId} />
      </div>
    );
  }

  if (overlay.type === "text") {
    return (
      <div className="space-y-3">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#555555]" style={{ fontFamily: "Unbounded, sans-serif" }}>
          Text Content
        </p>
        <div className="space-y-1">
          <Label className="text-[10px] text-[#555555]" style={{ fontFamily: "Outfit, sans-serif" }}>Text</Label>
          <textarea
            value={overlay.text ?? ""}
            onChange={(e) => updateOverlay(overlayId, { text: e.target.value })}
            placeholder="Your text here"
            rows={3}
            className="w-full rounded-lg px-3 py-2 text-xs text-white outline-none resize-none"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid #333333",
              fontFamily: "Outfit, sans-serif",
              lineHeight: 1.6,
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#ccff00")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#333333")}
          />
        </div>
      </div>
    );
  }

  return null;
}
