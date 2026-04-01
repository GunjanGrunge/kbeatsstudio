"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import { type PlayerRef } from "@remotion/player";
import { useStudioStore } from "@/store/studioStore";
import type { OverlayConfig, OverlayType } from "@/types/studio";
import {
  Music2, PlayCircle, Camera, Waves, Type, Image, LucideProps,
  Play, Pause, SkipBack, ZoomIn, ZoomOut,
} from "lucide-react";

/* ── constants ─────────────────────────────────────────────── */
const TRACK_H = 28;          // px per overlay track
const HEADER_H = 28;         // px for the ruler header
const LABEL_W = 140;         // px for the left label gutter
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 8;

/* ── icon / colour maps ────────────────────────────────────── */
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
  "yt-subscribe": "#ff4444",
  "yt-like": "#ff4444",
  "ig-follow": "#e1306c",
  lyrics: "#ccff00",
  "lyrics-chords": "#a8d400",
  waveform: "#00e5ff",
  text: "#F7F6E5",
  image: "#ff9900",
};

/* ── helpers ───────────────────────────────────────────────── */
function fmtTime(frames: number, fps: number) {
  const secs = frames / fps;
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = Math.floor(secs % 60).toString().padStart(2, "0");
  const f = Math.floor(frames % fps).toString().padStart(2, "0");
  return `${m}:${s}:${f}`;
}

/* ── sub-components ────────────────────────────────────────── */
function TrackLabel({ overlay, isSelected }: { overlay: OverlayConfig; isSelected: boolean }) {
  const selectOverlay = useStudioStore((s) => s.selectOverlay);
  const toggleVisibility = useStudioStore((s) => s.toggleOverlayVisibility);
  const Icon = OVERLAY_ICONS[overlay.type];
  const color = OVERLAY_COLORS[overlay.type];

  return (
    <div
      className="flex items-center gap-1.5 px-2 cursor-pointer select-none transition-colors duration-150"
      style={{
        width: LABEL_W,
        height: TRACK_H,
        background: isSelected ? "rgba(204,255,0,0.05)" : "transparent",
        borderRight: "1px solid #1e1e1e",
        borderBottom: "1px solid #141414",
        flexShrink: 0,
      }}
      onClick={() => selectOverlay(overlay.id)}
    >
      <Icon size={11} color={color} style={{ flexShrink: 0 }} />
      <span
        className="flex-1 truncate text-[10px]"
        style={{
          fontFamily: "Outfit, sans-serif",
          color: isSelected ? "#ffffff" : "#bbbbbb",
          fontWeight: isSelected ? 500 : 400,
        }}
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

interface TrackClipProps {
  overlay: OverlayConfig;
  isSelected: boolean;
  pxPerFrame: number;
  totalFrames: number;
}

function TrackClip({ overlay, isSelected, pxPerFrame, totalFrames }: TrackClipProps) {
  const selectOverlay = useStudioStore((s) => s.selectOverlay);
  const updateOverlay = useStudioStore((s) => s.updateOverlay);
  const color = OVERLAY_COLORS[overlay.type];

  const left = overlay.startFrame * pxPerFrame;
  const width = Math.max(4, overlay.durationInFrames * pxPerFrame);

  /* drag-move clip */
  const dragRef = useRef<{ startX: number; origStart: number } | null>(null);
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    selectOverlay(overlay.id);
    dragRef.current = { startX: e.clientX, origStart: overlay.startFrame };

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = ev.clientX - dragRef.current.startX;
      const newStart = Math.max(0, Math.round(dragRef.current.origStart + dx / pxPerFrame));
      const clamped = Math.min(newStart, totalFrames - overlay.durationInFrames);
      updateOverlay(overlay.id, { startFrame: clamped });
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [overlay, pxPerFrame, totalFrames, selectOverlay, updateOverlay]);

  /* drag-resize right edge */
  const resizeDragRef = useRef<{ startX: number; origDur: number } | null>(null);
  const onResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    resizeDragRef.current = { startX: e.clientX, origDur: overlay.durationInFrames };

    const onMove = (ev: MouseEvent) => {
      if (!resizeDragRef.current) return;
      const dx = ev.clientX - resizeDragRef.current.startX;
      const newDur = Math.max(1, Math.round(resizeDragRef.current.origDur + dx / pxPerFrame));
      const clamped = Math.min(newDur, totalFrames - overlay.startFrame);
      updateOverlay(overlay.id, { durationInFrames: clamped });
    };
    const onUp = () => {
      resizeDragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [overlay, pxPerFrame, totalFrames, updateOverlay]);

  return (
    <div
      style={{
        position: "absolute",
        left,
        top: 3,
        width,
        height: TRACK_H - 6,
        borderRadius: 4,
        background: isSelected
          ? `${color}33`
          : `${color}1a`,
        border: `1px solid ${isSelected ? color : color + "66"}`,
        cursor: "grab",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        paddingLeft: 6,
        boxSizing: "border-box",
        userSelect: "none",
      }}
      onMouseDown={onMouseDown}
    >
      <span
        className="truncate text-[9px] pointer-events-none"
        style={{ fontFamily: "Outfit, sans-serif", color, opacity: 0.9 }}
      >
        {overlay.label}
      </span>

      {/* Resize handle — right edge */}
      <div
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          width: 6,
          height: "100%",
          cursor: "ew-resize",
          background: `${color}44`,
        }}
        onMouseDown={onResizeMouseDown}
      />
    </div>
  );
}

