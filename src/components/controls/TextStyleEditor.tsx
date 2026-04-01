"use client";

import { useState } from "react";
import { useStudioStore } from "@/store/studioStore";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { HexColorPicker } from "react-colorful";
import type { TextShadowConfig, TextStrokeConfig } from "@/types/studio";

interface Props {
  overlayId: string;
}

const PRESET_COLORS = ["#ffffff", "#ccff00", "#ff006e", "#3a86ff", "#06ffa5", "#ffbe0b", "#8338ec", "#000000"];

function ColorSwatch({
  color,
  active,
  onChange,
}: {
  color: string;
  active: boolean;
  onChange: (c: string) => void;
}) {
  return (
    <button
      className="w-6 h-6 rounded-md transition-transform hover:scale-110 shrink-0"
      style={{
        background: color,
        border: active ? "2px solid #ccff00" : "1px solid rgba(255,255,255,0.12)",
        boxShadow: active ? `0 0 8px ${color}80` : undefined,
      }}
      onClick={() => onChange(color)}
    />
  );
}

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {PRESET_COLORS.map((c) => (
          <ColorSwatch key={c} color={c} active={c === value} onChange={onChange} />
        ))}
        <button
          className="w-6 h-6 rounded-md border border-[rgba(255,255,255,0.1)] text-[10px] text-[#F7F6E5] hover:text-white transition-colors"
          onClick={() => setOpen((v) => !v)}
        >
          +
        </button>
      </div>
      {open && (
        <div className="rounded-xl overflow-hidden border border-[#333333]">
          <HexColorPicker color={value} onChange={onChange} style={{ width: "100%" }} />
          <div className="px-3 py-2 border-t border-[#222222]">
            <Input
              value={value}
              onChange={(e) => /^#[0-9a-fA-F]{0,6}$/.test(e.target.value) && onChange(e.target.value)}
              className="h-7 text-xs font-mono bg-[rgba(255,255,255,0.05)] border-[#333333] text-white"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, children }: { label: string; value?: string | number; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-[10px] text-[#F7F6E5]" style={{ fontFamily: "Outfit, sans-serif" }}>
          {label}
        </span>
        {value !== undefined && (
          <span className="text-[10px] text-[#F7F6E5] font-mono tabular-nums">{value}</span>
        )}
      </div>
      {children}
    </div>
  );
}

export function TextStyleEditor({ overlayId }: Props) {
  const overlay = useStudioStore((s) => s.overlays.find((o) => o.id === overlayId));
  const updateOverlay = useStudioStore((s) => s.updateOverlay);

  if (!overlay) return null;

  /* ── gradient ── */
  const hasGradient = !!overlay.gradientColors;
  const gradA = overlay.gradientColors?.[0] ?? "#ccff00";
  const gradB = overlay.gradientColors?.[1] ?? "#3a86ff";

  const toggleGradient = (on: boolean) => {
    if (on) {
      updateOverlay(overlayId, { gradientColors: [gradA, gradB], color: undefined });
    } else {
      updateOverlay(overlayId, { gradientColors: undefined, color: "#ffffff" });
    }
  };

  /* ── shadow ── */
  const hasShadow = !!overlay.textShadow;
  const shadow: TextShadowConfig = overlay.textShadow ?? { color: "#000000", blur: 12, x: 0, y: 4 };

  const toggleShadow = (on: boolean) => {
    updateOverlay(overlayId, { textShadow: on ? shadow : undefined });
  };

  const updateShadow = (patch: Partial<TextShadowConfig>) => {
    updateOverlay(overlayId, { textShadow: { ...shadow, ...patch } });
  };

  /* ── stroke ── */
  const hasStroke = !!overlay.textStroke;
  const stroke: TextStrokeConfig = overlay.textStroke ?? { color: "#000000", width: 2 };

  const toggleStroke = (on: boolean) => {
    updateOverlay(overlayId, { textStroke: on ? stroke : undefined });
  };

  const updateStroke = (patch: Partial<TextStrokeConfig>) => {
    updateOverlay(overlayId, { textStroke: { ...stroke, ...patch } });
  };

  return (
    <div className="space-y-3">
      <p
        className="text-[10px] uppercase tracking-[0.2em] text-[#F7F6E5]"
        style={{ fontFamily: "Unbounded, sans-serif" }}
      >
        Text Style
      </p>

      <Tabs defaultValue="color" className="w-full">
        <TabsList className="w-full grid grid-cols-3 h-8 bg-[rgba(255,255,255,0.04)] border border-[#222222] rounded-lg p-0.5">
          {["color", "shadow", "stroke"].map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="text-[10px] h-full rounded-md capitalize data-[state=active]:bg-[rgba(204,255,0,0.1)] data-[state=active]:text-[#ccff00] text-[#F7F6E5]"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── COLOR tab ── */}
        <TabsContent value="color" className="mt-3 space-y-4">
          {/* Gradient toggle */}
          <div className="flex items-center justify-between">
            <Label
              className="text-[10px] text-[#F7F6E5]"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Gradient
            </Label>
            <Switch
              checked={hasGradient}
              onCheckedChange={toggleGradient}
              className="scale-75 origin-right"
            />
          </div>

          {hasGradient ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <p className="text-[10px] text-[#F7F6E5]" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Color A
                </p>
                <ColorPicker
                  value={gradA}
                  onChange={(c) => updateOverlay(overlayId, { gradientColors: [c, gradB] })}
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] text-[#F7F6E5]" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Color B
                </p>
                <ColorPicker
                  value={gradB}
                  onChange={(c) => updateOverlay(overlayId, { gradientColors: [gradA, c] })}
                />
              </div>
              {/* Live preview swatch */}
              <div
                className="h-7 rounded-lg"
                style={{ background: `linear-gradient(135deg, ${gradA}, ${gradB})` }}
              />
            </div>
          ) : (
            <ColorPicker
              value={overlay.color ?? "#ffffff"}
              onChange={(c) => updateOverlay(overlayId, { color: c })}
            />
          )}
        </TabsContent>

        {/* ── SHADOW tab ── */}
        <TabsContent value="shadow" className="mt-3 space-y-4">
          <div className="flex items-center justify-between">
            <Label
              className="text-[10px] text-[#F7F6E5]"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Enable Shadow
            </Label>
            <Switch
              checked={hasShadow}
              onCheckedChange={toggleShadow}
              className="scale-75 origin-right"
            />
          </div>

          {hasShadow && (
            <div className="space-y-3">
              <Row label="Blur" value={`${shadow.blur}px`}>
                <Slider
                  min={0} max={60} step={1}
                  value={[shadow.blur]}
                  onValueChange={(v) => updateShadow({ blur: (v as number[])[0] })}
                />
              </Row>
              <Row label="X Offset" value={`${shadow.x}px`}>
                <Slider
                  min={-30} max={30} step={1}
                  value={[shadow.x]}
                  onValueChange={(v) => updateShadow({ x: (v as number[])[0] })}
                />
              </Row>
              <Row label="Y Offset" value={`${shadow.y}px`}>
                <Slider
                  min={-30} max={30} step={1}
                  value={[shadow.y]}
                  onValueChange={(v) => updateShadow({ y: (v as number[])[0] })}
                />
              </Row>
              <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-1 text-[10px] text-[#F7F6E5] hover:text-white transition-colors" style={{ fontFamily: "Outfit, sans-serif" }}>
                  <ChevronDown size={10} />
                  Shadow Color
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <ColorPicker
                    value={shadow.color}
                    onChange={(c) => updateShadow({ color: c })}
                  />
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}
        </TabsContent>

        {/* ── STROKE tab ── */}
        <TabsContent value="stroke" className="mt-3 space-y-4">
          <div className="flex items-center justify-between">
            <Label
              className="text-[10px] text-[#F7F6E5]"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Enable Stroke
            </Label>
            <Switch
              checked={hasStroke}
              onCheckedChange={toggleStroke}
              className="scale-75 origin-right"
            />
          </div>

          {hasStroke && (
            <div className="space-y-3">
              <Row label="Width" value={`${stroke.width}px`}>
                <Slider
                  min={0.5} max={12} step={0.5}
                  value={[stroke.width]}
                  onValueChange={(v) => updateStroke({ width: (v as number[])[0] })}
                />
              </Row>
              <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-1 text-[10px] text-[#F7F6E5] hover:text-white transition-colors" style={{ fontFamily: "Outfit, sans-serif" }}>
                  <ChevronDown size={10} />
                  Stroke Color
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <ColorPicker
                    value={stroke.color}
                    onChange={(c) => updateStroke({ color: c })}
                  />
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
