"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import { type PlayerRef } from "@remotion/player";
import { useStudioStore } from "@/store/studioStore";
import { sharedFrameRef } from "@/lib/sharedRefs";
import type { OverlayConfig, OverlayType, LyricLine } from "@/types/studio";
import {
  Music2, PlayCircle, Camera, Waves, Type, Image, Sparkles, Film, LucideProps,
  Play, Pause, SkipBack, ZoomIn, ZoomOut, Plus, PencilRuler, Gauge, Crop, AudioLines, Trash2, Upload, Copy, ClipboardPaste, Scissors, SplitSquareHorizontal,
} from "lucide-react";
import type { TimelineRegion, TimelineRegionType } from "@/types/studio";

/* ── constants ─────────────────────────────────────────────── */
const TRACK_H = 28;
const HEADER_H = 28;
const LABEL_W = 140;
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 8;

/* ── icon / colour maps ────────────────────────────────────── */
const OVERLAY_ICONS: Record<OverlayType, React.ComponentType<LucideProps>> = {
  "yt-subscribe": PlayCircle,
  "yt-like": PlayCircle,
  "ig-follow": Camera,
  "ig-like": Camera,
  "ig-share": Camera,
  lyrics: Music2,
  "lyrics-chords": Music2,
  waveform: Waves,
  text: Type,
  image: Image,
  "video-clip": Film,
  "motion-background": Sparkles,
  annotation: PencilRuler,
};

const OVERLAY_COLORS: Record<OverlayType, string> = {
  "yt-subscribe": "#ff4444",
  "yt-like": "#ff4444",
  "ig-follow": "#e1306c",
  "ig-like": "#ff306c",
  "ig-share": "#833ab4",
  lyrics: "#ccff00",
  "lyrics-chords": "#a8d400",
  waveform: "#ccff00",
  text: "#F7F6E5",
  image: "#ff9900",
  "video-clip": "#66aaff",
  "motion-background": "#aa44ff",
  annotation: "#ccff00",
};

const REGION_ICONS: Record<TimelineRegionType, React.ComponentType<LucideProps>> = {
  speed: Gauge,
  audio: AudioLines,
  crop: Crop,
};

/* ── helpers ───────────────────────────────────────────────── */
function fmtTime(frames: number, fps: number) {
  const secs = frames / fps;
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = Math.floor(secs % 60).toString().padStart(2, "0");
  const f = Math.floor(frames % fps).toString().padStart(2, "0");
  return `${m}:${s}:${f}`;
}

/* ── TrackLabel (fixed left column, never scrolls) ─────────── */
function TrackLabel({ overlay, isSelected }: { overlay: OverlayConfig; isSelected: boolean }) {
  const selectOverlay = useStudioStore((s) => s.selectOverlay);
  const toggleVisibility = useStudioStore((s) => s.toggleOverlayVisibility);
  const Icon = OVERLAY_ICONS[overlay.type];
  const color = OVERLAY_COLORS[overlay.type];

  return (
    <div
      className="flex items-center gap-1.5 px-2 cursor-pointer select-none transition-colors duration-150"
      style={{
        height: TRACK_H,
        background: isSelected ? "rgba(204,255,0,0.05)" : "transparent",
        borderRight: "1px solid #1e1e1e",
        borderBottom: "1px solid #141414",
      }}
      onClick={() => selectOverlay(overlay.id)}
    >
      <Icon size={11} color={color} style={{ flexShrink: 0 }} />
      <span
        className="flex-1 truncate text-[10px]"
        style={{ fontFamily: "Outfit, sans-serif", color: isSelected ? "#ffffff" : "#bbbbbb", fontWeight: isSelected ? 500 : 400 }}
      >
        {overlay.label}
      </span>
      <button
        className="transition-colors"
        style={{ color: overlay.visible ? "#555" : "#333" }}
        onClick={(e) => { e.stopPropagation(); toggleVisibility(overlay.id); }}
      >
        <span style={{ fontSize: 9 }}>{overlay.visible ? "●" : "○"}</span>
      </button>
    </div>
  );
}

