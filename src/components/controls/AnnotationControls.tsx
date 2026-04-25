"use client";

import { ArrowRight, Circle, Highlighter, RectangleHorizontal, Tag } from "lucide-react";
import { HexColorPicker } from "react-colorful";
import { useState } from "react";
import { useStudioStore } from "@/store/studioStore";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import type { AnnotationKind, AnnotationShape } from "@/types/studio";

interface Props {
  overlayId: string;
}

const KIND_OPTIONS: { kind: AnnotationKind; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { kind: "arrow", label: "Arrow", icon: ArrowRight },
  { kind: "shape", label: "Shape", icon: RectangleHorizontal },
  { kind: "highlight", label: "Highlight", icon: Highlighter },
  { kind: "label", label: "Label", icon: Tag },
];

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const safeColor = /^#[0-9a-fA-F]{3,8}$/.test(value) ? value : "#ccff00";

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] text-[#F7F6E5]" style={{ fontFamily: "Outfit, sans-serif" }}>{label}</p>
      <div className="flex items-center gap-2">
        <button
          className="h-7 w-7 rounded-md border border-[rgba(255,255,255,0.1)]"
          style={{ background: safeColor }}
          onClick={() => setOpen((v) => !v)}
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 text-[11px] bg-[rgba(255,255,255,0.04)] border-[#333] text-white"
        />
      </div>
      {open && <HexColorPicker color={safeColor} onChange={onChange} style={{ width: "100%" }} />}
    </div>
  );
}

export function AnnotationControls({ overlayId }: Props) {
  const overlay = useStudioStore((s) => s.overlays.find((o) => o.id === overlayId));
  const updateOverlay = useStudioStore((s) => s.updateOverlay);
  if (!overlay?.annotation) return null;

  const annotation = overlay.annotation;
  const patchAnnotation = (patch: Partial<typeof annotation>) => {
    updateOverlay(overlayId, { annotation: { ...annotation, ...patch } });
  };

  return (
    <div className="space-y-4">
      <p className="text-[10px] uppercase tracking-[0.2em] text-[#F7F6E5]" style={{ fontFamily: "Unbounded, sans-serif" }}>
        Annotation
      </p>

      <div className="grid grid-cols-4 gap-1.5">
        {KIND_OPTIONS.map(({ kind, label, icon: Icon }) => {
          const selected = annotation.kind === kind;
          return (
            <button
              key={kind}
              className="flex h-14 flex-col items-center justify-center gap-1 rounded-md border text-[9px] transition-colors"
              style={{
                fontFamily: "Outfit, sans-serif",
                background: selected ? "rgba(204,255,0,0.12)" : "rgba(255,255,255,0.03)",
                borderColor: selected ? "rgba(204,255,0,0.45)" : "rgba(255,255,255,0.06)",
                color: selected ? "#ccff00" : "#777",
              }}
              onClick={() => patchAnnotation({ kind })}
            >
              <Icon size={14} />
              {label}
            </button>
          );
        })}
      </div>

      {(annotation.kind === "shape" || annotation.kind === "highlight") && (
        <div className="flex gap-1.5">
          {(["rect", "ellipse"] as AnnotationShape[]).map((shape) => (
            <button
              key={shape}
              className="flex-1 rounded border py-1.5 text-[10px]"
              style={{
                fontFamily: "Outfit, sans-serif",
                background: annotation.shape === shape ? "#ccff00" : "rgba(255,255,255,0.03)",
                borderColor: annotation.shape === shape ? "#ccff00" : "rgba(255,255,255,0.06)",
                color: annotation.shape === shape ? "#050505" : "#777",
              }}
              onClick={() => patchAnnotation({ shape })}
            >
              {shape === "rect" ? "Rectangle" : "Ellipse"}
            </button>
          ))}
        </div>
      )}

      {annotation.kind === "label" && (
        <div className="space-y-1.5">
          <p className="text-[10px] text-[#F7F6E5]" style={{ fontFamily: "Outfit, sans-serif" }}>Label Text</p>
          <Input
            value={annotation.text ?? ""}
            onChange={(e) => patchAnnotation({ text: e.target.value })}
            className="h-8 text-xs bg-[rgba(255,255,255,0.05)] border-[#333] text-white"
          />
        </div>
      )}

      <ColorField
        label={annotation.kind === "label" ? "Fill Color" : "Stroke Color"}
        value={annotation.borderColor ?? overlay.color ?? "#ccff00"}
        onChange={(borderColor) => patchAnnotation({ borderColor })}
      />

      {annotation.kind === "highlight" && (
        <ColorField
          label="Highlight Fill"
          value={annotation.fillColor ?? "rgba(204,255,0,0.12)"}
          onChange={(fillColor) => patchAnnotation({ fillColor })}
        />
      )}

      {([
        ["Width", "width", 4, 80, 1],
        ["Height", "height", 3, 60, 1],
        ["Stroke", "strokeWidth", 1, 18, 1],
        ["Rotation", "rotation", -180, 180, 1],
      ] as const).map(([label, key, min, max, step]) => (
        <div key={key} className="space-y-1.5">
          <div className="flex justify-between text-[10px] text-[#F7F6E5]" style={{ fontFamily: "Outfit, sans-serif" }}>
            <span>{label}</span>
            <span>{annotation[key]}{key === "rotation" ? "deg" : ""}</span>
          </div>
          <Slider
            min={min}
            max={max}
            step={step}
            value={[annotation[key] as number]}
            onValueChange={(vals) => patchAnnotation({ [key]: (vals as number[])[0] })}
          />
        </div>
      ))}
    </div>
  );
}
