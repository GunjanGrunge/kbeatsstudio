"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { PlayCircle, Camera, ChevronRight } from "lucide-react";
import { TEMPLATES, type Template } from "@/types/studio";
import { Badge } from "@/components/ui/badge";

interface Props {
  onSelect: (template: Template) => void;
}

const PLATFORM_ICONS = {
  youtube: PlayCircle,
  instagram: Camera,
};

const ASPECT_SHAPES: Record<string, string> = {
  "16:9": "aspect-video",
  "9:16": "aspect-[9/16]",
  "1:1": "aspect-square",
  "1.91:1": "aspect-[1.91/1]",
};

export function TemplatePicker({ onSelect }: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const ytTemplates = TEMPLATES.filter((t) => t.platform === "youtube");
  const igTemplates = TEMPLATES.filter((t) => t.platform === "instagram");

  const handleSelect = (template: Template) => {
    setSelectedId(template.id);
    setTimeout(() => onSelect(template), 200);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-6">
      {/* YouTube */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-5">
          <PlayCircle size={20} className="text-[#ccff00]" />
          <h2
            className="text-sm font-heading font-700 uppercase tracking-[0.2em] text-white"
            style={{ fontFamily: "Unbounded, sans-serif", fontWeight: 700 }}
          >
            YouTube
          </h2>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {ytTemplates.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              isHovered={hoveredId === t.id}
              isSelected={selectedId === t.id}
              onHover={setHoveredId}
              onSelect={handleSelect}
            />
          ))}
        </div>
      </div>

      {/* Instagram */}
      <div>
        <div className="flex items-center gap-3 mb-5">
          <Camera size={20} className="text-[#ccff00]" />
          <h2
            className="text-sm uppercase tracking-[0.2em] text-white"
            style={{ fontFamily: "Unbounded, sans-serif", fontWeight: 700 }}
          >
            Instagram
          </h2>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {igTemplates.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              isHovered={hoveredId === t.id}
              isSelected={selectedId === t.id}
              onHover={setHoveredId}
              onSelect={handleSelect}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function TemplateCard({
  template,
  isHovered,
  isSelected,
  onHover,
  onSelect,
}: {
  template: Template;
  isHovered: boolean;
  isSelected: boolean;
  onHover: (id: string | null) => void;
  onSelect: (t: Template) => void;
}) {
  const PlatformIcon = PLATFORM_ICONS[template.platform];
  const shapeClass = ASPECT_SHAPES[template.aspectLabel] ?? "aspect-video";

  return (
    <motion.button
      className={`group relative flex flex-col gap-3 text-left p-4 rounded-xl border transition-all duration-300
        ${isSelected
          ? "border-[#ccff00] bg-[#1a1a1c] shadow-[0_0_20px_rgba(204,255,0,0.2)]"
          : "border-[rgba(255,255,255,0.05)] bg-[#1a1a1c] hover:border-[#ccff00] hover:shadow-[0_0_16px_rgba(204,255,0,0.15)]"
        }`}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => onHover(template.id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onSelect(template)}
    >
      {/* Aspect ratio preview shape */}
      <div className={`w-full ${shapeClass} max-h-28 rounded-lg bg-[#0d0d0d] border border-[rgba(255,255,255,0.08)] flex items-center justify-center overflow-hidden`}>
        <div className={`flex flex-col items-center gap-1 ${isHovered || isSelected ? "opacity-100" : "opacity-40"} transition-opacity duration-300`}>
          <PlatformIcon
            size={22}
            className={isHovered || isSelected ? "text-[#ccff00]" : "text-white"}
            style={{ transition: "color 0.3s" }}
          />
          <span className="text-[10px] text-[#888888] font-mono">{template.width}×{template.height}</span>
        </div>
      </div>

      <div>
        <p
          className="text-[11px] font-semibold text-white mb-0.5 leading-tight"
          style={{ fontFamily: "Unbounded, sans-serif" }}
        >
          {template.name}
        </p>
        <p className="text-[10px] text-[#888888]" style={{ fontFamily: "Outfit, sans-serif" }}>
          {template.description}
        </p>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge
          variant="outline"
          className="text-[9px] px-1.5 py-0 border-[rgba(255,255,255,0.1)] text-[#888888] font-mono"
        >
          {template.aspectLabel}
        </Badge>
        <Badge
          variant="outline"
          className="text-[9px] px-1.5 py-0 border-[rgba(255,255,255,0.1)] text-[#888888] font-mono"
        >
          {template.fps}fps
        </Badge>
      </div>

      {/* Arrow on hover */}
      <motion.div
        className="absolute top-4 right-4 text-[#ccff00]"
        initial={{ opacity: 0, x: -4 }}
        animate={{ opacity: isHovered || isSelected ? 1 : 0, x: isHovered || isSelected ? 0 : -4 }}
        transition={{ duration: 0.2 }}
      >
        <ChevronRight size={14} />
      </motion.div>
    </motion.button>
  );
}
