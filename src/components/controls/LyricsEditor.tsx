"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useStudioStore } from "@/store/studioStore";
import { sharedFrameRef } from "@/lib/sharedRefs";
import { parseFullLyrics, parseChordsFromLine } from "@/lib/parseChords";
import { Music2, Crosshair, Trash2, Plus } from "lucide-react";
import type { LyricLine } from "@/types/studio";

interface Props {
  overlayId: string;
}

function framesToTimestamp(frames: number, fps: number): string {
  const secs = frames / fps;
  const m = Math.floor(secs / 60);
  const s = (secs % 60).toFixed(1);
  return m > 0
    ? `${m}:${String(Math.floor(secs % 60)).padStart(2, "0")}.${String(Math.round((secs % 1) * 10))}`
    : `${s}s`;
}

function parseTimestamp(input: string, fps: number): number | null {
  const t = input.trim().replace(/s$/i, "");
  const colonMatch = t.match(/^(\d+):(\d{1,2})(?:\.(\d))?$/);
  if (colonMatch) {
    const mins = parseInt(colonMatch[1]);
    const secs = parseInt(colonMatch[2]);
    const tenth = colonMatch[3] ? parseInt(colonMatch[3]) : 0;
    if (secs >= 60) return null;
    return Math.round((mins * 60 + secs + tenth / 10) * fps);
  }
  const numMatch = t.match(/^(\d+(?:\.\d+)?)$/);
  if (numMatch) return Math.round(parseFloat(numMatch[1]) * fps);
  return null;
}

