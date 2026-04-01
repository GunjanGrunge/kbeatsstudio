"use client";

import { useState, useEffect, useRef } from "react";
import { HexColorPicker } from "react-colorful";
import { useStudioStore } from "@/store/studioStore";
import { parseFullLyrics, parseChordsFromLine } from "@/lib/parseChords";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Music2, ChevronDown, ChevronUp, Crosshair } from "lucide-react";
import type { LyricLine, WordStyle } from "@/types/studio";
import type { LyricsVariant } from "@/types/studio";

interface Props {
  overlayId: string;
}

// Timestamp helpers
function framesToSeconds(frames: number, fps: number): string {
  const secs = frames / fps;
  const m = Math.floor(secs / 60);
  const s = (secs % 60).toFixed(1);
  return m > 0 ? `${m}:${String(Math.floor(secs % 60)).padStart(2, "0")}.${String(Math.round((secs % 1) * 10))}` : `${s}s`;
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

// Word styling state cycling: none → bold → italic → bold+italic → none
type WordStyleState = "none" | "bold" | "italic" | "bold-italic";
function cycleStyle(ws: WordStyle | undefined): Partial<WordStyle> {
  const isBold = ws?.bold ?? false;
  const isItalic = ws?.italic ?? false;
  if (!isBold && !isItalic) return { bold: true, italic: false };
  if (isBold && !isItalic) return { bold: false, italic: true };
  if (!isBold && isItalic) return { bold: true, italic: true };
  return { bold: false, italic: false };
}

// Per-line editor component
function LineEditor({
  line,
  lineIndex,
  fps,
  overlayColor,
  overlayFont,
  onUpdate,
  currentFrame,
}: {
  line: LyricLine;
  lineIndex: number;
  fps: number;
  overlayColor: string;
  overlayFont?: { family: string; size: number; weight: number };
  onUpdate: (updated: LyricLine) => void;
  currentFrame: number;
}) {
  const [expanded, setExpanded] = useState(lineIndex === 0);
  const [startInput, setStartInput] = useState(() => framesToSeconds(line.startFrame, fps));
  const [durInput, setDurInput] = useState(() => framesToSeconds(line.durationInFrames ?? 90, fps));
  const [colorPickerWord, setColorPickerWord] = useState<number | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Re-sync inputs when line changes externally
  useEffect(() => {
    setStartInput(framesToSeconds(line.startFrame, fps));
    setDurInput(framesToSeconds(line.durationInFrames ?? 90, fps));
  }, [line.startFrame, line.durationInFrames, fps]);

  // Close color picker on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setColorPickerWord(null);
      }
    }
    if (colorPickerWord !== null) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [colorPickerWord]);

  const words = line.text.split(" ");
  const styleMap = new Map((line.wordStyles ?? []).map((ws) => [ws.wordIndex, ws]));

  function updateWordStyle(wordIdx: number, patch: Partial<WordStyle>) {
    const existing = styleMap.get(wordIdx) ?? { wordIndex: wordIdx };
    const merged = { ...existing, ...patch };
    // Remove entry if fully default
    const isDefault =
      !merged.bold && !merged.italic && !merged.color && (!merged.scale || merged.scale === 1);
    const newStyles = (line.wordStyles ?? []).filter((ws) => ws.wordIndex !== wordIdx);
    onUpdate({ ...line, wordStyles: isDefault ? newStyles : [...newStyles, merged] });
  }

  function handleStartBlur() {
    const f = parseTimestamp(startInput, fps);
    if (f !== null) {
      onUpdate({ ...line, startFrame: f });
    } else {
      setStartInput(framesToSeconds(line.startFrame, fps));
    }
  }

  function handleDurBlur() {
    const f = parseTimestamp(durInput, fps);
    if (f !== null && f >= 1) {
      onUpdate({ ...line, durationInFrames: f });
    } else {
      setDurInput(framesToSeconds(line.durationInFrames ?? 90, fps));
    }
  }

  const SCALE_OPTIONS = [1, 1.3, 1.6];

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{ borderColor: "#222222", background: "rgba(255,255,255,0.02)" }}
    >
      {/* Header row */}
      <button
        className="w-full flex items-center justify-between px-3 py-2 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <span
          className="text-[11px] truncate flex-1 mr-2"
          style={{
            fontFamily: "Outfit, sans-serif",
            color: "#aaaaaa",
            maxWidth: 180,
          }}
        >
          <span className="text-[#F7F6E5] mr-1.5" style={{ fontFamily: "Unbounded, sans-serif", fontSize: 9 }}>
            {lineIndex + 1}
          </span>
          {line.text || <span className="text-[#F7F6E5]">empty line</span>}
        </span>
        <span className="text-[#F7F6E5] text-[9px]" style={{ fontFamily: "Outfit, sans-serif" }}>
          {framesToSeconds(line.startFrame, fps)}
        </span>
        {expanded ? (
          <ChevronUp size={12} className="text-[#F7F6E5] ml-1.5 shrink-0" />
        ) : (
          <ChevronDown size={12} className="text-[#F7F6E5] ml-1.5 shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t" style={{ borderColor: "#1a1a1c" }}>
          {/* Timing row */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-[9px] text-[#F7F6E5]" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Start
                </Label>
                <button
                  className="flex items-center gap-1 text-[8px] px-1.5 py-0.5 rounded transition-colors"
                  style={{
                    fontFamily: "Outfit, sans-serif",
                    color: "#ccff00",
                    background: "rgba(204,255,0,0.08)",
                    border: "1px solid rgba(204,255,0,0.2)",
                  }}
                  title="Set start to current playhead position"
                  onClick={() => {
                    onUpdate({ ...line, startFrame: currentFrame });
                    setStartInput(framesToSeconds(currentFrame, fps));
                  }}
                >
                  <Crosshair size={8} />
                  {framesToSeconds(currentFrame, fps)}
                </button>
              </div>
              <Input
                value={startInput}
                onChange={(e) => setStartInput(e.target.value)}
                onBlur={handleStartBlur}
                onFocus={(e) => e.currentTarget.select()}
                placeholder="0:00 or 5s"
                className="h-7 text-[11px] bg-[rgba(255,255,255,0.04)] border-[#333] text-white"
                style={{ fontFamily: "Outfit, sans-serif" }}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] text-[#F7F6E5]" style={{ fontFamily: "Outfit, sans-serif" }}>
                Duration
              </Label>
              <Input
                value={durInput}
                onChange={(e) => setDurInput(e.target.value)}
                onBlur={handleDurBlur}
                onFocus={(e) => e.currentTarget.select()}
                placeholder="3s"
                className="h-7 text-[11px] bg-[rgba(255,255,255,0.04)] border-[#333] text-white"
                style={{ fontFamily: "Outfit, sans-serif" }}
              />
            </div>
          </div>

          {/* Word styling */}
          {words.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[9px] text-[#F7F6E5]" style={{ fontFamily: "Outfit, sans-serif" }}>
                Word styles — tap to bold/italic, color dot to set color
              </p>
              <div className="flex flex-wrap gap-1">
                {words.map((word, wi) => {
                  const ws = styleMap.get(wi);
                  const isBold = ws?.bold ?? false;
                  const isItalic = ws?.italic ?? false;
                  const wordColor = ws?.color ?? overlayColor;
                  const wordScale = ws?.scale ?? 1;
                  const hasCustomStyle = isBold || isItalic || ws?.color || (ws?.scale && ws.scale !== 1);

                  return (
                    <div key={wi} className="flex items-center gap-0.5">
                      {/* Word chip */}
                      <button
                        onClick={() => updateWordStyle(wi, cycleStyle(ws))}
                        className="px-2 py-0.5 rounded text-[11px] transition-all"
                        style={{
                          fontFamily: `${overlayFont?.family ?? "Outfit"}, sans-serif`,
                          fontWeight: isBold ? 900 : overlayFont?.weight ?? 700,
                          fontStyle: isItalic ? "italic" : "normal",
                          color: wordColor,
                          background: hasCustomStyle ? "rgba(204,255,0,0.07)" : "rgba(255,255,255,0.05)",
                          border: `1px solid ${hasCustomStyle ? "rgba(204,255,0,0.25)" : "rgba(255,255,255,0.08)"}`,
                          fontSize: 11,
                        }}
                      >
                        {word}
                      </button>

                      {/* Scale toggle */}
                      <button
                        onClick={() => {
                          const current = ws?.scale ?? 1;
                          const nextIdx = (SCALE_OPTIONS.indexOf(current) + 1) % SCALE_OPTIONS.length;
                          updateWordStyle(wi, { ...cycleStyle(undefined), bold: ws?.bold, italic: ws?.italic, scale: SCALE_OPTIONS[nextIdx] });
                        }}
                        className="text-[8px] px-1 rounded"
                        style={{
                          fontFamily: "Outfit, sans-serif",
                          color: wordScale !== 1 ? "#ccff00" : "#444",
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.06)",
                        }}
                        title="Cycle size: 1× → 1.3× → 1.6×"
                      >
                        {wordScale === 1 ? "1×" : wordScale === 1.3 ? "↑" : "↑↑"}
                      </button>

                      {/* Color swatch */}
                      <div className="relative">
                        <button
                          onClick={() => setColorPickerWord(colorPickerWord === wi ? null : wi)}
                          className="w-4 h-4 rounded-sm border transition-all"
                          style={{
                            background: ws?.color ?? "transparent",
                            borderColor: ws?.color ? ws.color : "rgba(255,255,255,0.15)",
                          }}
                          title="Set word color"
                        />
                        {colorPickerWord === wi && (
                          <div
                            ref={pickerRef}
                            className="absolute z-50 top-6 left-0"
                            style={{ filter: "drop-shadow(0 4px 24px rgba(0,0,0,0.6))" }}
                          >
                            <div
                              className="rounded-lg p-2 border"
                              style={{ background: "#111", borderColor: "#333" }}
                            >
                              <HexColorPicker
                                color={ws?.color ?? overlayColor}
                                onChange={(c) => updateWordStyle(wi, { color: c })}
                                style={{ width: 160 }}
                              />
                              {ws?.color && (
                                <button
                                  className="mt-1.5 w-full text-[9px] text-[#F7F6E5] hover:text-[#ccff00]"
                                  style={{ fontFamily: "Outfit, sans-serif" }}
                                  onClick={() => {
                                    const { color: _, ...rest } = ws;
                                    const cleaned = Object.keys(rest).length > 1 ? rest : undefined;
                                    onUpdate({
                                      ...line,
                                      wordStyles: (line.wordStyles ?? []).filter((s) => s.wordIndex !== wi),
                                    });
                                    setColorPickerWord(null);
                                  }}
                                >
                                  Reset color
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[9px] text-[#3a3a3a]" style={{ fontFamily: "Outfit, sans-serif" }}>
                Click word to cycle B / I / B+I — click color dot to pick color
              </p>
            </div>
          )}

          {/* Inline styled preview for this line */}
          <div
            className="rounded-lg p-2.5 border"
            style={{ background: "rgba(0,0,0,0.4)", borderColor: "#1a1a1c" }}
          >
            <p className="text-[8px] text-[#333] mb-1.5 uppercase tracking-widest" style={{ fontFamily: "Unbounded, sans-serif" }}>
              Preview
            </p>
            <div
              style={{
                fontFamily: `${overlayFont?.family ?? "Outfit"}, sans-serif`,
                fontSize: Math.min(overlayFont?.size ?? 52, 18),
                fontWeight: overlayFont?.weight ?? 700,
                display: "flex",
                flexWrap: "wrap",
                gap: "0.2em",
              }}
            >
              {words.map((word, wi) => {
                const ws = styleMap.get(wi);
                return (
                  <span
                    key={wi}
                    style={{
                      color: ws?.color ?? overlayColor,
                      fontWeight: ws?.bold ? 900 : overlayFont?.weight ?? 700,
                      fontStyle: ws?.italic ? "italic" : "normal",
                      fontSize: ws?.scale ? `${Math.min((overlayFont?.size ?? 52) * ws.scale, 24)}px` : undefined,
                    }}
                  >
                    {word}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function buildRawText(overlay: ReturnType<typeof useStudioStore.getState>["overlays"][number] | undefined): string {
  if (!overlay) return "";
  if (overlay.type === "lyrics") {
    return overlay.lyrics?.map((l) => l.text).join("\n") ?? "";
  }
  if (overlay.type === "lyrics-chords") {
    return overlay.chords?.map((l) => {
      let line = l.lyric;
      const sortedChords = [...(l.chords ?? [])].sort((a, b) => b.charOffset - a.charOffset);
      for (const ct of sortedChords) {
        line = line.slice(0, ct.charOffset) + `[${ct.chord}]` + line.slice(ct.charOffset);
      }
      return line;
    }).join("\n") ?? "";
  }
  return "";
}

export function LyricsEditor({ overlayId }: Props) {
  const overlay = useStudioStore((s) => s.overlays.find((o) => o.id === overlayId));
  const fps = useStudioStore((s) => s.template.fps);
  const updateOverlay = useStudioStore((s) => s.updateOverlay);
  const currentFrame = useStudioStore((s) => s.currentFrame);

  const [rawText, setRawText] = useState<string>(() => buildRawText(overlay));
  const [secPerLine, setSecPerLine] = useState(3.0);

  useEffect(() => {
    setRawText(buildRawText(overlay));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlayId]);

  if (!overlay || (overlay.type !== "lyrics" && overlay.type !== "lyrics-chords")) return null;

  const isChords = overlay.type === "lyrics-chords";
  const lines = (overlay.lyrics ?? []) as LyricLine[];
  const overlayColor = overlay.color ?? "#ffffff";
  const font = overlay.font;

  function handleParse() {
    const framesPerLine = Math.round(secPerLine * fps);
    if (isChords) {
      const chordLines = parseFullLyrics(rawText, 0, framesPerLine);
      updateOverlay(overlayId, { chords: chordLines });
    } else {
      const parsed = rawText.split("\n").filter((l) => l.trim()).map((text, i) => ({
        text,
        startFrame: i * framesPerLine,
        durationInFrames: framesPerLine,
      }));
      updateOverlay(overlayId, { lyrics: parsed });
    }
  }

  function handleLineUpdate(index: number, updated: LyricLine) {
    const newLines = lines.map((l, i) => (i === index ? updated : l));
    updateOverlay(overlayId, { lyrics: newLines });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Music2 size={13} className="text-[#ccff00]" />
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#F7F6E5]" style={{ fontFamily: "Unbounded, sans-serif" }}>
          {isChords ? "Lyrics + Chords" : "Lyrics"}
        </p>
      </div>

      {isChords && (
        <div className="p-3 rounded-lg border border-[rgba(204,255,0,0.15)] bg-[rgba(204,255,0,0.04)]">
          <p className="text-[10px] text-[#F7F6E5]" style={{ fontFamily: "Outfit, sans-serif", lineHeight: 1.6 }}>
            Format: <span className="text-[#ccff00] font-mono">[Am]Hello [G]world</span>
            <br />
            Chord names in brackets appear above the word.
          </p>
        </div>
      )}

      {/* Quick-paste textarea */}
      <div className="space-y-1.5">
        <Label className="text-[10px] text-[#F7F6E5]" style={{ fontFamily: "Outfit, sans-serif" }}>
          {isChords ? "Paste lyrics (with chord notation)" : "Paste lyrics — one line per row"}
        </Label>
        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          rows={5}
          placeholder={
            isChords
              ? "[Am]Words flow [G]like water\n[F]Every beat [C]hits harder"
              : "Words flow like water\nEvery beat hits harder"
          }
          className="w-full rounded-lg px-3 py-2 text-xs text-white outline-none resize-y font-mono"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid #333333",
            fontFamily: "monospace",
            lineHeight: 1.7,
            color: "#cccccc",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "#ccff00")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#333333")}
        />
      </div>

      {/* Duration per line + Parse button */}
      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1">
          <Label className="text-[9px] text-[#F7F6E5]" style={{ fontFamily: "Outfit, sans-serif" }}>
            Seconds per line
          </Label>
          <Input
            type="number"
            min={0.5}
            max={30}
            step={0.5}
            value={secPerLine}
            onChange={(e) => setSecPerLine(Math.max(0.5, parseFloat(e.target.value) || 3))}
            className="h-8 text-xs bg-[rgba(255,255,255,0.05)] border-[#333333] text-white"
            style={{ fontFamily: "Outfit, sans-serif" }}
          />
        </div>
        <button
          className="h-8 px-4 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-200 shrink-0"
          style={{
            background: "#ccff00",
            color: "#050505",
            fontFamily: "Unbounded, sans-serif",
            fontSize: "0.6rem",
            letterSpacing: "0.08em",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#b3e600"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#ccff00"; }}
          onClick={handleParse}
        >
          Parse →
        </button>
      </div>

      {/* Per-line editors — only for lyrics (not chords, which has a different structure) */}
      {!isChords && lines.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[9px] text-[#F7F6E5] uppercase tracking-widest" style={{ fontFamily: "Unbounded, sans-serif" }}>
            Per-line editing
          </p>
          <div className="space-y-1">
            {lines.map((line, i) => (
              <LineEditor
                key={i}
                line={line}
                lineIndex={i}
                fps={fps}
                overlayColor={overlayColor}
                overlayFont={font ? { family: font.family, size: font.size, weight: font.weight } : undefined}
                onUpdate={(updated) => handleLineUpdate(i, updated)}
                currentFrame={currentFrame}
              />
            ))}
          </div>
        </div>
      )}

      {/* Full styled preview */}
      {lines.length > 0 && !isChords && (
        <div className="rounded-lg p-3 border border-[#222222] bg-[rgba(0,0,0,0.4)]">
          <p className="text-[9px] text-[#F7F6E5] mb-2 uppercase tracking-widest" style={{ fontFamily: "Unbounded, sans-serif" }}>
            Preview — all lines
          </p>
          <div className="space-y-1">
            {lines.map((line, i) => {
              const words = line.text.split(" ");
              const styleMap = new Map((line.wordStyles ?? []).map((ws) => [ws.wordIndex, ws]));
              const displayFontSize = Math.min(font?.size ?? 52, 16);
              return (
                <div
                  key={i}
                  style={{
                    fontFamily: `${font?.family ?? "Outfit"}, sans-serif`,
                    fontSize: displayFontSize,
                    fontWeight: font?.weight ?? 700,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "0.2em",
                    textAlign: font?.align ?? "center",
                    justifyContent: font?.align === "left" ? "flex-start" : font?.align === "right" ? "flex-end" : "center",
                  }}
                >
                  {words.map((word, wi) => {
                    const ws = styleMap.get(wi);
                    return (
                      <span
                        key={wi}
                        style={{
                          color: ws?.color ?? overlayColor,
                          fontWeight: ws?.bold ? 900 : font?.weight ?? 700,
                          fontStyle: ws?.italic ? "italic" : "normal",
                          fontSize: ws?.scale ? `${displayFontSize * ws.scale}px` : undefined,
                        }}
                      >
                        {word}
                      </span>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Chords: simple preview */}
      {isChords && rawText && (
        <div className="rounded-lg p-3 border border-[#222222] bg-[rgba(0,0,0,0.4)]">
          <p className="text-[9px] text-[#F7F6E5] mb-1.5 uppercase tracking-widest" style={{ fontFamily: "Unbounded, sans-serif" }}>
            Preview
          </p>
          {rawText.split("\n").filter(Boolean).slice(0, 4).map((line, i) => {
            const { lyric, chords } = parseChordsFromLine(line);
            return (
              <div key={i} className="mb-1">
                <div className="text-[10px] text-[#ccff00] font-mono">
                  {chords.map((c) => c.chord).join(" ")}
                </div>
                <div className="text-xs" style={{ fontFamily: "Outfit, sans-serif", color: overlayColor }}>
                  {lyric}
                </div>
              </div>
            );
          })}
          {rawText.split("\n").filter(Boolean).length > 4 && (
            <p className="text-[9px] text-[#F7F6E5]">
              +{rawText.split("\n").filter(Boolean).length - 4} more lines
            </p>
          )}
        </div>
      )}
    </div>
  );
}
