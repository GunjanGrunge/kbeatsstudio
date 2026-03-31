"use client";

import { useState } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import {
  Eye, EyeOff, Trash2, Copy, GripVertical, Music2, PlayCircle, Camera, FileText, Waves, Type, Image, LucideProps
} from "lucide-react";
import { useStudioStore } from "@/store/studioStore";
import type { OverlayConfig, OverlayType } from "@/types/studio";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const OVERLAY_ICONS: Record<OverlayType, React.ComponentType<LucideProps>> = {
  "yt-subscribe": PlayCircle,
  "yt-like": PlayCircle,
  "ig-follow": Camera,
  lyrics: Music2,
  "lyrics-chords": Music2,
  waveform: Waves,
  text: Type,
  image: Image,
};

const OVERLAY_COLORS: Record<OverlayType, string> = {
  "yt-subscribe": "#ff0000",
  "yt-like": "#ff0000",
  "ig-follow": "#e1306c",
  lyrics: "#ccff00",
  "lyrics-chords": "#ccff00",
  waveform: "#ccff00",
  text: "#888888",
  image: "#888888",
};

function OverlayItem({ overlay, isSelected }: { overlay: OverlayConfig; isSelected: boolean }) {
  const selectOverlay = useStudioStore((s) => s.selectOverlay);
  const toggleVisibility = useStudioStore((s) => s.toggleOverlayVisibility);
  const removeOverlay = useStudioStore((s) => s.removeOverlay);
  const duplicateOverlay = useStudioStore((s) => s.duplicateOverlay);

  const Icon = OVERLAY_ICONS[overlay.type];
  const iconColor = OVERLAY_COLORS[overlay.type];

  return (
    <Reorder.Item
      value={overlay}
      id={overlay.id}
      className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer select-none transition-all duration-200 ${
        isSelected
          ? "bg-[rgba(204,255,0,0.06)] border border-[rgba(204,255,0,0.3)]"
          : "border border-transparent hover:bg-[rgba(255,255,255,0.03)] hover:border-[rgba(255,255,255,0.05)]"
      }`}
      onClick={() => selectOverlay(overlay.id)}
    >
      {/* Drag handle */}
      <div className="text-[#333333] hover:text-[#555555] cursor-grab active:cursor-grabbing shrink-0">
        <GripVertical size={13} />
      </div>

      {/* Type icon */}
      <div
        className="w-6 h-6 rounded flex items-center justify-center shrink-0"
        style={{ background: `${iconColor}15` }}
      >
        <Icon size={12} color={iconColor} />
      </div>

      {/* Label */}
      <span
        className={`flex-1 text-xs truncate ${isSelected ? "text-white" : "text-[#aaaaaa]"}`}
        style={{ fontFamily: "Outfit, sans-serif", fontWeight: isSelected ? 500 : 400 }}
      >
        {overlay.label}
      </span>

      {/* Actions — show on hover */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="p-1 rounded text-[#555555] hover:text-white transition-colors"
              onClick={(e) => { e.stopPropagation(); duplicateOverlay(overlay.id); }}
            >
              <Copy size={11} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top"><p className="text-xs">Duplicate</p></TooltipContent>
        </Tooltip>

        <button
          className="p-1 rounded transition-colors"
          style={{ color: overlay.visible ? "#888888" : "#333333" }}
          onClick={(e) => { e.stopPropagation(); toggleVisibility(overlay.id); }}
        >
          {overlay.visible ? <Eye size={11} /> : <EyeOff size={11} />}
        </button>

        <button
          className="p-1 rounded text-[#333333] hover:text-red-400 transition-colors"
          onClick={(e) => { e.stopPropagation(); removeOverlay(overlay.id); }}
        >
          <Trash2 size={11} />
        </button>
      </div>
    </Reorder.Item>
  );
}

export function OverlayList() {
  const overlays = useStudioStore((s) => s.overlays);
  const selectedId = useStudioStore((s) => s.selectedOverlayId);
  const reorderOverlays = useStudioStore((s) => s.reorderOverlays);
  const addOverlay = useStudioStore((s) => s.addOverlay);
  const [showAddMenu, setShowAddMenu] = useState(false);

  const OVERLAY_OPTIONS: { type: OverlayType; label: string }[] = [
    { type: "yt-subscribe", label: "YouTube Subscribe" },
    { type: "yt-like", label: "YouTube Like" },
    { type: "ig-follow", label: "Instagram Follow" },
    { type: "lyrics", label: "Lyrics" },
    { type: "lyrics-chords", label: "Lyrics + Chords" },
    { type: "waveform", label: "Waveform" },
    { type: "text", label: "Text" },
  ];

  const handleReorder = (newOrder: OverlayConfig[]) => {
    // Find the indices that changed and call reorderOverlays
    newOrder.forEach((overlay, newIndex) => {
      const oldIndex = overlays.findIndex((o) => o.id === overlay.id);
      if (oldIndex !== newIndex) {
        reorderOverlays(oldIndex, newIndex);
      }
    });
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "#222222" }}>
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#555555]" style={{ fontFamily: "Unbounded, sans-serif" }}>
          Layers
        </p>
        <div className="relative">
          <button
            className="text-[10px] text-[#ccff00] font-bold uppercase tracking-wider hover:text-white transition-colors duration-200"
            style={{ fontFamily: "Unbounded, sans-serif" }}
            onClick={() => setShowAddMenu((v) => !v)}
          >
            + Add
          </button>
          <AnimatePresence>
            {showAddMenu && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.96 }}
                transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="absolute right-0 top-full mt-1 z-50 rounded-xl overflow-hidden border"
                style={{ background: "#1a1a1c", borderColor: "#333333", minWidth: 180 }}
              >
                {OVERLAY_OPTIONS.map((opt) => {
                  const Icon = OVERLAY_ICONS[opt.type];
                  return (
                    <button
                      key={opt.type}
                      className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-[#aaaaaa] hover:text-white hover:bg-[rgba(255,255,255,0.04)] transition-colors duration-150"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                      onClick={() => { addOverlay(opt.type); setShowAddMenu(false); }}
                    >
                      <Icon size={13} color={OVERLAY_COLORS[opt.type]} />
                      {opt.label}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2">
        {overlays.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
            <Waves size={24} className="text-[#333333]" />
            <p className="text-xs text-[#444444]" style={{ fontFamily: "Outfit, sans-serif" }}>
              No overlays yet.
              <br />
              Click "+ Add" to get started.
            </p>
          </div>
        ) : (
          <Reorder.Group
            axis="y"
            values={overlays}
            onReorder={handleReorder}
            className="flex flex-col gap-0.5"
          >
            {[...overlays].reverse().map((overlay) => (
              <OverlayItem
                key={overlay.id}
                overlay={overlay}
                isSelected={selectedId === overlay.id}
              />
            ))}
          </Reorder.Group>
        )}
      </div>
    </div>
  );
}
