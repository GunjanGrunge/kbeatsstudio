"use client";

import { useState, useCallback } from "react";
import { HexColorPicker } from "react-colorful";
import { X, Search, Loader2 } from "lucide-react";
import { useStudioStore } from "@/store/studioStore";
import { Slider } from "@/components/ui/slider";
import type { MotionBgStyle, MotionBgConfig } from "@/types/studio";

interface PixabayHit {
  id: number;
  tags: string;
  videos: {
    medium: { url: string };
    tiny: { thumbnail: string };
  };
}

interface StyleOption {
  value: MotionBgStyle;
  label: string;
  description: string;
}

const STYLE_OPTIONS: StyleOption[] = [
  { value: "gradient-shift",  label: "Liquid Chromatic", description: "Oil-slick spring colour blobs" },
  { value: "particle-field",  label: "Stellar Drift",    description: "3-layer depth particles + sparks" },
  { value: "aurora",          label: "Plasma Aurora",    description: "Organic ribbons, breathing glow" },
  { value: "noise-wave",      label: "Ink Drop",         description: "Ink-in-water spring expansion" },
  { value: "geometric-pulse", label: "Geo Pulse",        description: "Orbiting shapes with light trails" },
  { value: "neon-grid",       label: "Neon Grid",        description: "Synthwave perspective grid floor" },
  { value: "cyber-rain",      label: "Cyber Rain",       description: "Matrix glyphs + kanji digital rain" },
  { value: "frequency-wave",  label: "EQ Spectrum",      description: "Ring visualiser + slam EQ bars" },
  { value: "lyrics-float",    label: "Lyrics Float",     description: "Words drift, zoom, burst, strafe" },
  { value: "pixabay-video",   label: "Pixabay Video",    description: "Search stock motion videos" },
];

const DEFAULT_PALETTES: { label: string; colors: [string, string, string, string] }[] = [
  { label: "KBeats",      colors: ["#0a0a0a", "#ccff00", "#1a1a1a", "#aadd00"] },
  { label: "Neon Night",  colors: ["#0d0d2b", "#6600cc", "#00ccff", "#cc00ff"] },
  { label: "Fire",        colors: ["#1a0000", "#ff2200", "#ff8800", "#ffcc00"] },
  { label: "Ocean Deep",  colors: ["#000d1a", "#004466", "#0099cc", "#00ccaa"] },
  { label: "Midnight",    colors: ["#050505", "#0f172a", "#1e1b4b", "#312e81"] },
  { label: "Rose Gold",   colors: ["#1a0510", "#5c1a3a", "#cc3366", "#ff9966"] },
  { label: "Cyber",       colors: ["#000d08", "#00ff88", "#0088ff", "#ff0088"] },
];

interface Props {
  overlayId: string;
}

