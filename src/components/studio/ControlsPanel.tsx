"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useStudioStore } from "@/store/studioStore";
import { Separator } from "@/components/ui/separator";
import { TimingControl } from "@/components/controls/TimingControl";
import { PositionControl } from "@/components/controls/PositionControl";
import { OpacityControl } from "@/components/controls/OpacityControl";
import { ColorPickerControl } from "@/components/controls/ColorPickerControl";
import { FontPicker } from "@/components/controls/FontPicker";
import { LyricsEditor } from "@/components/controls/LyricsEditor";
import { WaveformControl } from "@/components/controls/WaveformControl";
import { CTAControls } from "@/components/controls/CTAControls";
import { ImageControls } from "@/components/controls/ImageControls";
import { AnimationVariantControl, LYRICS_VARIANTS, IMAGE_VARIANTS } from "@/components/controls/AnimationVariantControl";
import { TextStyleEditor } from "@/components/controls/TextStyleEditor";
import { MotionBackgroundControl } from "@/components/controls/MotionBackgroundControl";
import { Slider } from "@/components/ui/slider";
import { HexColorPicker } from "react-colorful";
import { useState } from "react";

function BackgroundControls() {
  const backgroundColor = useStudioStore((s) => s.backgroundColor);
  const backgroundOpacity = useStudioStore((s) => s.backgroundOpacity);
  const setBackgroundColor = useStudioStore((s) => s.setBackgroundColor);
  const setBackgroundOpacity = useStudioStore((s) => s.setBackgroundOpacity);
  const [showPicker, setShowPicker] = useState(false);

  const BG_PRESETS = ["#050505", "#0d0d0d", "#1a1a1c", "#000000", "#0f172a", "#1e1b4b"];

  return (
    <div className="space-y-4 px-4 py-4">
      <p className="text-[10px] uppercase tracking-[0.2em] text-[#F7F6E5]" style={{ fontFamily: "Unbounded, sans-serif" }}>
        Background
      </p>

      <div className="space-y-2">
        <p className="text-[10px] text-[#F7F6E5]" style={{ fontFamily: "Outfit, sans-serif" }}>Background Color</p>
        <div className="flex items-center gap-2">
          <button
            className="w-8 h-8 rounded-lg border border-[rgba(255,255,255,0.1)] shrink-0"
            style={{ background: backgroundColor }}
            onClick={() => setShowPicker((v) => !v)}
          />
          <div className="flex gap-1.5 flex-wrap flex-1">
            {BG_PRESETS.map((c) => (
              <button
                key={c}
                className="w-6 h-6 rounded transition-transform hover:scale-110"
                style={{
                  background: c,
                  border: c === backgroundColor ? "2px solid #ccff00" : "1px solid rgba(255,255,255,0.1)",
                }}
                onClick={() => setBackgroundColor(c)}
              />
            ))}
          </div>
        </div>
        {showPicker && (
          <HexColorPicker
            color={backgroundColor}
            onChange={setBackgroundColor}
            style={{ width: "100%" }}
          />
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-[10px] text-[#F7F6E5]" style={{ fontFamily: "Outfit, sans-serif" }}>
          <span>Background Opacity</span>
          <span>{Math.round(backgroundOpacity * 100)}%</span>
        </div>
        <Slider
          min={0} max={1} step={0.01}
          value={[backgroundOpacity]}
          onValueChange={(vals) => setBackgroundOpacity(Array.isArray(vals) ? vals[0] : vals)}
        />
      </div>
    </div>
  );
}

export function ControlsPanel() {
  const selectedId = useStudioStore((s) => s.selectedOverlayId);
  const overlay = useStudioStore((s) => s.overlays.find((o) => o.id === selectedId));

  const showMotionBgControls = overlay?.type === "motion-background";
  const showTextControls = overlay && !showMotionBgControls && ["lyrics", "lyrics-chords", "text"].includes(overlay.type);
  const showTextStyleEditor = overlay?.type === "text";
  const showColorControls = overlay && !showMotionBgControls && overlay.type !== "waveform" && overlay.type !== "text";
  const showLyricsEditor = overlay && ["lyrics", "lyrics-chords"].includes(overlay.type);
  const showLyricsAnimation = overlay && ["lyrics", "lyrics-chords"].includes(overlay.type);
  const showWaveformControls = overlay?.type === "waveform";
  const showCTAControls = overlay && ["yt-subscribe", "yt-like", "ig-follow", "ig-like", "ig-report", "ig-share", "text"].includes(overlay.type);
  const showImageControls = overlay?.type === "image";
  const showImageAnimation = overlay?.type === "image";

  return (
    <div className="flex flex-col h-full" style={{ background: "#0d0d0d", minHeight: 0 }}>
      {/* Panel title */}
      <div className="flex items-center px-4 py-3 border-b shrink-0" style={{ borderColor: "#222222" }}>
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#F7F6E5]" style={{ fontFamily: "Unbounded, sans-serif" }}>
          {overlay ? overlay.label : "Properties"}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
        <AnimatePresence mode="wait">
          {!overlay ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Background controls when nothing selected */}
              <BackgroundControls />
              <Separator className="bg-[#1a1a1c]" />
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center gap-2">
                <div className="w-8 h-px bg-[#1a1a1c] mb-2" />
                <p className="text-xs text-[#F7F6E5]" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Select a layer to edit its properties.
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={overlay.id}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-0"
            >
              {/* Timing */}
              <div className="px-4 py-4 border-b" style={{ borderColor: "#1a1a1c" }}>
                <TimingControl overlayId={overlay.id} />
              </div>

              {/* Position */}
              <div className="px-4 py-4 border-b" style={{ borderColor: "#1a1a1c" }}>
                <PositionControl overlayId={overlay.id} />
              </div>

              {/* Opacity */}
              <div className="px-4 py-4 border-b" style={{ borderColor: "#1a1a1c" }}>
                <OpacityControl overlayId={overlay.id} />
              </div>

              {/* Motion background controls */}
              {showMotionBgControls && (
                <div className="px-4 py-4 border-b" style={{ borderColor: "#1a1a1c" }}>
                  <MotionBackgroundControl overlayId={overlay.id} />
                </div>
              )}

              {/* Image / logo controls */}
              {showImageControls && (
                <div className="px-4 py-4 border-b" style={{ borderColor: "#1a1a1c" }}>
                  <ImageControls overlayId={overlay.id} />
                </div>
              )}

              {/* Image animation style */}
              {showImageAnimation && (
                <div className="px-4 py-4 border-b" style={{ borderColor: "#1a1a1c" }}>
                  <AnimationVariantControl
                    overlayId={overlay.id}
                    variants={IMAGE_VARIANTS}
                    defaultVariant="none"
                    sectionLabel="Animation Style"
                  />
                </div>
              )}

              {/* CTA-specific inputs (channel name, username, text content) */}
              {showCTAControls && (
                <div className="px-4 py-4 border-b" style={{ borderColor: "#1a1a1c" }}>
                  <CTAControls overlayId={overlay.id} />
                </div>
              )}

              {/* Waveform controls */}
              {showWaveformControls && (
                <div className="px-4 py-4 border-b" style={{ borderColor: "#1a1a1c" }}>
                  <WaveformControl overlayId={overlay.id} />
                </div>
              )}

              {/* Lyrics editor */}
              {showLyricsEditor && (
                <div className="px-4 py-4 border-b" style={{ borderColor: "#1a1a1c" }}>
                  <LyricsEditor overlayId={overlay.id} />
                </div>
              )}

              {/* Lyrics animation style */}
              {showLyricsAnimation && (
                <div className="px-4 py-4 border-b" style={{ borderColor: "#1a1a1c" }}>
                  <AnimationVariantControl
                    overlayId={overlay.id}
                    variants={LYRICS_VARIANTS}
                    defaultVariant="fade-slide"
                    sectionLabel="Animation Style"
                  />
                </div>
              )}

              {/* Text style editor (color, gradient, shadow, stroke) for text overlays */}
              {showTextStyleEditor && (
                <div className="px-4 py-4 border-b" style={{ borderColor: "#1a1a1c" }}>
                  <TextStyleEditor overlayId={overlay.id} />
                </div>
              )}

              {/* Color (non-text, non-waveform overlays) */}
              {showColorControls && (
                <div className="px-4 py-4 border-b" style={{ borderColor: "#1a1a1c" }}>
                  <ColorPickerControl overlayId={overlay.id} />
                </div>
              )}

              {/* Typography */}
              {showTextControls && (
                <div className="px-4 py-4">
                  <FontPicker overlayId={overlay.id} />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
