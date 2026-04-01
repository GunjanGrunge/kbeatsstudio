"use client";

import { useState } from "react";
import { HexColorPicker } from "react-colorful";
import { useStudioStore } from "@/store/studioStore";
import { COLOR_PALETTES, TAILWIND_SWATCHES } from "@/lib/colorPalettes";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ChevronDown } from "lucide-react";

interface Props {
  overlayId: string;
}

function isValidHex(h: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(h);
}

export function ColorPickerControl({ overlayId }: Props) {
  const overlay = useStudioStore((s) => s.overlays.find((o) => o.id === overlayId));
  const updateOverlay = useStudioStore((s) => s.updateOverlay);
  const [hexInput, setHexInput] = useState(overlay?.color ?? "#ffffff");
  const [showPicker, setShowPicker] = useState(false);

  if (!overlay) return null;

  const color = overlay.color ?? "#ffffff";

  const handleColorChange = (newColor: string) => {
    setHexInput(newColor);
    updateOverlay(overlayId, { color: newColor });
  };

  const handleHexInput = (val: string) => {
    setHexInput(val);
    if (isValidHex(val)) updateOverlay(overlayId, { color: val });
  };

  return (
    <div className="space-y-4">
      <p className="text-[10px] uppercase tracking-[0.2em] text-[#F7F6E5]" style={{ fontFamily: "Unbounded, sans-serif" }}>
        Color
      </p>

      {/* Color swatch + hex input */}
      <div className="flex items-center gap-2">
        <button
          className="w-8 h-8 rounded-lg border border-[rgba(255,255,255,0.1)] shrink-0 transition-transform hover:scale-105"
          style={{ background: color }}
          onClick={() => setShowPicker((v) => !v)}
        />
        <Input
          value={hexInput}
          onChange={(e) => handleHexInput(e.target.value)}
          className="h-8 text-xs font-mono bg-[rgba(255,255,255,0.05)] border-[#333333] text-white flex-1"
          placeholder="#ffffff"
          maxLength={7}
        />
        <button
          className="text-[#F7F6E5] hover:text-white transition-colors"
          onClick={() => setShowPicker((v) => !v)}
        >
          <ChevronDown size={14} className={`transition-transform ${showPicker ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Color picker */}
      {showPicker && (
        <div className="rounded-xl overflow-hidden border border-[#333333]">
          <HexColorPicker color={color} onChange={handleColorChange} style={{ width: "100%" }} />
        </div>
      )}

      {/* Palettes */}
      <Tabs defaultValue="swatches" className="w-full">
        <TabsList className="w-full h-7 bg-[#0d0d0d] border border-[#222222]">
          <TabsTrigger value="swatches" className="flex-1 text-[9px] h-5">Swatches</TabsTrigger>
          <TabsTrigger value="palettes" className="flex-1 text-[9px] h-5">Palettes</TabsTrigger>
        </TabsList>

        <TabsContent value="swatches" className="mt-2">
          <div className="grid grid-cols-10 gap-1">
            {TAILWIND_SWATCHES.map((sw) => (
              <button
                key={sw}
                className="w-6 h-6 rounded transition-transform hover:scale-110"
                style={{
                  background: sw,
                  border: sw === color ? "2px solid #ccff00" : "1px solid rgba(255,255,255,0.1)",
                }}
                onClick={() => handleColorChange(sw)}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="palettes" className="mt-2 space-y-2">
          {COLOR_PALETTES.slice(0, 6).map((palette) => (
            <div key={palette.id}>
              <p className="text-[9px] text-[#F7F6E5] mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>
                {palette.name}
              </p>
              <div className="flex gap-1">
                {palette.colors.map((c) => (
                  <button
                    key={c}
                    className="flex-1 h-6 rounded transition-transform hover:scale-110"
                    style={{
                      background: c,
                      border: c === color ? "2px solid #ccff00" : "1px solid rgba(255,255,255,0.05)",
                    }}
                    onClick={() => handleColorChange(c)}
                  />
                ))}
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