/* ── TrackClip ──────────────────────────────────────────────── */
function TrackClip({ overlay, isSelected, pxPerFrame, totalFrames }: {
  overlay: OverlayConfig; isSelected: boolean; pxPerFrame: number; totalFrames: number;
}) {
  const selectOverlay = useStudioStore((s) => s.selectOverlay);
  const updateOverlay = useStudioStore((s) => s.updateOverlay);
  const color = OVERLAY_COLORS[overlay.type];
  const [hoverResize, setHoverResize] = useState(false);

  const left = overlay.startFrame * pxPerFrame;
  const width = Math.max(8, overlay.durationInFrames * pxPerFrame);

  const dragRef = useRef<{ startX: number; origStart: number } | null>(null);
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    selectOverlay(overlay.id);
    dragRef.current = { startX: e.clientX, origStart: overlay.startFrame };
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const newStart = Math.max(0, Math.round(dragRef.current.origStart + (ev.clientX - dragRef.current.startX) / pxPerFrame));
      updateOverlay(overlay.id, { startFrame: Math.min(newStart, totalFrames - overlay.durationInFrames) });
    };
    const onUp = () => { dragRef.current = null; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [overlay, pxPerFrame, totalFrames, selectOverlay, updateOverlay]);

  const resizeDragRef = useRef<{ startX: number; origDur: number } | null>(null);
  const onResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    resizeDragRef.current = { startX: e.clientX, origDur: overlay.durationInFrames };
    const onMove = (ev: MouseEvent) => {
      if (!resizeDragRef.current) return;
      const newDur = Math.max(1, Math.round(resizeDragRef.current.origDur + (ev.clientX - resizeDragRef.current.startX) / pxPerFrame));
      updateOverlay(overlay.id, { durationInFrames: Math.min(newDur, totalFrames - overlay.startFrame) });
    };
    const onUp = () => { resizeDragRef.current = null; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [overlay, pxPerFrame, totalFrames, updateOverlay]);

  return (
    <div
      style={{
        position: "absolute", left, top: 3, width, height: TRACK_H - 6,
        borderRadius: 4,
        background: isSelected ? `${color}33` : `${color}1a`,
        border: `1px solid ${isSelected ? color : color + "66"}`,
        cursor: "grab", overflow: "hidden",
        display: "flex", alignItems: "center", paddingLeft: 6,
        boxSizing: "border-box", userSelect: "none",
      }}
      onMouseDown={onMouseDown}
    >
      <span className="truncate text-[9px] pointer-events-none" style={{ fontFamily: "Outfit, sans-serif", color, opacity: 0.9, paddingRight: 14 }}>
        {overlay.label}
      </span>
      {/* Resize handle — 12px wide, visible on hover */}
      <div
        style={{
          position: "absolute", right: 0, top: 0, width: 12, height: "100%",
          cursor: "ew-resize",
          background: hoverResize ? `${color}88` : `${color}33`,
          transition: "background 0.1s",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
        onMouseEnter={() => setHoverResize(true)}
        onMouseLeave={() => setHoverResize(false)}
        onMouseDown={onResizeMouseDown}
      >
        <div style={{ width: 2, height: 10, borderRadius: 1, background: color, opacity: hoverResize ? 1 : 0.4 }} />
      </div>
    </div>
  );
}

/* ── LyricSegmentClip ───────────────────────────────────────── */
function LyricSegmentClip({ overlayId, overlayStartFrame, line, lineIndex, isSelected, pxPerFrame, totalFrames, color }: {
  overlayId: string; overlayStartFrame: number; line: LyricLine; lineIndex: number;
  isSelected: boolean; pxPerFrame: number; totalFrames: number; color: string;
}) {
  const selectOverlay = useStudioStore((s) => s.selectOverlay);
  const setSelectedLyricLineIndex = useStudioStore((s) => s.setSelectedLyricLineIndex);
  const updateLyricLine = useStudioStore((s) => s.updateLyricLine);
  const [hoverResize, setHoverResize] = useState(false);

  const lineDur = line.durationInFrames ?? 90;
  const left = (overlayStartFrame + line.startFrame) * pxPerFrame;
  const width = Math.max(8, lineDur * pxPerFrame);

  const dragRef = useRef<{ startX: number; origLineStart: number } | null>(null);
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    selectOverlay(overlayId);
    setSelectedLyricLineIndex(lineIndex);
    dragRef.current = { startX: e.clientX, origLineStart: line.startFrame };
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const newRelStart = Math.max(0, Math.round(dragRef.current.origLineStart + (ev.clientX - dragRef.current.startX) / pxPerFrame));
      updateLyricLine(overlayId, lineIndex, { startFrame: Math.min(newRelStart, Math.max(0, totalFrames - overlayStartFrame - lineDur)) });
    };
    const onUp = () => { dragRef.current = null; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [line, lineIndex, overlayId, overlayStartFrame, pxPerFrame, totalFrames, lineDur, selectOverlay, setSelectedLyricLineIndex, updateLyricLine]);

  const resizeDragRef = useRef<{ startX: number; origDur: number } | null>(null);
  const onResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    resizeDragRef.current = { startX: e.clientX, origDur: lineDur };
    const onMove = (ev: MouseEvent) => {
      if (!resizeDragRef.current) return;
      const newDur = Math.max(1, Math.round(resizeDragRef.current.origDur + (ev.clientX - resizeDragRef.current.startX) / pxPerFrame));
      updateLyricLine(overlayId, lineIndex, { durationInFrames: newDur });
    };
    const onUp = () => { resizeDragRef.current = null; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [lineDur, lineIndex, overlayId, pxPerFrame, updateLyricLine]);

  return (
    <div
      style={{
        position: "absolute", left, top: 3, width, height: TRACK_H - 6,
        borderRadius: 4,
        background: isSelected ? `${color}44` : `${color}22`,
        border: `1px solid ${isSelected ? color : color + "55"}`,
        cursor: "grab", overflow: "hidden",
        display: "flex", alignItems: "center", paddingLeft: 5,
        boxSizing: "border-box", userSelect: "none",
      }}
      onMouseDown={onMouseDown}
    >
      <span className="truncate pointer-events-none" style={{ fontFamily: "Outfit, sans-serif", fontSize: 8, color, opacity: 0.9, paddingRight: 14 }}>
        {line.text || `seg ${lineIndex + 1}`}
      </span>
      {/* Resize handle — 12px wide, visible on hover */}
      <div
        style={{
          position: "absolute", right: 0, top: 0, width: 12, height: "100%",
          cursor: "ew-resize",
          background: hoverResize ? `${color}88` : `${color}33`,
          transition: "background 0.1s",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
        onMouseEnter={() => setHoverResize(true)}
        onMouseLeave={() => setHoverResize(false)}
        onMouseDown={onResizeMouseDown}
      >
        <div style={{ width: 2, height: 10, borderRadius: 1, background: color, opacity: hoverResize ? 1 : 0.4 }} />
      </div>
    </div>
  );
}

/* ── AddLyricLineButton ─────────────────────────────────────── */
function AddLyricLineButton({ overlayId, overlayStartFrame, pxPerFrame, color }: {
  overlayId: string; overlayStartFrame: number; pxPerFrame: number; color: string;
}) {
  const addLyricLine = useStudioStore((s) => s.addLyricLine);
  const setSelectedLyricLineIndex = useStudioStore((s) => s.setSelectedLyricLineIndex);
  const selectOverlay = useStudioStore((s) => s.selectOverlay);
  const overlays = useStudioStore((s) => s.overlays);

  const overlay = overlays.find((o) => o.id === overlayId);
  const lines = overlay?.lyrics ?? [];

  const lastEnd = lines.reduce((max, l) => Math.max(max, overlayStartFrame + l.startFrame + (l.durationInFrames ?? 90)), overlayStartFrame);
  const btnLeft = lastEnd * pxPerFrame + 4;

  const handleAdd = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!overlay) return;
    // Place after the last existing segment to avoid overlap
    const defaultDur = 90;
    const lastEnd = lines.reduce((max, l) => Math.max(max, l.startFrame + (l.durationInFrames ?? defaultDur)), 0);
    addLyricLine(overlayId, { text: "", startFrame: lastEnd, durationInFrames: defaultDur });
    selectOverlay(overlayId);
    setSelectedLyricLineIndex(lines.length);
  }, [overlay, overlayId, lines, addLyricLine, selectOverlay, setSelectedLyricLineIndex]);

  return (
    <div style={{ position: "absolute", left: btnLeft, top: "50%", transform: "translateY(-50%)", zIndex: 5 }}>
      <button
        title="Add lyric segment at playhead"
        onClick={handleAdd}
        style={{
          width: 16, height: 16, borderRadius: "50%",
          background: `${color}22`, border: `1px solid ${color}66`,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", color,
        }}
      >
        <Plus size={9} />
      </button>
    </div>
  );
}

