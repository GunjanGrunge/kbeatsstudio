"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useStudioStore } from "@/store/studioStore";
import { sharedFrameRef } from "@/lib/sharedRefs";
import { Music2, Crosshair, Trash2, Copy, Clipboard, ChevronDown } from "lucide-react";
import { parseTimecodeToFrames } from "@/lib/parseTimecode";
import type { LyricLine, LyricsVariant } from "@/types/studio";

interface Props {
  overlayId: string;
}

const ANIMATION_VARIANTS: { value: LyricsVariant; label: string }[] = [
  { value: "fade-slide",     label: "Fade + Slide" },
  { value: "color-fill",     label: "Color Fill" },
  { value: "typewriter",     label: "Typewriter" },
  { value: "typewriter-fill",label: "Typewriter Fill" },
  { value: "word-pop",       label: "Word Pop" },
  { value: "glow-pulse",     label: "Glow Pulse" },
  { value: "karaoke",        label: "Karaoke" },
  { value: "glitch-scatter",    label: "Glitch Scatter" },
  { value: "fragment-shatter",  label: "Fragment Shatter" },
  { value: "pulse-smoke",       label: "Pulse Smoke" },
];

const FONT_FAMILIES = ["Outfit", "Inter", "Roboto", "Playfair Display", "Oswald", "Bebas Neue", "Montserrat", "Raleway", "Lato", "Poppins"];
const FONT_WEIGHTS  = [400, 500, 600, 700, 800, 900];

function framesToTimestamp(frames: number, fps: number): string {
  const secs = frames / fps;
  const m = Math.floor(secs / 60);
  const s = (secs % 60).toFixed(1);
  return m > 0
    ? `${m}:${String(Math.floor(secs % 60)).padStart(2, "0")}.${String(Math.round((secs % 1) * 10))}`
    : `${s}s`;
}

const parseTimestamp = parseTimecodeToFrames;

/** Walk backwards through lines to find the last explicitly-set animation variant.
 *  Falls back to the overlay-level animationVariant, then "fade-slide". */
function getRunningDefault(
  lines: LyricLine[],
  upToIndex: number,
  overlayVariant: LyricsVariant | undefined
): LyricsVariant {
  for (let i = upToIndex - 1; i >= 0; i--) {
    if (lines[i].animationVariant !== undefined) return lines[i].animationVariant!;
  }
  return overlayVariant ?? "fade-slide";
}