export function MotionBackgroundControl({ overlayId }: Props) {
  const overlay = useStudioStore((s) => s.overlays.find((o) => o.id === overlayId));
  const overlays = useStudioStore((s) => s.overlays);
  const updateOverlay = useStudioStore((s) => s.updateOverlay);

  const [editingColorIdx, setEditingColorIdx] = useState<number | null>(null);
  const [pixabayQuery, setPixabayQuery] = useState("");
  const [pixabayResults, setPixabayResults] = useState<PixabayHit[]>([]);
  const [pixabayLoading, setPixabayLoading] = useState(false);
  const [pixabayError, setPixabayError] = useState<string | null>(null);

  const searchPixabay = useCallback(async () => {
    if (!pixabayQuery.trim()) return;
    setPixabayLoading(true);
    setPixabayError(null);
    try {
      const res = await fetch(`/api/pixabay/search?q=${encodeURIComponent(pixabayQuery)}&per_page=20`);
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setPixabayResults(data.hits ?? []);
    } catch {
      setPixabayError("Could not load results. Check your API key.");
    } finally {
      setPixabayLoading(false);
    }
  }, [pixabayQuery]);

  if (!overlay) return null;

  const cfg: MotionBgConfig = overlay.motionBg ?? {
    style: "gradient-shift",
    colors: ["#0d0d2b", "#1a0533", "#0a1a2e", "#050505"],
    speed: 1,
    intensity: 0.8,
    lyricsSourceId: "all",
  };

  function patch(partial: Partial<MotionBgConfig>) {
    updateOverlay(overlayId, { motionBg: { ...cfg, ...partial } as never });
  }

  function patchColor(idx: number, hex: string) {
    const next = [...cfg.colors] as typeof cfg.colors;
    next[idx] = hex;
    patch({ colors: next });
  }

  // Lyrics overlays available as sources
  const lyricsOverlays = overlays.filter(
    (o) => o.id !== overlayId && (o.type === "lyrics" || o.type === "lyrics-chords")
  );

  return (
    <div className="space-y-5">

      {/* ── Style picker ──────────────────────────────────── */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#F7F6E5]" style={{ fontFamily: "Unbounded, sans-serif" }}>
          Style
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {STYLE_OPTIONS.map((opt) => {
            const isActive = cfg.style === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => patch({ style: opt.value })}
                className="rounded-lg p-2.5 text-left transition-all duration-150"
                style={{
                  background: isActive ? "rgba(204,255,0,0.08)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${isActive ? "rgba(204,255,0,0.35)" : "rgba(255,255,255,0.07)"}`,
                }}
              >
                <p className="text-[11px] font-medium leading-tight"
                  style={{ fontFamily: "Outfit, sans-serif", color: isActive ? "#ccff00" : "#cccccc" }}>
                  {opt.label}
                </p>
                <p className="text-[9px] mt-0.5 leading-tight"
                  style={{ fontFamily: "Outfit, sans-serif", color: "#777777" }}>
                  {opt.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Pixabay Video search (only when style = pixabay-video) ── */}
      {cfg.style === "pixabay-video" && (
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#F7F6E5]" style={{ fontFamily: "Unbounded, sans-serif" }}>
            Search Videos
          </p>

          {/* Search input */}
          <div className="flex gap-1.5">
            <input
              type="text"
              value={pixabayQuery}
              onChange={(e) => setPixabayQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchPixabay()}
              placeholder="e.g. abstract, fire, space..."
              className="flex-1 rounded-lg px-3 py-2 text-xs outline-none focus:ring-1"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#cccccc",
                fontFamily: "Outfit, sans-serif",
              }}
            />
            <button
              onClick={searchPixabay}
              disabled={pixabayLoading}
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
              style={{
                background: "rgba(204,255,0,0.12)",
                border: "1px solid rgba(204,255,0,0.3)",
                color: "#ccff00",
                flexShrink: 0,
              }}
            >
              {pixabayLoading
                ? <Loader2 size={13} className="animate-spin" />
                : <Search size={13} />}
            </button>
          </div>

          {/* Error */}
          {pixabayError && (
            <p className="text-[10px] text-red-400" style={{ fontFamily: "Outfit, sans-serif" }}>
              {pixabayError}
            </p>
          )}

          {/* Currently selected video */}
          {cfg.pixabayThumbUrl && (
            <div className="space-y-1">
              <p className="text-[9px] text-[#777777]" style={{ fontFamily: "Outfit, sans-serif" }}>Selected</p>
              <img
                src={cfg.pixabayThumbUrl}
                alt="Selected background"
                className="w-full rounded-lg object-cover"
                style={{ height: 60, outline: "2px solid #ccff00", outlineOffset: 2 }}
              />
            </div>
          )}

          {/* Video fit toggle */}
          {cfg.pixabayVideoUrl && (
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#F7F6E5]" style={{ fontFamily: "Unbounded, sans-serif" }}>
                Fit
              </p>
              <div className="flex gap-1.5">
                {(["cover", "contain", "fill"] as const).map((fit) => {
                  const isActive = (cfg.videoFit ?? "cover") === fit;
                  return (
                    <button
                      key={fit}
                      onClick={() => patch({ videoFit: fit })}
                      className="flex-1 py-1.5 rounded-lg text-[10px] capitalize transition-all"
                      style={{
                        background: isActive ? "rgba(204,255,0,0.08)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${isActive ? "rgba(204,255,0,0.35)" : "rgba(255,255,255,0.07)"}`,
                        color: isActive ? "#ccff00" : "#777777",
                        fontFamily: "Outfit, sans-serif",
                      }}
                    >
                      {fit}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Results grid */}
          {pixabayResults.length > 0 && (
            <div className="grid grid-cols-2 gap-1.5 max-h-64 overflow-y-auto pr-0.5">
              {pixabayResults.map((hit) => {
                const isSelected = cfg.pixabayVideoId === hit.id;
                return (
                  <button
                    key={hit.id}
                    onClick={() => patch({
                      pixabayVideoUrl: hit.videos.medium.url,
                      pixabayVideoId: hit.id,
                      pixabayThumbUrl: hit.videos.tiny.thumbnail,
                    })}
                    className="relative rounded-lg overflow-hidden transition-all"
                    style={{
                      outline: isSelected ? "2px solid #ccff00" : "1px solid rgba(255,255,255,0.08)",
                      outlineOffset: isSelected ? 2 : 0,
                    }}
                    title={hit.tags}
                  >
                    <img
                      src={hit.videos.tiny.thumbnail}
                      alt={hit.tags}
                      className="w-full object-cover"
                      style={{ height: 52 }}
                    />
                    {isSelected && (
                      <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ background: "rgba(204,255,0,0.15)" }}
                      >
                        <div className="w-2 h-2 rounded-full bg-[#ccff00]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {!pixabayLoading && pixabayResults.length === 0 && pixabayQuery && !pixabayError && (
            <p className="text-[10px] text-[#555555]" style={{ fontFamily: "Outfit, sans-serif" }}>
              No results. Try a different search term.
            </p>
          )}
        </div>
      )}

      {/* ── Colour palette presets ────────────────────────── */}
      <div className="space-y-2" style={{ display: cfg.style === "pixabay-video" ? "none" : undefined }}>
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#F7F6E5]" style={{ fontFamily: "Unbounded, sans-serif" }}>
          Colour Palette
        </p>
        <div className="flex flex-wrap gap-1.5">
          {DEFAULT_PALETTES.map((p) => {
            const isActive =
              cfg.colors[0] === p.colors[0] &&
              cfg.colors[1] === p.colors[1];
            return (
              <button
                key={p.label}
                onClick={() => patch({ colors: p.colors })}
                title={p.label}
                className="flex gap-0.5 rounded overflow-hidden"
                style={{
                  outline: isActive ? "2px solid #ccff00" : "1px solid rgba(255,255,255,0.1)",
                  outlineOffset: 1,
                }}
              >
                {p.colors.map((c, i) => (
                  <div key={i} style={{ width: 14, height: 20, background: c }} />
                ))}
              </button>
            );
          })}
        </div>

        {/* Individual colour swatches */}
        <div className="flex gap-2 mt-1.5">
          {[0, 1, 2, 3].map((idx) => {
            const c = cfg.colors[idx] ?? "#050505";
            return (
              <div key={idx} className="flex flex-col items-center gap-1">
                <button
                  className="w-8 h-8 rounded-lg border"
                  style={{
                    background: c,
                    borderColor: editingColorIdx === idx ? "#ccff00" : "rgba(255,255,255,0.12)",
                  }}
                  onClick={() => setEditingColorIdx(editingColorIdx === idx ? null : idx)}
                />
                <span className="text-[8px] text-[#555555]" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {idx + 1}
                </span>
              </div>
            );
          })}
        </div>

        {editingColorIdx !== null && (
          <div className="mt-1 relative">
            <button
              className="absolute top-1 right-1 z-10 text-[#555555] hover:text-white"
              onClick={() => setEditingColorIdx(null)}
            >
              <X size={12} />
            </button>
            <HexColorPicker
              color={cfg.colors[editingColorIdx] ?? "#050505"}
              onChange={(hex) => patchColor(editingColorIdx, hex)}
              style={{ width: "100%" }}
            />
          </div>
        )}
      </div>

      {/* ── Speed + Intensity (hidden for pixabay-video) ─────── */}
      {cfg.style !== "pixabay-video" && (
        <>
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] text-[#F7F6E5]" style={{ fontFamily: "Outfit, sans-serif" }}>
              <span>Speed</span>
              <span>{cfg.speed.toFixed(1)}×</span>
            </div>
            <Slider
              min={0.1} max={3} step={0.1}
              value={[cfg.speed]}
              onValueChange={([v]) => patch({ speed: v })}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] text-[#F7F6E5]" style={{ fontFamily: "Outfit, sans-serif" }}>
              <span>Intensity</span>
              <span>{Math.round(cfg.intensity * 100)}%</span>
            </div>
            <Slider
              min={0.1} max={1} step={0.01}
              value={[cfg.intensity]}
              onValueChange={([v]) => patch({ intensity: v })}
            />
          </div>
        </>
      )}

      {/* ── Lyrics Float source (only when style = lyrics-float) ── */}
      {cfg.style === "lyrics-float" && (
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#F7F6E5]" style={{ fontFamily: "Unbounded, sans-serif" }}>
            Lyrics Source
          </p>

          {/* Source selector */}
          <div className="space-y-1">
            <button
              onClick={() => patch({ lyricsSourceId: "all" })}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs transition-colors"
              style={{
                background: (!cfg.lyricsSourceId || cfg.lyricsSourceId === "all") ? "rgba(204,255,0,0.08)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${(!cfg.lyricsSourceId || cfg.lyricsSourceId === "all") ? "rgba(204,255,0,0.3)" : "rgba(255,255,255,0.07)"}`,
                color: (!cfg.lyricsSourceId || cfg.lyricsSourceId === "all") ? "#ccff00" : "#aaaaaa",
                fontFamily: "Outfit, sans-serif",
              }}
            >
              All Lyrics Overlays
            </button>

            {lyricsOverlays.map((ov) => {
              const isActive = cfg.lyricsSourceId === ov.id;
              return (
                <button
                  key={ov.id}
                  onClick={() => patch({ lyricsSourceId: ov.id })}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs transition-colors"
                  style={{
                    background: isActive ? "rgba(204,255,0,0.08)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${isActive ? "rgba(204,255,0,0.3)" : "rgba(255,255,255,0.07)"}`,
                    color: isActive ? "#ccff00" : "#aaaaaa",
                    fontFamily: "Outfit, sans-serif",
                  }}
                >
                  {ov.label}
                </button>
              );
            })}

            {lyricsOverlays.length === 0 && (
              <p className="text-[10px] text-[#555555] px-1" style={{ fontFamily: "Outfit, sans-serif" }}>
                No lyrics overlays found. Add one or type custom words below.
              </p>
            )}
          </div>

          {/* Custom lyrics text */}
          <div className="space-y-1">
            <p className="text-[10px] text-[#777777]" style={{ fontFamily: "Outfit, sans-serif" }}>
              Extra words (optional)
            </p>
            <textarea
              rows={3}
              placeholder="Paste additional lyrics or words here..."
              value={cfg.customLyricsText ?? ""}
              onChange={(e) => patch({ customLyricsText: e.target.value })}
              className="w-full rounded-lg px-3 py-2 text-xs resize-none outline-none focus:ring-1"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#cccccc",
                fontFamily: "Outfit, sans-serif",
                lineHeight: 1.5,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