function TimelineRegionClip({ region, pxPerFrame, totalFrames, isSelected, onSelect }: {
  region: TimelineRegion;
  pxPerFrame: number;
  totalFrames: number;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const updateTimelineRegion = useStudioStore((s) => s.updateTimelineRegion);
  const removeTimelineRegion = useStudioStore((s) => s.removeTimelineRegion);
  const Icon = REGION_ICONS[region.type];
  const left = region.startFrame * pxPerFrame;
  const width = Math.max(18, region.durationInFrames * pxPerFrame);

  const dragRef = useRef<{ startX: number; origStart: number } | null>(null);
  const resizeRef = useRef<{ startX: number; origDur: number } | null>(null);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    dragRef.current = { startX: e.clientX, origStart: region.startFrame };
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const next = Math.max(0, Math.round(dragRef.current.origStart + (ev.clientX - dragRef.current.startX) / pxPerFrame));
      updateTimelineRegion(region.id, { startFrame: Math.min(next, totalFrames - region.durationInFrames) });
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [region, pxPerFrame, totalFrames, updateTimelineRegion]);

  const onResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    resizeRef.current = { startX: e.clientX, origDur: region.durationInFrames };
    const onMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return;
      const next = Math.max(1, Math.round(resizeRef.current.origDur + (ev.clientX - resizeRef.current.startX) / pxPerFrame));
      updateTimelineRegion(region.id, { durationInFrames: Math.min(next, totalFrames - region.startFrame) });
    };
    const onUp = () => {
      resizeRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [region, pxPerFrame, totalFrames, updateTimelineRegion]);

  return (
    <div
      style={{
        position: "absolute",
        left,
        top: 4,
        width,
        height: TRACK_H - 8,
        borderRadius: 4,
        border: `1px solid ${region.color}`,
        background: isSelected ? `${region.color}36` : `${region.color}24`,
        color: region.color,
        display: "flex",
        alignItems: "center",
        gap: 5,
        paddingLeft: 6,
        paddingRight: 18,
        cursor: "grab",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
      onMouseDown={(e) => {
        onSelect(region.id);
        onMouseDown(e);
      }}
    >
      <Icon size={10} style={{ flexShrink: 0 }} />
      <span className="truncate text-[9px]" style={{ fontFamily: "Outfit, sans-serif" }}>
        {region.label}
      </span>
      <button
        title="Remove region"
        style={{ position: "absolute", right: 3, color: region.color, opacity: 0.75 }}
        onClick={(e) => {
          e.stopPropagation();
          removeTimelineRegion(region.id);
        }}
      >
        <Trash2 size={9} />
      </button>
      <div
        style={{ position: "absolute", right: 0, top: 0, width: 8, height: "100%", cursor: "ew-resize" }}
        onMouseDown={onResizeMouseDown}
      />
    </div>
  );
}

function TimelineRegionInspector({ regionId }: { regionId: string | null }) {
  const region = useStudioStore((s) => s.timelineRegions.find((r) => r.id === regionId));
  const updateTimelineRegion = useStudioStore((s) => s.updateTimelineRegion);
  const projectId = useStudioStore((s) => s.projectId);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  if (!region) return null;

  const update = (patch: Partial<TimelineRegion>) => updateTimelineRegion(region.id, patch);

  const uploadAudio = async (file: File) => {
    if (!projectId) return;
    setUploading(true);
    try {
      const res = await fetch("/api/s3/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          fileName: file.name,
          contentType: file.type,
          fileType: "audio",
          uniqueKey: `region-${region.id}`,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Upload failed");
      const { uploadUrl, publicUrl } = await res.json();
      await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      update({ audioSrc: publicUrl, label: file.name.replace(/\.[^.]+$/, "").slice(0, 28) || "Audio Bed" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-2 overflow-hidden">
      <span className="text-[9px] uppercase tracking-widest" style={{ color: region.color, fontFamily: "Unbounded, sans-serif" }}>
        {region.type}
      </span>
      <input
        value={region.label}
        onChange={(e) => update({ label: e.target.value })}
        className="h-6 w-28 rounded border px-2 text-[10px] text-white outline-none"
        style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)", fontFamily: "Outfit, sans-serif" }}
      />
      {region.type === "speed" && (
        <>
          <span className="text-[9px]" style={{ color: "#777" }}>Speed</span>
          {[0.5, 1, 1.5, 2].map((speed) => (
            <button
              key={speed}
              className="rounded border px-1.5 py-0.5 text-[9px]"
              style={{
                background: region.speed === speed ? `${region.color}24` : "rgba(255,255,255,0.03)",
                borderColor: region.speed === speed ? region.color : "rgba(255,255,255,0.08)",
                color: region.speed === speed ? region.color : "#777",
              }}
              onClick={() => update({ speed, label: `Speed ${speed}x` })}
            >
              {speed}x
            </button>
          ))}
        </>
      )}
      {region.type === "audio" && (
        <>
          <input
            ref={fileRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadAudio(file);
              e.currentTarget.value = "";
            }}
          />
          <button
            className="flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9px]"
            style={{ borderColor: region.audioSrc ? region.color : "rgba(255,255,255,0.08)", color: region.audioSrc ? region.color : "#777" }}
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={9} />
            {uploading ? "Uploading" : region.audioSrc ? "Replace" : "Upload"}
          </button>
          <span className="text-[9px]" style={{ color: "#777" }}>Vol</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={region.volume ?? 0.6}
            onChange={(e) => update({ volume: Number(e.target.value) })}
            className="w-20"
          />
        </>
      )}
      {region.type === "crop" && (
        <>
          {(["x", "y", "width", "height"] as const).map((key) => (
            <label key={key} className="flex items-center gap-1 text-[9px]" style={{ color: "#777" }}>
              {key === "width" ? "W" : key === "height" ? "H" : key.toUpperCase()}
              <input
                type="number"
                min={0}
                max={100}
                value={region.crop?.[key] ?? (key === "width" || key === "height" ? 80 : 10)}
                onChange={(e) => update({ crop: { ...(region.crop ?? { x: 10, y: 10, width: 80, height: 80 }), [key]: Number(e.target.value) } })}
                className="h-6 w-12 rounded border px-1 text-[10px] text-white outline-none"
                style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }}
              />
            </label>
          ))}
        </>
      )}
    </div>
  );
}

/* ── main component ────────────────────────────────────────── */
interface Props {
  playerRef: React.RefObject<PlayerRef | null>;
  isPlaying: boolean;
}

export function TimelinePanel({ playerRef, isPlaying }: Props) {
  const overlays = useStudioStore((s) => s.overlays);
  const selectedId = useStudioStore((s) => s.selectedOverlayId);
  const durationInFrames = useStudioStore((s) => s.durationInFrames);
  const fps = useStudioStore((s) => s.template.fps);
  const currentFrame = useStudioStore((s) => s.currentFrame);
  const setCurrentFrameStore = useStudioStore((s) => s.setCurrentFrame);
  const selectedLyricLineIndex = useStudioStore((s) => s.selectedLyricLineIndex);
  const inMarker = useStudioStore((s) => s.inMarker);
  const outMarker = useStudioStore((s) => s.outMarker);
  const setInMarker = useStudioStore((s) => s.setInMarker);
  const setOutMarker = useStudioStore((s) => s.setOutMarker);
  const timelineRegions = useStudioStore((s) => s.timelineRegions);
  const addTimelineRegion = useStudioStore((s) => s.addTimelineRegion);
  const removeOverlay = useStudioStore((s) => s.removeOverlay);
  const duplicateOverlay = useStudioStore((s) => s.duplicateOverlay);
  const copyOverlay = useStudioStore((s) => s.copyOverlay);
  const cutOverlay = useStudioStore((s) => s.cutOverlay);
  const pasteOverlay = useStudioStore((s) => s.pasteOverlay);
  const splitOverlayAtFrame = useStudioStore((s) => s.splitOverlayAtFrame);
  const snapOverlayToBeat = useStudioStore((s) => s.snapOverlayToBeat);
  const bpm = useStudioStore((s) => s.bpm);
  const setBpm = useStudioStore((s) => s.setBpm);
  const removeTimelineRegion = useStudioStore((s) => s.removeTimelineRegion);
  const splitTimelineRegionAtFrame = useStudioStore((s) => s.splitTimelineRegionAtFrame);
  const [zoom, setZoom] = useState(1);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [bpmInput, setBpmInput] = useState<string>(bpm !== null ? String(bpm) : "");

  // Single scroll container ref — ruler + tracks scroll together as one unit
  const scrollRef = useRef<HTMLDivElement>(null);

  // DOM refs updated by rAF — no React re-renders for playhead movement
  const playheadDomRef = useRef<HTMLDivElement>(null);
  const timecodeDomRef = useRef<HTMLSpanElement>(null);
  const pxPerFrameRef = useRef((80 / fps) * zoom);

  const pxPerFrame = (80 / fps) * zoom;
  pxPerFrameRef.current = pxPerFrame;

  const totalWidth = Math.max(durationInFrames * pxPerFrame, 600);

  // rAF loop: reads sharedFrameRef, moves playhead DOM and timecode directly
  // Playhead is INSIDE the scrollable content, so left = frame * pxPerFrame only
  useEffect(() => {
    let rafId: number;
    const tick = () => {
      const x = sharedFrameRef.current * pxPerFrameRef.current;
      if (playheadDomRef.current) playheadDomRef.current.style.left = `${x}px`;
      if (timecodeDomRef.current) timecodeDomRef.current.textContent = fmtTime(sharedFrameRef.current, fps);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [fps]);

  // Seek: click/drag on the ruler area. scrollRef.getBoundingClientRect() gives
  // the left edge of the scrollable area (after the label column), so we only
  // need scrollLeft to convert clientX to a content-relative pixel offset.
  const seekTo = useCallback((clientX: number) => {
    if (!scrollRef.current) return;
    const rect = scrollRef.current.getBoundingClientRect();
    const x = clientX - rect.left + scrollRef.current.scrollLeft;
    const frame = Math.max(0, Math.min(durationInFrames - 1, Math.round(x / pxPerFrameRef.current)));
    sharedFrameRef.current = frame;
    setCurrentFrameStore(frame);
    playerRef.current?.seekTo(frame);
  }, [durationInFrames, playerRef, setCurrentFrameStore]);

  const onRulerMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    seekTo(e.clientX);
    const onMove = (ev: MouseEvent) => seekTo(ev.clientX);
    const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [seekTo]);

  const reversedOverlays = [...overlays].reverse();

  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      if (mod && (e.key === "+" || e.key === "=")) {
        e.preventDefault();
        setZoom((z) => Math.min(MAX_ZOOM, +(z * 1.4).toFixed(2)));
        return;
      }
      if (mod && e.key === "-") {
        e.preventDefault();
        setZoom((z) => Math.max(MIN_ZOOM, +(z / 1.4).toFixed(2)));
        return;
      }
      if (mod && e.key === "0") {
        e.preventDefault();
        setZoom(1);
        return;
      }

      if ((e.key === "Backspace" || e.key === "Delete")) {
        if (selectedRegionId) {
          e.preventDefault();
          removeTimelineRegion(selectedRegionId);
          setSelectedRegionId(null);
          return;
        }
        if (selectedId) {
          e.preventDefault();
          removeOverlay(selectedId);
          return;
        }
      }

      if (mod && key === "d" && selectedId) {
        e.preventDefault();
        duplicateOverlay(selectedId);
        return;
      }
      if (mod && key === "c" && selectedId) {
        e.preventDefault();
        copyOverlay(selectedId);
        return;
      }
      if (mod && key === "x" && selectedId) {
        e.preventDefault();
        cutOverlay(selectedId);
        return;
      }
      if (mod && key === "v") {
        e.preventDefault();
        pasteOverlay(sharedFrameRef.current);
        return;
      }
      if (!mod && key === "s") {
        if (selectedRegionId) {
          e.preventDefault();
          splitTimelineRegionAtFrame(selectedRegionId, sharedFrameRef.current);
          return;
        }
        if (selectedId) {
          e.preventDefault();
          splitOverlayAtFrame(selectedId, sharedFrameRef.current);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    selectedId,
    selectedRegionId,
    removeOverlay,
    duplicateOverlay,
    copyOverlay,
    cutOverlay,
    pasteOverlay,
    splitOverlayAtFrame,
    removeTimelineRegion,
    splitTimelineRegionAtFrame,
  ]);

  return (
    <div
      className="flex flex-col shrink-0 border-t select-none"
      style={{ background: "#0a0a0a", borderColor: "#1a1a1c", height: 180 }}
    >
      {/* ── toolbar ── */}
      <div className="flex items-center gap-3 px-3 shrink-0" style={{ height: 36, borderBottom: "1px solid #151515" }}>
        <button className="hover:text-white transition-colors" style={{ color: "#F7F6E5" }}
          onClick={() => { sharedFrameRef.current = 0; playerRef.current?.seekTo(0); setCurrentFrameStore(0); }}>
          <SkipBack size={13} />
        </button>
        <button className="hover:text-white transition-colors" style={{ color: "#cccccc" }}
          onClick={() => { if (isPlaying) playerRef.current?.pause(); else playerRef.current?.play(); }}>
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <span ref={timecodeDomRef} className="text-[11px] font-mono tabular-nums" style={{ color: "#ccff00", minWidth: 76 }}>
          {fmtTime(currentFrame, fps)}
        </span>
        <span className="text-[10px] font-mono" style={{ color: "#777777" }}>/ {fmtTime(durationInFrames, fps)}</span>
        <div className="flex-1" />
        <button className="hover:text-white transition-colors" style={{ color: "#F7F6E5" }}
          onClick={() => setZoom((z) => Math.max(MIN_ZOOM, +(z / 1.4).toFixed(2)))}>
          <ZoomOut size={13} />
        </button>
        <span className="text-[9px] font-mono w-8 text-center" style={{ color: "#F7F6E5" }}>{Math.round(zoom * 100)}%</span>
        <button className="hover:text-white transition-colors" style={{ color: "#F7F6E5" }}
          onClick={() => setZoom((z) => Math.min(MAX_ZOOM, +(z * 1.4).toFixed(2)))}>
          <ZoomIn size={13} />
        </button>

        {/* ── Marker divider ── */}
        <div style={{ width: 1, height: 16, background: "#222", marginLeft: 4 }} />

        {/* In marker button */}
        <button
          title={inMarker !== null ? `In: ${fmtTime(inMarker, fps)} — click to clear` : "Set In marker at playhead"}
          className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-mono transition-colors"
          style={{
            background: inMarker !== null ? "rgba(74,222,128,0.12)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${inMarker !== null ? "rgba(74,222,128,0.4)" : "rgba(255,255,255,0.08)"}`,
            color: inMarker !== null ? "#4ade80" : "#666",
            fontFamily: "Outfit, sans-serif",
          }}
          onClick={() => inMarker !== null ? setInMarker(null) : setInMarker(sharedFrameRef.current)}
        >
          {inMarker !== null ? `I: ${fmtTime(inMarker, fps)}` : "[ I"}
        </button>

        {/* Out marker button */}
        <button
          title={outMarker !== null ? `Out: ${fmtTime(outMarker, fps)} — click to clear` : "Set Out marker at playhead"}
          className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-mono transition-colors"
          style={{
            background: outMarker !== null ? "rgba(248,113,113,0.12)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${outMarker !== null ? "rgba(248,113,113,0.4)" : "rgba(255,255,255,0.08)"}`,
            color: outMarker !== null ? "#f87171" : "#666",
            fontFamily: "Outfit, sans-serif",
          }}
          onClick={() => outMarker !== null ? setOutMarker(null) : setOutMarker(sharedFrameRef.current)}
        >
          {outMarker !== null ? `O: ${fmtTime(outMarker, fps)}` : "O ]"}
        </button>

        {/* Show duration between markers if both set */}
        {inMarker !== null && outMarker !== null && outMarker > inMarker && (
          <span className="text-[9px] font-mono" style={{ color: "#888", fontFamily: "Outfit, sans-serif" }}>
            {fmtTime(outMarker - inMarker, fps)}
          </span>
        )}

        <div style={{ width: 1, height: 16, background: "#222", marginLeft: 4 }} />
        {([
          ["speed", Gauge, "Speed"],
          ["audio", AudioLines, "Audio"],
          ["crop", Crop, "Crop"],
        ] as const).map(([type, Icon, label]) => (
          <button
            key={type}
            title={`Add ${label} region at playhead`}
            className="flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] transition-colors"
            style={{
              fontFamily: "Outfit, sans-serif",
              background: "rgba(255,255,255,0.04)",
              borderColor: "rgba(255,255,255,0.08)",
              color: "#777",
            }}
            onClick={() => addTimelineRegion(type)}
          >
            <Icon size={10} />
            {label}
          </button>
        ))}
        <div style={{ width: 1, height: 16, background: "#222", marginLeft: 2 }} />
        {([
          ["copy", Copy, "Copy"],
          ["cut", Scissors, "Cut"],
          ["paste", ClipboardPaste, "Paste"],
          ["duplicate", Plus, "Duplicate"],
          ["split", SplitSquareHorizontal, "Split"],
          ["delete", Trash2, "Delete"],
        ] as const).map(([action, Icon, label]) => {
          const hasTarget = selectedRegionId !== null || selectedId !== null;
          const disabled = action !== "paste" && !hasTarget;
          return (
            <button
              key={action}
              title={label}
              disabled={disabled}
              className="flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] transition-colors"
              style={{
                fontFamily: "Outfit, sans-serif",
                background: "rgba(255,255,255,0.04)",
                borderColor: "rgba(255,255,255,0.08)",
                color: disabled ? "#333" : "#777",
                cursor: disabled ? "default" : "pointer",
              }}
              onClick={() => {
                if (action === "copy" && selectedId) copyOverlay(selectedId);
                if (action === "cut" && selectedId) cutOverlay(selectedId);
                if (action === "paste") pasteOverlay(sharedFrameRef.current);
                if (action === "duplicate" && selectedId) duplicateOverlay(selectedId);
                if (action === "split") {
                  if (selectedRegionId) splitTimelineRegionAtFrame(selectedRegionId, sharedFrameRef.current);
                  else if (selectedId) splitOverlayAtFrame(selectedId, sharedFrameRef.current);
                }
                if (action === "delete") {
                  if (selectedRegionId) {
                    removeTimelineRegion(selectedRegionId);
                    setSelectedRegionId(null);
                  } else if (selectedId) {
                    removeOverlay(selectedId);
                  }
                }
              }}
            >
              <Icon size={10} />
              {label}
            </button>
          );
        })}

        {/* ── BPM / Sync ── */}
        <div style={{ width: 1, height: 16, background: "#222", marginLeft: 2 }} />
        <label className="flex items-center gap-1 text-[9px]" style={{ color: "#555", fontFamily: "Outfit, sans-serif" }}>
          BPM
          <input
            type="number"
            min={40}
            max={300}
            placeholder="—"
            value={bpmInput}
            onChange={(e) => setBpmInput(e.target.value)}
            onBlur={() => {
              const n = parseInt(bpmInput, 10);
              if (!isNaN(n) && n >= 40 && n <= 300) setBpm(n);
              else { setBpm(null); setBpmInput(""); }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            className="h-6 w-12 rounded border px-1 text-[10px] text-white outline-none tabular-nums text-center"
            style={{ background: bpm ? "rgba(204,255,0,0.06)" : "rgba(255,255,255,0.04)", borderColor: bpm ? "rgba(204,255,0,0.3)" : "rgba(255,255,255,0.08)", fontFamily: "Outfit, sans-serif" }}
          />
        </label>
        <button
          title={bpm ? `Snap to beat (${bpm} BPM)` : "Snap to nearest second (set BPM for beat-sync)"}
          disabled={!selectedId}
          className="flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] transition-colors"
          style={{
            fontFamily: "Outfit, sans-serif",
            background: selectedId ? "rgba(204,255,0,0.06)" : "rgba(255,255,255,0.04)",
            borderColor: selectedId ? "rgba(204,255,0,0.3)" : "rgba(255,255,255,0.08)",
            color: selectedId ? "#ccff00" : "#333",
            cursor: selectedId ? "pointer" : "default",
          }}
          onClick={() => { if (selectedId) snapOverlayToBeat(selectedId, fps); }}
        >
          <Music2 size={10} />
          Sync
        </button>

        <TimelineRegionInspector regionId={selectedRegionId} />
      </div>

      {/* ── label column + scrollable content ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Fixed left label column — never scrolls */}
        <div className="shrink-0 flex flex-col" style={{ width: LABEL_W, background: "#0a0a0a", zIndex: 10, borderRight: "1px solid #1e1e1e" }}>
          {/* Corner above ruler */}
          <div style={{ height: HEADER_H, borderBottom: "1px solid #1e1e1e", flexShrink: 0 }} />
          <div
            className="flex items-center gap-1.5 px-2"
            style={{
              height: TRACK_H,
              borderBottom: "1px solid #141414",
              color: "#777",
              fontFamily: "Outfit, sans-serif",
              fontSize: 10,
            }}
          >
            <Gauge size={11} />
            Regions
          </div>
          {/* Track labels aligned with track rows */}
          {reversedOverlays.map((overlay) => (
            <TrackLabel key={overlay.id} overlay={overlay} isSelected={selectedId === overlay.id} />
          ))}
        </div>

        {/* Single scrollable area — ruler on top, tracks below, playhead inside */}
        <div ref={scrollRef} className="flex-1 overflow-auto" style={{ position: "relative" }}>
          <div style={{ width: totalWidth, position: "relative" }}>

            {/* Ruler row — click/drag to seek */}
            <div
              style={{ height: HEADER_H, position: "sticky", top: 0, background: "#0a0a0a", zIndex: 10, borderBottom: "1px solid #1e1e1e", cursor: "col-resize" }}
              onMouseDown={onRulerMouseDown}
            >
              {/* Playhead line — inside scrollable content, left = frame * pxPerFrame */}
              <div
                ref={playheadDomRef}
                style={{
                  position: "absolute",
                  left: currentFrame * pxPerFrame,
                  top: 0,
                  // Extends down through all track rows via a tall height
                  height: HEADER_H + (reversedOverlays.length + 1) * TRACK_H + 40,
                  width: 1,
                  background: "#ccff00",
                  zIndex: 20,
                  pointerEvents: "none",
                }}
              >
                <div style={{
                  position: "absolute", top: 0, left: -5,
                  width: 11, height: 11,
                  background: "#ccff00",
                  clipPath: "polygon(50% 100%, 0 0, 100% 0)",
                  transform: "rotate(180deg)",
                }} />
              </div>
              {/* Ruler ticks */}
              {(() => {
                const tickFrames = Math.max(1, Math.round(60 / pxPerFrame));
                return Array.from({ length: Math.ceil(durationInFrames / tickFrames) + 1 }, (_, i) => i * tickFrames).map((tick) => {
                  const isMajor = tick % (tickFrames * 4) === 0 || tickFrames >= fps;
                  return (
                    <div key={tick} style={{ position: "absolute", left: tick * pxPerFrame, top: 0, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                      <div style={{ width: 1, height: isMajor ? 10 : 5, background: isMajor ? "#444" : "#282828", marginTop: isMajor ? 4 : 9 }} />
                      {isMajor && (
                        <span style={{ fontSize: 8, fontFamily: "monospace", color: "#F7F6E5", paddingLeft: 3, whiteSpace: "nowrap", lineHeight: 1 }}>
                          {fmtTime(tick, fps)}
                        </span>
                      )}
                    </div>
                  );
                });
              })()}

              {/* In/Out marker highlight band */}
              {inMarker !== null && outMarker !== null && outMarker > inMarker && (
                <div
                  style={{
                    position: "absolute",
                    left: inMarker * pxPerFrame,
                    top: 0,
                    width: (outMarker - inMarker) * pxPerFrame,
                    height: "100%",
                    background: "rgba(255,255,255,0.04)",
                    borderLeft: "1px solid rgba(74,222,128,0.5)",
                    borderRight: "1px solid rgba(248,113,113,0.5)",
                    pointerEvents: "none",
                  }}
                />
              )}

              {/* In marker triangle — draggable, points UP (green) */}
              {inMarker !== null && (
                <div
                  style={{
                    position: "absolute",
                    left: inMarker * pxPerFrame - 8,
                    top: 0,
                    width: 16,
                    height: 16,
                    cursor: "ew-resize",
                    zIndex: 15,
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    const startX = e.clientX;
                    const origFrame = inMarker;
                    const onMove = (ev: MouseEvent) => {
                      const dx = ev.clientX - startX;
                      const newFrame = Math.max(0, Math.round(origFrame + dx / pxPerFrameRef.current));
                      const maxFrame = outMarker !== null ? outMarker - 1 : durationInFrames - 1;
                      setInMarker(Math.min(newFrame, maxFrame));
                    };
                    const onUp = () => {
                      window.removeEventListener("mousemove", onMove);
                      window.removeEventListener("mouseup", onUp);
                    };
                    window.addEventListener("mousemove", onMove);
                    window.addEventListener("mouseup", onUp);
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" style={{ display: "block" }}>
                    <polygon points="8,0 0,16 16,16" fill="#4ade80" />
                  </svg>
                </div>
              )}

              {/* Out marker triangle — draggable, points DOWN (red) */}
              {outMarker !== null && (
                <div
                  style={{
                    position: "absolute",
                    left: outMarker * pxPerFrame - 8,
                    top: 0,
                    width: 16,
                    height: 16,
                    cursor: "ew-resize",
                    zIndex: 15,
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    const startX = e.clientX;
                    const origFrame = outMarker;
                    const onMove = (ev: MouseEvent) => {
                      const dx = ev.clientX - startX;
                      const newFrame = Math.min(durationInFrames, Math.round(origFrame + dx / pxPerFrameRef.current));
                      const minFrame = inMarker !== null ? inMarker + 1 : 0;
                      setOutMarker(Math.max(newFrame, minFrame));
                    };
                    const onUp = () => {
                      window.removeEventListener("mousemove", onMove);
                      window.removeEventListener("mouseup", onUp);
                    };
                    window.addEventListener("mousemove", onMove);
                    window.addEventListener("mouseup", onUp);
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" style={{ display: "block" }}>
                    <polygon points="8,16 0,0 16,0" fill="#f87171" />
                  </svg>
                </div>
              )}
            </div>

            <div
              style={{
                height: TRACK_H,
                borderBottom: "1px solid #111",
                position: "relative",
                background: "rgba(255,255,255,0.015)",
              }}
            >
              {timelineRegions.map((region) => (
                <TimelineRegionClip
                  key={region.id}
                  region={region}
                  pxPerFrame={pxPerFrame}
                  totalFrames={durationInFrames}
                  isSelected={selectedRegionId === region.id}
                  onSelect={setSelectedRegionId}
                />
              ))}
            </div>

            {/* Track rows */}
            {reversedOverlays.map((overlay) => {
              const isLyrics = overlay.type === "lyrics" && overlay.lyrics && overlay.lyrics.length > 0;
              const color = OVERLAY_COLORS[overlay.type];
              return (
                <div
                  key={overlay.id}
                  style={{
                    height: TRACK_H, borderBottom: "1px solid #111", position: "relative",
                    background: selectedId === overlay.id ? "rgba(255,255,255,0.01)" : "transparent",
                  }}
                >
                  {isLyrics ? (
                    <>
                      <div style={{
                        position: "absolute",
                        left: overlay.startFrame * pxPerFrame, top: 3,
                        width: Math.max(4, overlay.durationInFrames * pxPerFrame), height: TRACK_H - 6,
                        borderRadius: 4, border: `1px dashed ${color}22`, pointerEvents: "none",
                      }} />
                      {overlay.lyrics!.map((line, lineIndex) => (
                        <LyricSegmentClip
                          key={lineIndex}
                          overlayId={overlay.id}
                          overlayStartFrame={overlay.startFrame}
                          line={line}
                          lineIndex={lineIndex}
                          isSelected={selectedId === overlay.id && selectedLyricLineIndex === lineIndex}
                          pxPerFrame={pxPerFrame}
                          totalFrames={durationInFrames}
                          color={color}
                        />
                      ))}
                      <AddLyricLineButton
                        overlayId={overlay.id}
                        overlayStartFrame={overlay.startFrame}
                        pxPerFrame={pxPerFrame}
                        color={color}
                      />
                    </>
                  ) : (
                    <TrackClip
                      overlay={overlay}
                      isSelected={selectedId === overlay.id}
                      pxPerFrame={pxPerFrame}
                      totalFrames={durationInFrames}
                    />
                  )}
                </div>
              );
            })}

            {/* End marker */}
            <div style={{
              position: "absolute", left: durationInFrames * pxPerFrame, top: 0,
              height: HEADER_H + (reversedOverlays.length + 1) * TRACK_H,
              width: 1, background: "#333", pointerEvents: "none",
            }} />
          </div>
        </div>
      </div>
    </div>
  );
}
