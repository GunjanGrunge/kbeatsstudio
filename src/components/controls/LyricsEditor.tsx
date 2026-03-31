"use client";

import { useState, useEffect } from "react";
import { useStudioStore } from "@/store/studioStore";
import { parseFullLyrics, parseChordsFromLine } from "@/lib/parseChords";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Music2 } from "lucide-react";

interface Props {
  overlayId: string;
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
  const [framesPerLine, setFramesPerLine] = useState(90);
  const [rawText, setRawText] = useState<string>(() => buildRawText(overlay));

  // Re-sync rawText when switching to a different overlay
  useEffect(() => {
    setRawText(buildRawText(overlay));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlayId]);

  if (!overlay || (overlay.type !== "lyrics" && overlay.type !== "lyrics-chords")) return null;

  const handleApply = () => {
    if (overlay.type === "lyrics") {
      const lines = rawText.split("\n").filter((l) => l.trim()).map((text, i) => ({
        text,
        startFrame: i * framesPerLine,
        durationInFrames: framesPerLine,
      }));
      updateOverlay(overlayId, { lyrics: lines });
    } else {
      const chordLines = parseFullLyrics(rawText, 0, framesPerLine);
      updateOverlay(overlayId, { chords: chordLines });
    }
  };

  const isChords = overlay.type === "lyrics-chords";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Music2 size={13} className="text-[#ccff00]" />
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#555555]" style={{ fontFamily: "Unbounded, sans-serif" }}>
          {isChords ? "Lyrics + Chords" : "Lyrics"}
        </p>
      </div>

      {isChords && (
        <div className="p-3 rounded-lg border border-[rgba(204,255,0,0.15)] bg-[rgba(204,255,0,0.04)]">
          <p className="text-[10px] text-[#888888]" style={{ fontFamily: "Outfit, sans-serif", lineHeight: 1.6 }}>
            Format: <span className="text-[#ccff00] font-mono">[Am]Hello [G]world</span>
            <br />
            Chord names in brackets appear above the word.
          </p>
        </div>
      )}

      {/* Text area */}
      <div className="space-y-1.5">
        <Label className="text-[10px] text-[#555555]" style={{ fontFamily: "Outfit, sans-serif" }}>
          {isChords ? "Lyrics (with chord notation)" : "Lyrics (one line per row)"}
        </Label>
        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          rows={6}
          placeholder={isChords ? "[Am]Words flow [G]like water\n[F]Every beat [C]hits harder" : "Words flow like water\nEvery beat hits harder"}
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

      {/* Frames per line */}
      <div className="space-y-1">
        <Label className="text-[10px] text-[#555555]" style={{ fontFamily: "Outfit, sans-serif" }}>
          Frames per line ({Math.round(framesPerLine / fps * 10) / 10}s)
        </Label>
        <Input
          type="number"
          min={15}
          max={300}
          value={framesPerLine}
          onChange={(e) => setFramesPerLine(Math.max(15, parseInt(e.target.value) || 90))}
          className="h-8 text-xs bg-[rgba(255,255,255,0.05)] border-[#333333] text-white"
          style={{ fontFamily: "Outfit, sans-serif" }}
        />
      </div>

      {/* Apply button */}
      <button
        className="w-full py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200"
        style={{
          background: "#ccff00",
          color: "#050505",
          fontFamily: "Unbounded, sans-serif",
          fontSize: "0.65rem",
          letterSpacing: "0.1em",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#b3e600"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#ccff00"; }}
        onClick={handleApply}
      >
        Apply Lyrics
      </button>

      {/* Preview */}
      {rawText && (
        <div className="rounded-lg p-3 border border-[#222222] bg-[rgba(0,0,0,0.4)]">
          <p className="text-[9px] text-[#444444] mb-1.5 uppercase tracking-widest" style={{ fontFamily: "Unbounded, sans-serif" }}>
            Preview
          </p>
          {rawText.split("\n").filter(Boolean).slice(0, 4).map((line, i) => {
            if (isChords) {
              const { lyric, chords } = parseChordsFromLine(line);
              return (
                <div key={i} className="mb-1">
                  <div className="text-[10px] text-[#ccff00] font-mono">
                    {chords.map((c) => c.chord).join(" ")}
                  </div>
                  <div className="text-xs text-white" style={{ fontFamily: "Outfit, sans-serif" }}>
                    {lyric}
                  </div>
                </div>
              );
            }
            return (
              <div key={i} className="text-xs text-white mb-0.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                {line}
              </div>
            );
          })}
          {rawText.split("\n").filter(Boolean).length > 4 && (
            <p className="text-[9px] text-[#444444]">+{rawText.split("\n").filter(Boolean).length - 4} more lines</p>
          )}
        </div>
      )}
    </div>
  );
}