export function LyricsEditor({ overlayId }: Props) {
  const overlay = useStudioStore((s) => s.overlays.find((o) => o.id === overlayId));
  const fps = useStudioStore((s) => s.template.fps);
  const updateOverlay = useStudioStore((s) => s.updateOverlay);
  const selectedLyricLineIndex = useStudioStore((s) => s.selectedLyricLineIndex);
  const setSelectedLyricLineIndex = useStudioStore((s) => s.setSelectedLyricLineIndex);

  // sharedFrameRef from StudioShell is always current — no subscribe needed

  // Defer client-only state to avoid hydration mismatch with server render
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // ── Local copy of lines — the source of truth while editing ──
  const [lines, setLines] = useState<LyricLine[]>(() => overlay?.lyrics ?? []);
  const [importOpen, setImportOpen] = useState(false);
  const [rawText, setRawText] = useState("");
  const [secPerLine, setSecPerLine] = useState(3.0);

  // Sync local lines FROM store:
  //   - always when overlayId changes (switching overlays)
  //   - when store has MORE lines than local state (external addition, e.g. timeline + button)
  //   - NEVER when store has the same or fewer lines (that would overwrite local edits in progress)
  const lastOverlayIdRef = useRef(overlayId);
  const storeLines = useStudioStore((s) => s.overlays.find((o) => o.id === overlayId)?.lyrics ?? []);

  useEffect(() => {
    if (overlayId !== lastOverlayIdRef.current) {
      // Switched to a different overlay — full reset
      lastOverlayIdRef.current = overlayId;
      setLines(storeLines);
      setSelectedLyricLineIndex(null);
    } else if (storeLines.length > lines.length) {
      // Store has more lines than local — an external add happened (e.g. timeline + button)
      setLines(storeLines);
      setSelectedLyricLineIndex(storeLines.length - 1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlayId, storeLines.length]);

  // ── Flush local lines → store (called explicitly, not on every keystroke) ──
  const flushToStore = useCallback((updatedLines: LyricLine[]) => {
    updateOverlay(overlayId, { lyrics: updatedLines });
  }, [overlayId, updateOverlay]);

  if (!overlay || overlay.type !== "lyrics") return null;

  const sel = selectedLyricLineIndex !== null && selectedLyricLineIndex < lines.length ? selectedLyricLineIndex : null;
  const selectedLine = sel !== null ? lines[sel] : null;

  // ── Segment list mutations ──
  function addSegment() {
    const defaultDur = Math.round(fps * 3);
    // Place new segment after the last existing segment (not at playhead — avoids stacking at frame 0)
    const lastEnd = lines.reduce((max, l) => Math.max(max, l.startFrame + (l.durationInFrames ?? defaultDur)), 0);
    const newLine: LyricLine = { text: "", startFrame: lastEnd, durationInFrames: defaultDur };
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

  function updateSelected(patch: Partial<LyricLine>) {
    if (sel === null) return;
    const next = lines.map((l, i) => i === sel ? { ...l, ...patch } : l);
    setLines(next);
    // Don't flush on every keystroke — flushed on blur
  }

  function flushSelected() {
    flushToStore(lines);
  }

  function handleParse() {
    const framesPerLine = Math.round(secPerLine * fps);
    const parsed: LyricLine[] = rawText
      .split("\n")
      .filter((l) => l.trim())
      .map((text, i) => ({
        text,
        startFrame: i * framesPerLine,
        durationInFrames: framesPerLine,
      }));
    setLines(parsed);
    flushToStore(parsed);
    setImportOpen(false);
    setSelectedLyricLineIndex(parsed.length > 0 ? 0 : null);
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Music2 size={13} className="text-[#ccff00]" />
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#F7F6E5]" style={{ fontFamily: "Unbounded, sans-serif" }}>
          Lyrics
        </p>
        <div className="flex-1" />
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
              <span className="text-[10px] truncate flex-1" style={{ fontFamily: "Outfit, sans-serif", color: i === sel ? "#fff" : "#777" }}>
                {l.text || <span className="text-[#444] italic">empty</span>}
              </span>
              <span className="text-[9px] tabular-nums shrink-0" style={{ fontFamily: "Outfit, sans-serif", color: "#444" }}>
                {framesToTimestamp(l.startFrame, fps)}
              </span>
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

      {/* Editor for selected segment — mounted guard prevents hydration mismatch */}
      {mounted && selectedLine !== null && sel !== null && (
        <div className="rounded-lg border p-3 space-y-3" style={{ borderColor: "#2a2a2a", background: "rgba(255,255,255,0.02)" }}>
          <p className="text-[8px] text-[#555] uppercase tracking-widest" style={{ fontFamily: "Unbounded, sans-serif" }}>
            Segment {sel + 1}
          </p>

          {/* Text — pure local, no store write until blur */}
          <textarea
            value={selectedLine.text}
            onChange={(e) => updateSelected({ text: e.target.value })}
            rows={2}
            placeholder="Type lyric text here…"
            className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none resize-none"
            style={{
              fontFamily: "Outfit, sans-serif",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid #333",
              lineHeight: 1.5,
            }}
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
                  style={{
                    fontFamily: "Outfit, sans-serif",
                    color: "#ccff00",
                    background: "rgba(204,255,0,0.08)",
                    border: "1px solid rgba(204,255,0,0.2)",
                  }}
                  title="Set to playhead"
                  onClick={() => {
                    const cf = sharedFrameRef.current ?? 0;
                    const relFrame = Math.max(0, cf - overlay.startFrame);
                    updateSelected({ startFrame: relFrame });
                    // Flush immediately for timing changes
                    const next = lines.map((l, i) => i === sel ? { ...l, startFrame: relFrame } : l);
                    setLines(next);
                    flushToStore(next);
                  }}
                >
                  <Crosshair size={8} />
                  ↑ playhead
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
      style={{
        fontFamily: "Outfit, sans-serif",
        background: "rgba(255,255,255,0.05)",
        border: "1px solid #333",
      }}
      onFocusCapture={(e) => (e.currentTarget.style.borderColor = "#ccff00")}
      onBlurCapture={(e) => (e.currentTarget.style.borderColor = "#333")}
    />
  );
}
