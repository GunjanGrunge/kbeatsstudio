"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, Download, ArrowLeft, Pencil, ChevronDown } from "lucide-react";
import { useStudioStore } from "@/store/studioStore";
import { useRouter } from "next/navigation";
import { TEMPLATES, type Template } from "@/types/studio";

interface Props {
  onExport: () => void;
}

export function ProjectHeader({ onExport }: Props) {
  const router = useRouter();
  const projectName = useStudioStore((s) => s.projectName);
  const isDirty = useStudioStore((s) => s.isDirty);
  const lastSaved = useStudioStore((s) => s.lastSaved);
  const template = useStudioStore((s) => s.template);
  const setProjectName = useStudioStore((s) => s.setProjectName);
  const loadProject = useStudioStore((s) => s.loadProject);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(projectName);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  const handleNameSubmit = () => {
    if (editValue.trim()) setProjectName(editValue.trim());
    setEditing(false);
  };

  const handleTemplateChange = (t: Template) => {
    // Update template while keeping all overlays and media
    const current = useStudioStore.getState();
    loadProject({
      ...current,
      template: t,
      isDirty: true,
    });
    setShowTemplatePicker(false);
  };

  // Group templates by platform
  const ytTemplates = TEMPLATES.filter((t) => t.platform === "youtube");
  const igTemplates = TEMPLATES.filter((t) => t.platform === "instagram");

  return (
    <header
      className="flex items-center justify-between px-5 py-3 border-b shrink-0"
      style={{ background: "#0d0d0d", borderColor: "#222222", height: 56 }}
    >
      {/* Left: Back + Logo + Project name */}
      <div className="flex items-center gap-4 min-w-0">
        <button
          className="text-[#F7F6E5] hover:text-white transition-colors duration-200 p-1 rounded shrink-0"
          onClick={() => router.push("/")}
        >
          <ArrowLeft size={16} />
        </button>

        {/* Logo */}
        <div className="flex items-center gap-0.5 shrink-0">
          <span style={{ fontFamily: "Unbounded, sans-serif", fontWeight: 900, fontSize: 16, color: "#ccff00" }}>K</span>
          <span style={{ fontFamily: "Unbounded, sans-serif", fontWeight: 300, fontSize: 16, color: "white", letterSpacing: "0.15em" }}>BEATS</span>
        </div>

        <div className="w-px h-4 bg-[#222222] shrink-0" />

        {/* Editable project name */}
        {editing ? (
          <input
            autoFocus
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleNameSubmit();
              if (e.key === "Escape") { setEditing(false); setEditValue(projectName); }
            }}
            className="text-sm font-medium text-white bg-[#1a1a1c] border border-[#ccff00] rounded px-2 py-0.5 outline-none"
            style={{ fontFamily: "Outfit, sans-serif", minWidth: 120, maxWidth: 220 }}
          />
        ) : (
          <button
            className="flex items-center gap-2 group text-sm font-medium text-white hover:text-[#ccff00] transition-colors duration-200 min-w-0"
            style={{ fontFamily: "Outfit, sans-serif" }}
            onClick={() => { setEditing(true); setEditValue(projectName); }}
          >
            <span className="truncate max-w-[160px]">{projectName}</span>
            <Pencil size={11} className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-[#F7F6E5] shrink-0" />
          </button>
        )}

        {/* Template switcher */}
        <div className="relative shrink-0">
          <button
            className="flex items-center gap-1.5 text-[10px] text-[#F7F6E5] hover:text-white px-2 py-1 rounded-full border border-[#222222] hover:border-[#444444] transition-all duration-200"
            style={{ fontFamily: "Outfit, sans-serif" }}
            onClick={() => setShowTemplatePicker((v) => !v)}
          >
            <span className="font-mono">{template.width}×{template.height}</span>
            <span className="text-[#F7F6E5]">·</span>
            <span>{template.fps}fps</span>
            <ChevronDown size={11} className={`transition-transform duration-200 ${showTemplatePicker ? "rotate-180" : ""}`} />
          </button>

          <AnimatePresence>
            {showTemplatePicker && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.97 }}
                transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="absolute left-0 top-full mt-1 z-50 rounded-xl border overflow-hidden"
                style={{ background: "#1a1a1c", borderColor: "#333333", minWidth: 220 }}
              >
                {/* YouTube group */}
                <div className="px-3 pt-2.5 pb-1">
                  <p className="text-[9px] uppercase tracking-[0.2em] text-[#555555]" style={{ fontFamily: "Unbounded, sans-serif" }}>
                    YouTube
                  </p>
                </div>
                {ytTemplates.map((t) => (
                  <TemplateOption key={t.id} t={t} current={template} onSelect={handleTemplateChange} />
                ))}
                <div className="mx-3 my-1 h-px bg-[#222222]" />
                {/* Instagram group */}
                <div className="px-3 pt-1.5 pb-1">
                  <p className="text-[9px] uppercase tracking-[0.2em] text-[#555555]" style={{ fontFamily: "Unbounded, sans-serif" }}>
                    Instagram
                  </p>
                </div>
                {igTemplates.map((t) => (
                  <TemplateOption key={t.id} t={t} current={template} onSelect={handleTemplateChange} />
                ))}
                <div className="h-1" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Right: Save status + Export */}
      <div className="flex items-center gap-4 shrink-0">
        {/* Save status */}
        <AnimatePresence mode="wait">
          {isDirty ? (
            <motion.div
              key="saving"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1.5 text-[#F7F6E5]"
              style={{ fontFamily: "Outfit, sans-serif", fontSize: 11 }}
            >
              <Loader2 size={11} className="animate-spin" />
              Saving...
            </motion.div>
          ) : lastSaved ? (
            <motion.div
              key="saved"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1.5 text-[#555555]"
              style={{ fontFamily: "Outfit, sans-serif", fontSize: 11 }}
            >
              <Check size={11} className="text-[#ccff00]" />
              Saved
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Export button */}
        <button
          onClick={onExport}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-[#050505] font-bold text-xs transition-all duration-300"
          style={{
            background: "#ccff00",
            fontFamily: "Unbounded, sans-serif",
            fontSize: "0.65rem",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "#b3e600";
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 8px 20px rgba(204,255,0,0.3)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "#ccff00";
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
          }}
        >
          <Download size={12} />
          Export MP4
        </button>
      </div>
    </header>
  );
}

function TemplateOption({
  t,
  current,
  onSelect,
}: {
  t: Template;
  current: Template;
  onSelect: (t: Template) => void;
}) {
  const isActive = t.id === current.id;
  return (
    <button
      className="flex items-center justify-between w-full px-3 py-1.5 text-left transition-colors duration-100 hover:bg-[rgba(255,255,255,0.04)]"
      onClick={() => onSelect(t)}
    >
      <div className="flex flex-col gap-0.5">
        <span
          className="text-xs"
          style={{
            fontFamily: "Outfit, sans-serif",
            color: isActive ? "#ccff00" : "#cccccc",
            fontWeight: isActive ? 500 : 400,
          }}
        >
          {t.name}
        </span>
        <span className="text-[10px] font-mono" style={{ color: "#555555" }}>
          {t.width}×{t.height} · {t.fps}fps · {t.aspectLabel}
        </span>
      </div>
      {isActive && <Check size={12} className="text-[#ccff00] shrink-0" />}
    </button>
  );
}