export function LyricsEditor({ overlayId }: Props) {
  const overlay = useStudioStore((s) => s.overlays.find((o) => o.id === overlayId));
  const fps = useStudioStore((s) => s.template.fps);
  const updateOverlay = useStudioStore((s) => s.updateOverlay);
  const selectedLyricLineIndex = useStudioStore((s) => s.selectedLyricLineIndex);
  const setSelectedLyricLineIndex = useStudioStore((s) => s.setSelectedLyricLineIndex);

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [lines, setLines] = useState<LyricLine[]>(() => overlay?.lyrics ?? []);
  const [importOpen, setImportOpen] = useState(false);
  const [rawText, setRawText] = useState("");
  const [secPerLine, setSecPerLine] = useState(3.0);

  // Clipboard: a deep-copied LyricLine waiting to be pasted
  const clipboardRef = useRef<LyricLine | null>(null);
  const [hasCopied, setHasCopied] = useState(false);

  // Sync local lines from store ONLY on overlay switch or external timeline additions.
  // We read the store count via a stable primitive (number) to avoid the `?? []` new-reference
  // trap that would fire the effect on every flush and cause an infinite loop.
  const lastOverlayIdRef = useRef(overlayId);
  const storeLinesCount = useStudioStore((s) => s.overlays.find((o) => o.id === overlayId)?.lyrics?.length ?? 0);
  const getStoreLines = useStudioStore.getState; // imperative read — no subscription

  useEffect(() => {
    if (overlayId !== lastOverlayIdRef.current) {
      // Switched overlay — full reset from store
      lastOverlayIdRef.current = overlayId;
      const fresh = getStoreLines().overlays.find((o) => o.id === overlayId)?.lyrics ?? [];
      setLines(fresh);
      setSelectedLyricLineIndex(null);
    } else if (storeLinesCount > lines.length) {
      // External addition (e.g. timeline + button) — pull new lines from store
      const fresh = getStoreLines().overlays.find((o) => o.id === overlayId)?.lyrics ?? [];
      setLines(fresh);
      setSelectedLyricLineIndex(fresh.length - 1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlayId, storeLinesCount]);

  const flushToStore = useCallback((updatedLines: LyricLine[]) => {
    updateOverlay(overlayId, { lyrics: updatedLines });
  }, [overlayId, updateOverlay]);

  // Keyboard: Ctrl+C / Ctrl+V for segment clipboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const active = document.activeElement;
      const isTyping = active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA");
      if (isTyping) return;

      if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        const sel = selectedLyricLineIndex;
        if (sel !== null && sel < lines.length) {
          clipboardRef.current = JSON.parse(JSON.stringify(lines[sel]));
          setHasCopied(true);
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "v") {
        if (!clipboardRef.current) return;
        e.preventDefault();
        pasteFromClipboard();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLyricLineIndex, lines]);

  if (!overlay || overlay.type !== "lyrics") return null;

  const overlayVariant = overlay.animationVariant as LyricsVariant | undefined;
  const sel = selectedLyricLineIndex !== null && selectedLyricLineIndex < lines.length ? selectedLyricLineIndex : null;
  const selectedLine = sel !== null ? lines[sel] : null;

  // ── Segment mutations ──

  function addSegment() {
    const defaultDur = Math.round(fps * 3);
    const lastEnd = lines.reduce((max, l) => Math.max(max, l.startFrame + (l.durationInFrames ?? defaultDur)), 0);
    const runningVariant = getRunningDefault(lines, lines.length, overlayVariant);
    const newLine: LyricLine = {
      text: "",
      startFrame: lastEnd,
      durationInFrames: defaultDur,
      animationVariant: runningVariant,
    };
    const next = [...lines, newLine];
    setLines(next);
    flushToStore(next);
    setSelectedLyricLineIndex(next.length - 1);
  }

  function removeSegment(i: number) {
    const next = lines.filter((_, idx) => idx !== i);
    setLines(next);
    flushToStore(next);
    if (sel !== null) {
      if (sel >= next.length) setSelectedLyricLineIndex(next.length > 0 ? next.length - 1 : null);
      else if (sel === i) setSelectedLyricLineIndex(null);
    }
  }

  function duplicateSegment(i: number) {
    const original = lines[i];
    const copy: LyricLine = {
      ...JSON.parse(JSON.stringify(original)),
      startFrame: original.startFrame + (original.durationInFrames ?? Math.round(fps * 3)),
    };
    const next = [...lines.slice(0, i + 1), copy, ...lines.slice(i + 1)];
    setLines(next);
    flushToStore(next);
    setSelectedLyricLineIndex(i + 1);
  }

  function copySegment(i: number) {
    clipboardRef.current = JSON.parse(JSON.stringify(lines[i]));
    setHasCopied(true);
  }

  function pasteFromClipboard() {
    if (!clipboardRef.current) return;
    const relFrame = Math.max(0, sharedFrameRef.current - overlay!.startFrame);
    const pasted: LyricLine = {
      ...JSON.parse(JSON.stringify(clipboardRef.current)),
      startFrame: relFrame,
    };
    // Insert after selected segment, or at end
    const insertAfter = sel !== null ? sel : lines.length - 1;
    const next = [...lines.slice(0, insertAfter + 1), pasted, ...lines.slice(insertAfter + 1)];
    setLines(next);
    flushToStore(next);
    setSelectedLyricLineIndex(insertAfter + 1);
  }

  function updateSelected(patch: Partial<LyricLine>) {
    if (sel === null) return;
    const next = lines.map((l, i) => i === sel ? { ...l, ...patch } : l);
    setLines(next);
  }

  function flushSelected() {
    flushToStore(lines);
  }

  function handleParse() {
    const framesPerLine = Math.round(secPerLine * fps);
    const runningVariant = overlayVariant ?? "fade-slide";
    const parsed: LyricLine[] = rawText
      .split("\n")
      .filter((l) => l.trim())
      .map((text, i) => ({
        text,
        startFrame: i * framesPerLine,
        durationInFrames: framesPerLine,
        animationVariant: runningVariant,
      }));
    setLines(parsed);
    flushToStore(parsed);
    setImportOpen(false);
    setSelectedLyricLineIndex(parsed.length > 0 ? 0 : null);
  }

  // Resolve effective values for the selected segment (with fallbacks to overlay-level)
  const effectiveVariant = selectedLine?.animationVariant ?? (sel !== null ? getRunningDefault(lines, sel, overlayVariant) : overlayVariant ?? "fade-slide");
  const effectiveColor = selectedLine?.color ?? overlay.color ?? "#ffffff";
  const effectiveFontFamily = selectedLine?.fontFamily ?? overlay.font?.family ?? "Outfit";
  const effectiveFontWeight = selectedLine?.fontWeight ?? overlay.font?.weight ?? 700;
  const effectiveFontSize = selectedLine?.fontSize ?? overlay.font?.size ?? 48;
  const effectiveContainerWidth = overlay.containerWidth;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Music2 size={13} className="text-[#ccff00]" />
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#F7F6E5]" style={{ fontFamily: "Unbounded, sans-serif" }}>
          Lyrics
        </p>
        <div className="flex-1" />
        {/* Paste button — shown when clipboard has content */}
        {hasCopied && (
          <button
            className="text-[8px] px-2 py-0.5 rounded flex items-center gap-1"
            style={{
              fontFamily: "Outfit, sans-serif",
              color: "#ccff00",
              background: "rgba(204,255,0,0.08)",
              border: "1px solid rgba(204,255,0,0.25)",
            }}
            title="Paste segment at playhead (Ctrl+V)"
            onClick={pasteFromClipboard}
          >
            <Clipboard size={8} />
            Paste
          </button>
        )}
        <button
          className="text-[8px] px-2 py-0.5 rounded"
          style={{
            fontFamily: "Outfit, sans-serif",
            color: "#ccff00",
            background: "rgba(204,255,0,0.1)",
            border: "1px solid rgba(204,255,0,0.3)",
          }}
          onClick={addSegment}
        >
          + Segment
        </button>
        <button
          className="text-[8px] px-2 py-0.5 rounded"
          style={{
            fontFamily: "Outfit, sans-serif",
            color: importOpen ? "#050505" : "#888",
            background: importOpen ? "#ccff00" : "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
          onClick={() => setImportOpen((v) => !v)}
        >
          {importOpen ? "Close" : "Import"}
        </button>
      </div>

      {/* Overlay-level container width */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-[9px] text-[#666]" style={{ fontFamily: "Outfit, sans-serif" }}>
            Text box width <span className="text-[#444]">(all segments)</span>
          </label>
          {effectiveContainerWidth !== undefined && (
            <button
              className="text-[8px] text-[#555] hover:text-[#888]"
              style={{ fontFamily: "Outfit, sans-serif" }}
              onClick={() => updateOverlay(overlayId, { containerWidth: undefined })}
            >
              reset
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={200}
            max={1800}
            step={10}
            value={effectiveContainerWidth ?? 600}
            onChange={(e) => updateOverlay(overlayId, { containerWidth: parseInt(e.target.value) })}
            className="flex-1 h-1 accent-[#ccff00]"
          />
          <input
            type="number"
            min={200}
            max={1800}
            step={10}
            value={effectiveContainerWidth ?? ""}
            placeholder="auto"
            onChange={(e) => {
              const v = parseInt(e.target.value);
              if (!isNaN(v) && v >= 200 && v <= 1800) updateOverlay(overlayId, { containerWidth: v });
            }}
            className="w-16 h-6 rounded px-1.5 text-[11px] text-white outline-none text-right"
            style={{
              fontFamily: "Outfit, sans-serif",
              background: "rgba(255,255,255,0.06)",
              border: `1px solid ${effectiveContainerWidth !== undefined ? "rgba(204,255,0,0.3)" : "#333"}`,
            }}
          />
          <span className="text-[9px] text-[#444]" style={{ fontFamily: "Outfit, sans-serif" }}>px</span>
        </div>
      </div>

      {/* Import */}
      {importOpen && (
        <div className="space-y-2 p-3 rounded-lg border" style={{ borderColor: "#222", background: "rgba(255,255,255,0.02)" }}>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={5}
            placeholder={"Paste all lyrics here — one line per segment\nWords flow like water\nEvery beat hits harder"}
            className="w-full rounded-lg px-3 py-2 text-xs text-white outline-none resize-y font-mono"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid #333",
              fontFamily: "monospace",
              lineHeight: 1.7,
              color: "#ccc",
            }}
          />
          <div className="flex items-center gap-2">
            <label className="text-[9px] text-[#666]" style={{ fontFamily: "Outfit, sans-serif" }}>
              Sec / line
            </label>
            <input
              type="number" min={0.5} max={30} step={0.5} value={secPerLine}
              onChange={(e) => setSecPerLine(Math.max(0.5, parseFloat(e.target.value) || 3))}
              className="w-16 h-6 text-[11px] rounded px-1.5 text-white outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid #333", fontFamily: "Outfit, sans-serif" }}
            />
            <div className="flex-1" />
            <button
              className="h-7 px-3 rounded-lg text-[10px] font-bold"
              style={{ background: "#ccff00", color: "#050505", fontFamily: "Unbounded, sans-serif", fontSize: "0.55rem" }}
              onClick={handleParse}
            >
              Parse →
            </button>
          </div>
        </div>
      )}

      {/* Segment list */}
      {lines.length > 0 && (
        <div className="space-y-0.5">
          <p className="text-[8px] text-[#444] uppercase tracking-widest px-1 mb-1" style={{ fontFamily: "Unbounded, sans-serif" }}>
            {lines.length} segment{lines.length !== 1 ? "s" : ""} — click to edit
          </p>
          {lines.map((l, i) => (
            <div
              key={i}
              role="button"
              tabIndex={0}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors"
              style={{
                background: i === sel ? "rgba(204,255,0,0.08)" : "rgba(255,255,255,0.02)",
                border: `1px solid ${i === sel ? "rgba(204,255,0,0.3)" : "transparent"}`,
              }}
              onClick={() => setSelectedLyricLineIndex(i === sel ? null : i)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setSelectedLyricLineIndex(i === sel ? null : i); }}
            >
              <span className="text-[8px] text-[#555] w-4 shrink-0 text-right tabular-nums" style={{ fontFamily: "Unbounded, sans-serif" }}>
                {i + 1}
              </span>
              <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                {l.sectionLabel && (
                  <span
                    className="text-[7px] px-1.5 py-0.5 rounded-full self-start leading-none"
                    style={{
                      fontFamily: "Outfit, sans-serif",
                      background: "rgba(204,255,0,0.12)",
                      color: "#ccff00",
                      border: "1px solid rgba(204,255,0,0.25)",
                    }}
                  >
                    {l.sectionLabel}
                  </span>
                )}
                <span className="text-[10px] truncate" style={{ fontFamily: "Outfit, sans-serif", color: i === sel ? "#fff" : "#777" }}>
                  {l.text || <span className="text-[#444] italic">empty</span>}
                </span>
              </div>
              {/* Animation variant pill */}
              {l.animationVariant && (
                <span className="text-[7px] px-1 py-0.5 rounded shrink-0" style={{ fontFamily: "Outfit, sans-serif", color: "#888", background: "rgba(255,255,255,0.05)", border: "1px solid #2a2a2a" }}>
                  {ANIMATION_VARIANTS.find(v => v.value === l.animationVariant)?.label.split(" ")[0]}
                </span>
              )}
              {/* Color swatch */}
              {l.color && (
                <div className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-white/10" style={{ background: l.color }} />
              )}
              <span className="text-[9px] tabular-nums shrink-0" style={{ fontFamily: "Outfit, sans-serif", color: "#444" }}>
                {framesToTimestamp(l.startFrame, fps)}
              </span>
              <button
                className="shrink-0 text-[#333] hover:text-[#888] transition-colors"
                onClick={(e) => { e.stopPropagation(); copySegment(i); }}
                title="Copy (Ctrl+C)"
              >
                <Copy size={10} />
              </button>
              <button
                className="shrink-0 text-[#333] hover:text-red-500 transition-colors"
                onClick={(e) => { e.stopPropagation(); removeSegment(i); }}
                title="Remove"
              >
                <Trash2 size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {lines.length === 0 && !importOpen && (
        <p className="text-[10px] text-[#444] text-center py-3" style={{ fontFamily: "Outfit, sans-serif" }}>
          Click "+ Segment" to add a lyric, or use Import to paste all at once.
        </p>
      )}

      {/* ── Selected segment editor ── */}
      {mounted && selectedLine !== null && sel !== null && (
        <div className="rounded-lg border p-3 space-y-3" style={{ borderColor: "#2a2a2a", background: "rgba(255,255,255,0.02)" }}>
          <div className="flex items-center justify-between">
            <p className="text-[8px] text-[#555] uppercase tracking-widest" style={{ fontFamily: "Unbounded, sans-serif" }}>
              Segment {sel + 1}
            </p>
            <div className="flex items-center gap-1.5">
              <button
                className="text-[8px] px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors"
                style={{ fontFamily: "Outfit, sans-serif", color: "#888", background: "rgba(255,255,255,0.04)", border: "1px solid #2a2a2a" }}
                title="Copy this segment (Ctrl+C)"
                onClick={() => copySegment(sel)}
              >
                <Copy size={8} /> Copy
              </button>
              {hasCopied && (
                <button
                  className="text-[8px] px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors"
                  style={{ fontFamily: "Outfit, sans-serif", color: "#ccff00", background: "rgba(204,255,0,0.08)", border: "1px solid rgba(204,255,0,0.25)" }}
                  title="Paste at playhead (Ctrl+V)"
                  onClick={pasteFromClipboard}
                >
                  <Clipboard size={8} /> Paste at ▶
                </button>
              )}
              <button
                className="text-[8px] px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors"
                style={{ fontFamily: "Outfit, sans-serif", color: "#888", background: "rgba(255,255,255,0.04)", border: "1px solid #2a2a2a" }}
                onClick={() => duplicateSegment(sel)}
              >
                Duplicate
              </button>
            </div>
          </div>

          {/* Section label */}
          <div className="space-y-1">
            <label className="text-[9px] text-[#666]" style={{ fontFamily: "Outfit, sans-serif" }}>Section label</label>
            <input
              type="text"
              value={selectedLine.sectionLabel ?? ""}
              onChange={(e) => updateSelected({ sectionLabel: e.target.value || undefined })}
              placeholder="Verse 1 / Chorus / Bridge…"
              className="w-full h-7 rounded px-2 text-[11px] text-white outline-none"
              style={{ fontFamily: "Outfit, sans-serif", background: "rgba(255,255,255,0.05)", border: "1px solid #333" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#ccff00")}
              onBlur={(e) => { e.currentTarget.style.borderColor = "#333"; flushSelected(); }}
            />
          </div>

          {/* Text */}
          <textarea
            value={selectedLine.text}
            onChange={(e) => updateSelected({ text: e.target.value })}
            rows={2}
            placeholder="Type lyric text here…"
            className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none resize-none"
            style={{ fontFamily: "Outfit, sans-serif", background: "rgba(255,255,255,0.05)", border: "1px solid #333", lineHeight: 1.5 }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#ccff00")}
            onBlur={(e) => { e.currentTarget.style.borderColor = "#333"; flushSelected(); }}
          />

          {/* Timing */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[9px] text-[#666]" style={{ fontFamily: "Outfit, sans-serif" }}>Start</label>
                <button
                  className="flex items-center gap-1 text-[8px] px-1.5 py-0.5 rounded"
                  style={{ fontFamily: "Outfit, sans-serif", color: "#ccff00", background: "rgba(204,255,0,0.08)", border: "1px solid rgba(204,255,0,0.2)" }}
                  title="Set to playhead"
                  onClick={() => {
                    const cf = sharedFrameRef.current ?? 0;
                    const relFrame = Math.max(0, cf - overlay.startFrame);
                    const next = lines.map((l, i) => i === sel ? { ...l, startFrame: relFrame } : l);
                    setLines(next);
                    flushToStore(next);
                  }}
                >
                  <Crosshair size={8} />↑ playhead
                </button>
              </div>
              <TimingInput
                value={selectedLine.startFrame}
                fps={fps}
                onChange={(f) => {
                  const next = lines.map((l, i) => i === sel ? { ...l, startFrame: f } : l);
                  setLines(next);
                  flushToStore(next);
                }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] text-[#666]" style={{ fontFamily: "Outfit, sans-serif" }}>Duration</label>
              <TimingInput
                value={selectedLine.durationInFrames ?? Math.round(fps * 3)}
                fps={fps}
                onChange={(f) => {
                  const next = lines.map((l, i) => i === sel ? { ...l, durationInFrames: f } : l);
                  setLines(next);
                  flushToStore(next);
                }}
              />
            </div>
          </div>

          {/* Animation variant */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[9px] text-[#666]" style={{ fontFamily: "Outfit, sans-serif" }}>
                Animation
                {selectedLine.animationVariant === undefined && (
                  <span className="text-[#444] ml-1">(cascaded)</span>
                )}
              </label>
              {selectedLine.animationVariant !== undefined && (
                <button
                  className="text-[8px] text-[#555] hover:text-[#888]"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                  onClick={() => { updateSelected({ animationVariant: undefined }); setTimeout(flushSelected, 0); }}
                >
                  reset
                </button>
              )}
            </div>
            <div className="relative">
              <select
                value={effectiveVariant}
                onChange={(e) => {
                  const val = e.target.value as LyricsVariant;
                  const next = lines.map((l, i) => i === sel ? { ...l, animationVariant: val } : l);
                  setLines(next);
                  flushToStore(next);
                }}
                className="w-full h-7 rounded px-2 pr-6 text-[11px] text-white outline-none appearance-none"
                style={{
                  fontFamily: "Outfit, sans-serif",
                  background: selectedLine.animationVariant !== undefined ? "rgba(204,255,0,0.06)" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${selectedLine.animationVariant !== undefined ? "rgba(204,255,0,0.3)" : "#333"}`,
                }}
              >
                {ANIMATION_VARIANTS.map((v) => (
                  <option key={v.value} value={v.value} style={{ background: "#1a1a1a" }}>
                    {v.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[#555]" />
            </div>
          </div>

          {/* Color */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[9px] text-[#666]" style={{ fontFamily: "Outfit, sans-serif" }}>
                Color
                {selectedLine.color === undefined && <span className="text-[#444] ml-1">(using global)</span>}
              </label>
              {selectedLine.color !== undefined && (
                <button
                  className="text-[8px] text-[#555] hover:text-[#888]"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                  onClick={() => { const next = lines.map((l, i) => { if (i !== sel) return l; const { color: _c, ...rest } = l; return rest; }); setLines(next); flushToStore(next); }}
                >
                  reset
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={effectiveColor}
                onChange={(e) => { const next = lines.map((l, i) => i === sel ? { ...l, color: e.target.value } : l); setLines(next); flushToStore(next); }}
                className="w-7 h-7 rounded cursor-pointer border-0 p-0"
                style={{ background: "none" }}
              />
              <input
                type="text"
                value={effectiveColor}
                onChange={(e) => { updateSelected({ color: e.target.value }); }}
                onBlur={flushSelected}
                maxLength={7}
                placeholder="#ffffff"
                className="flex-1 h-7 rounded px-2 text-[11px] text-white outline-none font-mono"
                style={{
                  fontFamily: "monospace",
                  background: selectedLine.color !== undefined ? "rgba(204,255,0,0.06)" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${selectedLine.color !== undefined ? "rgba(204,255,0,0.3)" : "#333"}`,
                }}
              />
            </div>
          </div>

          {/* Font family */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[9px] text-[#666]" style={{ fontFamily: "Outfit, sans-serif" }}>
                Font
                {selectedLine.fontFamily === undefined && <span className="text-[#444] ml-1">(using global)</span>}
              </label>
              {selectedLine.fontFamily !== undefined && (
                <button
                  className="text-[8px] text-[#555] hover:text-[#888]"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                  onClick={() => { const next = lines.map((l, i) => { if (i !== sel) return l; const { fontFamily: _f, ...rest } = l; return rest; }); setLines(next); flushToStore(next); }}
                >
                  reset
                </button>
              )}
            </div>
            <div className="relative">
              <select
                value={effectiveFontFamily}
                onChange={(e) => { const next = lines.map((l, i) => i === sel ? { ...l, fontFamily: e.target.value } : l); setLines(next); flushToStore(next); }}
                className="w-full h-7 rounded px-2 pr-6 text-[11px] text-white outline-none appearance-none"
                style={{
                  fontFamily: "Outfit, sans-serif",
                  background: selectedLine.fontFamily !== undefined ? "rgba(204,255,0,0.06)" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${selectedLine.fontFamily !== undefined ? "rgba(204,255,0,0.3)" : "#333"}`,
                }}
              >
                {FONT_FAMILIES.map((f) => (
                  <option key={f} value={f} style={{ background: "#1a1a1a" }}>{f}</option>
                ))}
              </select>
              <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[#555]" />
            </div>
          </div>

          {/* Font weight + size row */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[9px] text-[#666]" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Weight
                  {selectedLine.fontWeight === undefined && <span className="text-[#444] ml-1">(global)</span>}
                </label>
                {selectedLine.fontWeight !== undefined && (
                  <button
                    className="text-[8px] text-[#555] hover:text-[#888]"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                    onClick={() => { const next = lines.map((l, i) => { if (i !== sel) return l; const { fontWeight: _w, ...rest } = l; return rest; }); setLines(next); flushToStore(next); }}
                  >
                    reset
                  </button>
                )}
              </div>
              <div className="relative">
                <select
                  value={effectiveFontWeight}
                  onChange={(e) => { const w = parseInt(e.target.value); const next = lines.map((l, i) => i === sel ? { ...l, fontWeight: w } : l); setLines(next); flushToStore(next); }}
                  className="w-full h-7 rounded px-2 pr-6 text-[11px] text-white outline-none appearance-none"
                  style={{
                    fontFamily: "Outfit, sans-serif",
                    background: selectedLine.fontWeight !== undefined ? "rgba(204,255,0,0.06)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${selectedLine.fontWeight !== undefined ? "rgba(204,255,0,0.3)" : "#333"}`,
                  }}
                >
                  {FONT_WEIGHTS.map((w) => (
                    <option key={w} value={w} style={{ background: "#1a1a1a" }}>{w}</option>
                  ))}
                </select>
                <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[#555]" />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[9px] text-[#666]" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Size
                  {selectedLine.fontSize === undefined && <span className="text-[#444] ml-1">(global)</span>}
                </label>
                {selectedLine.fontSize !== undefined && (
                  <button
                    className="text-[8px] text-[#555] hover:text-[#888]"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                    onClick={() => { const next = lines.map((l, i) => { if (i !== sel) return l; const { fontSize: _f, ...rest } = l; return rest; }); setLines(next); flushToStore(next); }}
                  >
                    reset
                  </button>
                )}
              </div>
              <input
                type="number"
                min={12}
                max={200}
                step={2}
                value={effectiveFontSize}
                onChange={(e) => {
                  const v = parseInt(e.target.value);
                  if (!isNaN(v) && v >= 12 && v <= 200) {
                    const next = lines.map((l, i) => i === sel ? { ...l, fontSize: v } : l);
                    setLines(next);
                    flushToStore(next);
                  }
                }}
                className="w-full h-7 rounded px-2 text-[11px] text-white outline-none"
                style={{
                  fontFamily: "Outfit, sans-serif",
                  background: selectedLine.fontSize !== undefined ? "rgba(204,255,0,0.06)" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${selectedLine.fontSize !== undefined ? "rgba(204,255,0,0.3)" : "#333"}`,
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Isolated timing input — fully local, commits on blur/Enter
function TimingInput({ value, fps, onChange }: { value: number; fps: number; onChange: (f: number) => void }) {
  const [local, setLocal] = useState(() => framesToTimestamp(value, fps));
  const editing = useRef(false);

  useEffect(() => {
    if (!editing.current) setLocal(framesToTimestamp(value, fps));
  }, [value, fps]);

  function commit() {
    editing.current = false;
    const f = parseTimestamp(local, fps);
    if (f !== null && f >= 0) onChange(f);
    else setLocal(framesToTimestamp(value, fps));
  }

  return (
    <input
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onFocus={(e) => { editing.current = true; e.currentTarget.select(); }}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
      className="w-full h-7 rounded px-2 text-[11px] text-white outline-none"
      style={{ fontFamily: "Outfit, sans-serif", background: "rgba(255,255,255,0.05)", border: "1px solid #333" }}
      onFocusCapture={(e) => (e.currentTarget.style.borderColor = "#ccff00")}
      onBlurCapture={(e) => (e.currentTarget.style.borderColor = "#333")}
    />
  );
}