/* ── main component ────────────────────────────────────────── */
interface Props {
  playerRef: React.RefObject<PlayerRef | null>;
}

export function TimelinePanel({ playerRef }: Props) {
  const overlays = useStudioStore((s) => s.overlays);
  const selectedId = useStudioStore((s) => s.selectedOverlayId);
  const durationInFrames = useStudioStore((s) => s.durationInFrames);
  const fps = useStudioStore((s) => s.template.fps);

  const currentFrame = useStudioStore((s) => s.currentFrame);
  const setCurrentFrameStore = useStudioStore((s) => s.setCurrentFrame);
  const [isPlaying, setIsPlaying] = useState(false);
  const [zoom, setZoom] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);
  const isSeeking = useRef(false);

  /* sync playhead from player */
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    const onFrame = ({ detail }: CustomEvent<{ frame: number }>) => {
      if (!isSeeking.current) setCurrentFrameStore(detail.frame);
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    // @ts-expect-error remotion player events
    player.addEventListener("frameupdate", onFrame);
    // @ts-expect-error remotion player events
    player.addEventListener("play", onPlay);
    // @ts-expect-error remotion player events
    player.addEventListener("pause", onPause);
    return () => {
      // @ts-expect-error remotion player events
      player.removeEventListener("frameupdate", onFrame);
      // @ts-expect-error remotion player events
      player.removeEventListener("play", onPlay);
      // @ts-expect-error remotion player events
      player.removeEventListener("pause", onPause);
    };
  }, [playerRef]);

  /* pixels per frame = base 80px per second × zoom */
  const pxPerFrame = (80 / fps) * zoom;
  const totalWidth = Math.max(durationInFrames * pxPerFrame, 600);

  /* ruler tick spacing — aim for ~60px between ticks */
  const tickFrames = Math.max(1, Math.round(60 / pxPerFrame));
  const ticks = Array.from(
    { length: Math.ceil(durationInFrames / tickFrames) + 1 },
    (_, i) => i * tickFrames
  );

  /* seek on ruler / track area click */
  const seekTo = useCallback((clientX: number, containerLeft: number) => {
    const scrollLeft = scrollRef.current?.scrollLeft ?? 0;
    const x = clientX - containerLeft - LABEL_W + scrollLeft;
    const frame = Math.max(0, Math.min(durationInFrames - 1, Math.round(x / pxPerFrame)));
    setCurrentFrameStore(frame);
    playerRef.current?.seekTo(frame);
  }, [pxPerFrame, durationInFrames, playerRef]);

  const onRulerMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    isSeeking.current = true;
    const rect = e.currentTarget.closest("[data-timeline-root]")!.getBoundingClientRect();
    seekTo(e.clientX, rect.left);

    const onMove = (ev: MouseEvent) => seekTo(ev.clientX, rect.left);
    const onUp = () => {
      isSeeking.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [seekTo]);

  /* sync ruler scroll with track scroll */
  const onTrackScroll = useCallback(() => {
    if (rulerRef.current && scrollRef.current) {
      rulerRef.current.scrollLeft = scrollRef.current.scrollLeft;
    }
  }, []);

  const playheadX = LABEL_W + currentFrame * pxPerFrame;

  return (
    <div
      className="flex flex-col shrink-0 border-t select-none"
      style={{ background: "#0a0a0a", borderColor: "#1a1a1c", height: 180 }}
      data-timeline-root=""
    >
      {/* ── toolbar ── */}
      <div
        className="flex items-center gap-3 px-3 shrink-0"
        style={{ height: 36, borderBottom: "1px solid #151515" }}
      >
        {/* transport */}
        <button
          className="hover:text-white transition-colors"
          style={{ color: "#F7F6E5" }}
          onClick={() => { playerRef.current?.seekTo(0); setCurrentFrameStore(0); }}
        >
          <SkipBack size={13} />
        </button>
        <button
          className="hover:text-white transition-colors"
          style={{ color: "#cccccc" }}
          onClick={() => {
            if (isPlaying) playerRef.current?.pause();
            else playerRef.current?.play();
          }}
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
        </button>

        {/* timecode */}
        <span
          className="text-[11px] font-mono tabular-nums"
          style={{ color: "#ccff00", minWidth: 76 }}
        >
          {fmtTime(currentFrame, fps)}
        </span>

        <span className="text-[10px] font-mono" style={{ color: "#777777" }}>
          / {fmtTime(durationInFrames, fps)}
        </span>

        <div className="flex-1" />

        {/* zoom */}
        <button
          className="hover:text-white transition-colors"
          style={{ color: "#F7F6E5" }}
          onClick={() => setZoom((z) => Math.max(MIN_ZOOM, +(z / 1.4).toFixed(2)))}
        >
          <ZoomOut size={13} />
        </button>
        <span className="text-[9px] font-mono w-8 text-center" style={{ color: "#F7F6E5" }}>
          {Math.round(zoom * 100)}%
        </span>
        <button
          className="hover:text-white transition-colors"
          style={{ color: "#F7F6E5" }}
          onClick={() => setZoom((z) => Math.min(MAX_ZOOM, +(z * 1.4).toFixed(2)))}
        >
          <ZoomIn size={13} />
        </button>
      </div>

      {/* ── ruler + tracks ── */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* playhead — overlaps both ruler and tracks */}
        <div
          style={{
            position: "absolute",
            left: playheadX,
            top: 0,
            bottom: 0,
            width: 1,
            background: "#ccff00",
            zIndex: 20,
            pointerEvents: "none",
          }}
        >
          {/* diamond head */}
          <div style={{
            position: "absolute",
            top: 0,
            left: -5,
            width: 11,
            height: 11,
            background: "#ccff00",
            clipPath: "polygon(50% 100%, 0 0, 100% 0)",
            transform: "rotate(180deg)",
          }} />
        </div>

        {/* left label column */}
        <div
          className="shrink-0 flex flex-col"
          style={{ width: LABEL_W, zIndex: 10, background: "#0a0a0a" }}
        >
          {/* ruler corner */}
          <div style={{ height: HEADER_H, borderBottom: "1px solid #1e1e1e", flexShrink: 0 }} />
          {/* track labels */}
          {[...overlays].reverse().map((overlay) => (
            <TrackLabel
              key={overlay.id}
              overlay={overlay}
              isSelected={selectedId === overlay.id}
            />
          ))}
        </div>

        {/* scrollable ruler + track area */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* ruler (separate scroll, synced via JS) */}
          <div
            ref={rulerRef}
            style={{
              height: HEADER_H,
              overflow: "hidden",
              flexShrink: 0,
              borderBottom: "1px solid #1e1e1e",
              cursor: "col-resize",
              position: "relative",
            }}
            onMouseDown={onRulerMouseDown}
          >
            <div style={{ width: totalWidth, height: "100%", position: "relative" }}>
              {ticks.map((tick) => {
                const isMajor = tick % (tickFrames * 4) === 0 || tickFrames >= fps;
                return (
                  <div
                    key={tick}
                    style={{
                      position: "absolute",
                      left: tick * pxPerFrame,
                      top: 0,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                    }}
                  >
                    <div
                      style={{
                        width: 1,
                        height: isMajor ? 10 : 5,
                        background: isMajor ? "#444" : "#282828",
                        marginTop: isMajor ? 4 : 9,
                      }}
                    />
                    {isMajor && (
                      <span
                        style={{
                          fontSize: 8,
                          fontFamily: "monospace",
                          color: "#F7F6E5",
                          paddingLeft: 3,
                          whiteSpace: "nowrap",
                          lineHeight: 1,
                        }}
                      >
                        {fmtTime(tick, fps)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* track rows */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-auto"
            onScroll={onTrackScroll}
            style={{ cursor: "default" }}
          >
            <div style={{ width: totalWidth, position: "relative" }}>
              {[...overlays].reverse().map((overlay) => (
                <div
                  key={overlay.id}
                  style={{
                    height: TRACK_H,
                    borderBottom: "1px solid #111",
                    position: "relative",
                    background: selectedId === overlay.id
                      ? "rgba(255,255,255,0.01)"
                      : "transparent",
                  }}
                >
                  <TrackClip
                    overlay={overlay}
                    isSelected={selectedId === overlay.id}
                    pxPerFrame={pxPerFrame}
                    totalFrames={durationInFrames}
                  />
                </div>
              ))}
              {/* duration end marker */}
              <div
                style={{
                  position: "absolute",
                  left: durationInFrames * pxPerFrame,
                  top: 0,
                  bottom: 0,
                  width: 1,
                  background: "#333",
                  pointerEvents: "none",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
