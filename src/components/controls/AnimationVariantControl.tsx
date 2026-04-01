"use client";

import { useStudioStore } from "@/store/studioStore";

export interface VariantOption {
  value: string;
  label: string;
  description: string;
}

interface Props {
  overlayId: string;
  variants: VariantOption[];
  defaultVariant: string;
  sectionLabel: string;
}

export const SUBSCRIBE_VARIANTS: VariantOption[] = [
  { value: "slide-up",   label: "Slide Up",    description: "Smooth spring entrance" },
  { value: "bounce-in",  label: "Bounce In",   description: "Overshoots & settles" },
  { value: "pop",        label: "Pop",         description: "Scale punch, no slide" },
  { value: "typewriter", label: "Typewriter",  description: "Text reveals char by char" },
  { value: "click",      label: "Click Burst", description: "Button pops every 3s" },
];

export const LIKE_VARIANTS: VariantOption[] = [
  { value: "pulse",     label: "Pulse",      description: "Scale pulse every 1.5s" },
  { value: "heart-pop", label: "Heart Pop",  description: "Red flash + ripple" },
  { value: "bounce",    label: "Bounce",     description: "Thumb bounces up/down" },
  { value: "click",     label: "Clicked",    description: "Filled state + ring" },
];

export const IMAGE_VARIANTS: VariantOption[] = [
  { value: "none",          label: "None",         description: "Plain fade in/out" },
  { value: "float",         label: "Float",        description: "Gentle bob up & down" },
  { value: "pulse",         label: "Pulse",        description: "Rhythmic scale pulse" },
  { value: "spin",          label: "Spin",         description: "Continuous rotation" },
  { value: "bounce-in",     label: "Bounce In",    description: "Spring drop entrance" },
  { value: "slide-in-left", label: "Slide Left",   description: "Slides in from left" },
  { value: "zoom-in",       label: "Zoom In",      description: "Scale up entrance" },
];

export const LYRICS_VARIANTS: VariantOption[] = [
  { value: "fade-slide",     label: "Fade Slide",     description: "Fade in + slide up" },
  { value: "color-fill",     label: "Color Fill",     description: "Karaoke sweep left→right" },
  { value: "typewriter",     label: "Typewriter",     description: "Chars appear one by one" },
  { value: "typewriter-fill",label: "Type + Fill",    description: "Typewriter with color fill" },
  { value: "word-pop",       label: "Word Pop",       description: "Each word springs in" },
  { value: "glow-pulse",     label: "Glow Pulse",     description: "Pulsing bloom effect" },
];

export function AnimationVariantControl({ overlayId, variants, defaultVariant, sectionLabel }: Props) {
  const overlay = useStudioStore((s) => s.overlays.find((o) => o.id === overlayId));
  const updateOverlay = useStudioStore((s) => s.updateOverlay);

  if (!overlay) return null;

  const current = overlay.animationVariant ?? defaultVariant;

  return (
    <div className="space-y-2.5">
      <p
        className="text-[10px] uppercase tracking-[0.2em] text-[#F7F6E5]"
        style={{ fontFamily: "Unbounded, sans-serif" }}
      >
        {sectionLabel}
      </p>

      <div className="grid grid-cols-2 gap-1.5">
        {variants.map((v) => {
          const isActive = current === v.value;
          return (
            <button
              key={v.value}
              onClick={() => updateOverlay(overlayId, { animationVariant: v.value as never })}
              className="rounded-lg p-2.5 text-left transition-all duration-150"
              style={{
                background: isActive ? "rgba(204,255,0,0.08)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${isActive ? "rgba(204,255,0,0.35)" : "rgba(255,255,255,0.07)"}`,
              }}
            >
              <p
                className="text-[11px] font-medium leading-tight"
                style={{
                  fontFamily: "Outfit, sans-serif",
                  color: isActive ? "#ccff00" : "#cccccc",
                }}
              >
                {v.label}
              </p>
              <p
                className="text-[9px] mt-0.5 leading-tight"
                style={{ fontFamily: "Outfit, sans-serif", color: "#F7F6E5" }}
              >
                {v.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
