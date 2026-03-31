"use client";

import { useState } from "react";
import { useGoogleFonts } from "@/hooks/useGoogleFonts";
import { useStudioStore } from "@/store/studioStore";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import type { FontConfig } from "@/types/studio";
import { getFontWeights } from "@/lib/googleFonts";

interface Props {
  overlayId: string;
}

const WEIGHT_LABELS: Record<number, string> = {
  100: "Thin", 200: "ExtraLight", 300: "Light", 400: "Regular",
  500: "Medium", 600: "SemiBold", 700: "Bold", 800: "ExtraBold", 900: "Black",
};

export function FontPicker({ overlayId }: Props) {
  const overlay = useStudioStore((s) => s.overlays.find((o) => o.id === overlayId));
  const updateOverlay = useStudioStore((s) => s.updateOverlay);
  const { fonts, loading, search, setSearch, loadFont } = useGoogleFonts();
  const [showList, setShowList] = useState(false);

  if (!overlay) return null;

  const font: FontConfig = overlay.font ?? {
    family: "Outfit",
    weight: 700,
    size: 52,
    letterSpacing: 0,
    lineHeight: 1.3,
    align: "center",
  };

  const updateFont = (patch: Partial<FontConfig>) => {
    updateOverlay(overlayId, { font: { ...font, ...patch } });
  };

  const selectedFont = fonts.find((f) => f.family === font.family) ?? null;
  const availableWeights = selectedFont != null ? getFontWeights(selectedFont) : [400, 700];

  const handleFontSelect = (family: string) => {
    loadFont(family, [300, 400, 700, 900]);
    updateFont({ family });
    setShowList(false);
    setSearch("");
  };

  return (
    <div className="space-y-4">
      <p className="text-[10px] uppercase tracking-[0.2em] text-[#555555]" style={{ fontFamily: "Unbounded, sans-serif" }}>
        Typography
      </p>

      {/* Font family selector */}
      <div className="space-y-1.5">
        <p className="text-[10px] text-[#555555]" style={{ fontFamily: "Outfit, sans-serif" }}>Font Family</p>
        <button
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[#333333] text-white text-xs transition-colors hover:border-[#ccff00]"
          style={{ fontFamily: font.family + ", sans-serif" }}
          onClick={() => setShowList((v) => !v)}
        >
          <span>{font.family}</span>
          <span className="text-[#555555] text-[10px]">▾</span>
        </button>

        {showList && (
          <div className="rounded-xl border border-[#333333] overflow-hidden" style={{ background: "#141414" }}>
            {/* Search */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-[#222222]">
              <Search size={12} className="text-[#555555] shrink-0" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search fonts..."
                className="flex-1 text-xs text-white bg-transparent outline-none placeholder-[#444444]"
                style={{ fontFamily: "Outfit, sans-serif" }}
              />
            </div>
            {/* Font list */}
            <ScrollArea className="h-48">
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <div className="w-4 h-4 border-2 border-[#ccff00] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="py-1">
                  {fonts.slice(0, 80).map((f) => (
                    <button
                      key={f.family}
                      className="w-full px-3 py-2 text-left text-xs transition-colors hover:bg-[rgba(255,255,255,0.04)]"
                      style={{
                        fontFamily: `${f.family}, sans-serif`,
                        color: f.family === font.family ? "#ccff00" : "#aaaaaa",
                        background: f.family === font.family ? "rgba(204,255,0,0.05)" : undefined,
                      }}
                      onClick={() => handleFontSelect(f.family)}
                    >
                      {f.family}
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        )}
      </div>

      {/* Font weight */}
      <div className="space-y-1.5">
        <p className="text-[10px] text-[#555555]" style={{ fontFamily: "Outfit, sans-serif" }}>Weight</p>
        <div className="flex flex-wrap gap-1">
          {availableWeights.map((w) => (
            <button
              key={w}
              className="px-2 py-1 rounded text-[10px] transition-all duration-150 border"
              style={{
                fontFamily: "Outfit, sans-serif",
                fontWeight: w,
                background: font.weight === w ? "rgba(204,255,0,0.1)" : "rgba(255,255,255,0.03)",
                borderColor: font.weight === w ? "rgba(204,255,0,0.4)" : "rgba(255,255,255,0.06)",
                color: font.weight === w ? "#ccff00" : "#666666",
              }}
              onClick={() => updateFont({ weight: w })}
            >
              {WEIGHT_LABELS[w] ?? w}
            </button>
          ))}
        </div>
      </div>

      {/* Font size */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[10px] text-[#555555]" style={{ fontFamily: "Outfit, sans-serif" }}>
          <span>Size</span>
          <span>{font.size}px</span>
        </div>
        <Slider
          min={12} max={200} step={2}
          value={[font.size]}
          onValueChange={(vals) => updateFont({ size: (vals as number[])[0] })}
        />
      </div>

      {/* Letter spacing */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[10px] text-[#555555]" style={{ fontFamily: "Outfit, sans-serif" }}>
          <span>Letter Spacing</span>
          <span>{font.letterSpacing}px</span>
        </div>
        <Slider
          min={-5} max={30} step={0.5}
          value={[font.letterSpacing]}
          onValueChange={(vals) => updateFont({ letterSpacing: (vals as number[])[0] })}
        />
      </div>

      {/* Line height */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[10px] text-[#555555]" style={{ fontFamily: "Outfit, sans-serif" }}>
          <span>Line Height</span>
          <span>{font.lineHeight.toFixed(1)}</span>
        </div>
        <Slider
          min={0.8} max={3} step={0.05}
          value={[font.lineHeight]}
          onValueChange={(vals) => updateFont({ lineHeight: (vals as number[])[0] })}
        />
      </div>

      {/* Alignment */}
      <div className="space-y-1.5">
        <p className="text-[10px] text-[#555555]" style={{ fontFamily: "Outfit, sans-serif" }}>Alignment</p>
        <div className="flex gap-1">
          {(["left", "center", "right"] as const).map((align) => {
            const Icon = align === "left" ? AlignLeft : align === "center" ? AlignCenter : AlignRight;
            return (
              <button
                key={align}
                className="flex-1 flex items-center justify-center h-8 rounded-lg border transition-all duration-150"
                style={{
                  background: font.align === align ? "rgba(204,255,0,0.1)" : "rgba(255,255,255,0.03)",
                  borderColor: font.align === align ? "rgba(204,255,0,0.4)" : "rgba(255,255,255,0.06)",
                  color: font.align === align ? "#ccff00" : "#666666",
                }}
                onClick={() => updateFont({ align })}
              >
                <Icon size={13} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
