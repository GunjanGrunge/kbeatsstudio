"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Download, CheckCircle, AlertCircle, Loader2, Clock, Scissors } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useStudioStore } from "@/store/studioStore";
import { useRenderProgress } from "@/hooks/useRenderProgress";
import { TEMPLATES } from "@/types/studio";
import type { KBeatsInputProps } from "@/types/studio";
import { parseTimecodeToSeconds } from "@/lib/parseTimecode";

interface Props {
  open: boolean;
  onClose: () => void;
}

const parseTime = parseTimecodeToSeconds;

function fmtTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function ExportModal({ open, onClose }: Props) {
  const projectId = useStudioStore((s) => s.projectId);
  const template = useStudioStore((s) => s.template);
  const audioSrc = useStudioStore((s) => s.audioSrc);
  const videoSrc = useStudioStore((s) => s.videoSrc);
  const videoFit = useStudioStore((s) => s.videoFit);
  const durationInFrames = useStudioStore((s) => s.durationInFrames);
  const overlays = useStudioStore((s) => s.overlays);
  const backgroundColor = useStudioStore((s) => s.backgroundColor);
  const backgroundOpacity = useStudioStore((s) => s.backgroundOpacity);
  const inMarker = useStudioStore((s) => s.inMarker);
  const outMarker = useStudioStore((s) => s.outMarker);
  const setInMarker = useStudioStore((s) => s.setInMarker);
  const setOutMarker = useStudioStore((s) => s.setOutMarker);

  const fps = template.fps;
  const totalSecs = durationInFrames / fps;

  // Format selection — default to current project template
  const [selectedTemplateId, setSelectedTemplateId] = useState(template.id);

  // Trim state — in seconds, defaults to full duration
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(totalSecs);
  const [trimStartInput, setTrimStartInput] = useState("0:00");
  const [trimEndInput, setTrimEndInput] = useState(fmtTime(totalSecs));
  const [usingMarkers, setUsingMarkers] = useState(false);

  // Pre-populate from timeline markers when modal opens; fall back to full duration
  useEffect(() => {
    if (open) {
      const hasMarkers = inMarker !== null && outMarker !== null && outMarker > inMarker;
      const start = hasMarkers ? inMarker! / fps : 0;
      const end = hasMarkers ? outMarker! / fps : totalSecs;
      setTrimStart(start);
      setTrimEnd(end);
      setTrimStartInput(fmtTime(start));
      setTrimEndInput(fmtTime(end));
      setUsingMarkers(hasMarkers);
      setSelectedTemplateId(template.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const [renderId, setRenderId] = useState<string | null>(null);
  const [bucketName, setBucketName] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const renderProgress = useRenderProgress(renderId, bucketName);

  // Elapsed + ETA tracking
  const startTimeRef = useRef<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (renderProgress.status === "rendering" && startTimeRef.current === null) {
      startTimeRef.current = Date.now();
    }
    if (renderProgress.status !== "rendering") {
      startTimeRef.current = null;
      setElapsed(0);
      return;
    }
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - (startTimeRef.current ?? Date.now())) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [renderProgress.status]);

  function fmtSec(s: number) {
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  }

  const pct = Math.round(renderProgress.progress * 100);
  const eta = elapsed > 0 && pct > 1 ? Math.round((elapsed / pct) * (100 - pct)) : null;

  const selectedTemplate = TEMPLATES.find((t) => t.id === selectedTemplateId) ?? template;
  const trimDuration = Math.max(1, trimEnd - trimStart);
  const trimFrames = Math.round(trimDuration * fps);
  const startFrame = Math.round(trimStart * fps);

  function commitTrimStart(val: string) {
    const s = parseTime(val);
    if (s !== null && s >= 0 && s < trimEnd) {
      setTrimStart(s);
      setTrimStartInput(fmtTime(s));
    } else {
      setTrimStartInput(fmtTime(trimStart));
    }
  }

  function commitTrimEnd(val: string) {
    const s = parseTime(val);
    if (s !== null && s > trimStart && s <= totalSecs) {
      setTrimEnd(s);
      setTrimEndInput(fmtTime(s));
    } else {
      setTrimEndInput(fmtTime(trimEnd));
    }
  }

  const handleStartRender = async () => {
    setStarting(true);
    setStartError(null);

    // Scale containerWidth when exporting at a different canvas size
    const widthScale = selectedTemplate.width / template.width;

    const inputProps: KBeatsInputProps = {
      audioSrc,
      videoSrc,
      videoFit,
      durationInFrames: trimFrames,
      fps,
      width: selectedTemplate.width,
      height: selectedTemplate.height,
      backgroundColor,
      backgroundOpacity,
      // Shift overlay startFrames relative to trim start; scale containerWidth for target resolution
      overlays: overlays.map((o) => ({
        ...o,
        startFrame: Math.max(0, o.startFrame - startFrame),
        ...(o.containerWidth !== undefined
          ? { containerWidth: Math.round(o.containerWidth * widthScale) }
          : {}),
      })),
    };

    try {
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // No frameRange — composition durationInFrames is already trimmed,
        // Lambda renders frames 0..trimFrames-1 by default
        body: JSON.stringify({ inputProps, projectId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to start render");
      setRenderId(data.renderId);
      setBucketName(data.bucketName);
    } catch (err) {
      setStartError(err instanceof Error ? err.message : "Failed to start render");
    } finally {
      setStarting(false);
    }
  };

  const handleClose = () => {
    setRenderId(null);
    setBucketName(null);
    setStartError(null);
    onClose();
  };

  const isRendering = renderProgress.status === "rendering";
  const isDone = renderProgress.status === "done";
  const isError = renderProgress.status === "error";

  // Group templates by platform
  const ytTemplates = TEMPLATES.filter((t) => t.platform === "youtube");
  const igTemplates = TEMPLATES.filter((t) => t.platform === "instagram");

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent
        className="max-w-lg border"
        style={{ background: "#1a1a1c", borderColor: "#333333" }}
      >
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2" style={{ fontFamily: "Unbounded, sans-serif", fontSize: "0.9rem" }}>
            <Download size={16} className="text-[#ccff00]" />
            Export MP4
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {!renderId && (
            <>
              {/* Format picker */}
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#555555]" style={{ fontFamily: "Unbounded, sans-serif" }}>
                  Format
                </p>
                {/* YouTube */}
                <p className="text-[9px] text-[#444] uppercase tracking-widest" style={{ fontFamily: "Unbounded, sans-serif" }}>YouTube</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {ytTemplates.map((t) => {
                    const isSelected = selectedTemplateId === t.id;
                    return (
                      <button
                        key={t.id}
                        className="flex flex-col items-start p-2 rounded-lg border transition-all duration-150"
                        style={{
                          background: isSelected ? "rgba(204,255,0,0.06)" : "rgba(255,255,255,0.02)",
                          borderColor: isSelected ? "rgba(204,255,0,0.4)" : "rgba(255,255,255,0.06)",
                        }}
                        onClick={() => setSelectedTemplateId(t.id)}
                      >
                        <span className="text-[10px] font-bold text-white leading-tight" style={{ fontFamily: "Unbounded, sans-serif", fontSize: "0.6rem" }}>{t.name}</span>
                        <span className="text-[9px] mt-0.5" style={{ fontFamily: "Outfit, sans-serif", color: isSelected ? "#ccff00" : "#555" }}>{t.aspectLabel} · {t.fps}fps</span>
                      </button>
                    );
                  })}
                </div>
                {/* Instagram */}
                <p className="text-[9px] text-[#444] uppercase tracking-widest mt-1" style={{ fontFamily: "Unbounded, sans-serif" }}>Instagram</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {igTemplates.map((t) => {
                    const isSelected = selectedTemplateId === t.id;
                    return (
                      <button
                        key={t.id}
                        className="flex flex-col items-start p-2 rounded-lg border transition-all duration-150"
                        style={{
                          background: isSelected ? "rgba(204,255,0,0.06)" : "rgba(255,255,255,0.02)",
                          borderColor: isSelected ? "rgba(204,255,0,0.4)" : "rgba(255,255,255,0.06)",
                        }}
                        onClick={() => setSelectedTemplateId(t.id)}
                      >
                        <span className="text-[10px] font-bold text-white leading-tight" style={{ fontFamily: "Unbounded, sans-serif", fontSize: "0.6rem" }}>{t.name}</span>
                        <span className="text-[9px] mt-0.5" style={{ fontFamily: "Outfit, sans-serif", color: isSelected ? "#ccff00" : "#555" }}>{t.aspectLabel} · {t.fps}fps</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Trim section */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Scissors size={10} className="text-[#555]" />
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[#555555]" style={{ fontFamily: "Unbounded, sans-serif" }}>
                    Trim
                  </p>
                  {usingMarkers && (
                    <span
                      className="text-[8px] px-1.5 py-0.5 rounded-full"
                      style={{
                        fontFamily: "Outfit, sans-serif",
                        background: "rgba(204,255,0,0.1)",
                        color: "#ccff00",
                        border: "1px solid rgba(204,255,0,0.3)",
                      }}
                    >
                      from markers
                    </span>
                  )}
                  <span className="ml-auto text-[10px] tabular-nums" style={{ fontFamily: "Outfit, sans-serif", color: "#ccff00" }}>
                    {fmtSec(Math.round(trimDuration))}
                  </span>
                </div>

                {/* Clear markers link */}
                {usingMarkers && (
                  <button
                    className="text-[9px] text-[#555] hover:text-[#888] transition-colors"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                    onClick={() => {
                      setInMarker(null);
                      setOutMarker(null);
                      setTrimStart(0);
                      setTrimEnd(totalSecs);
                      setTrimStartInput("0:00");
                      setTrimEndInput(fmtTime(totalSecs));
                      setUsingMarkers(false);
                    }}
                  >
                    Clear markers and use full duration
                  </button>
                )}

                {/* Visual range bar */}
                <div className="relative h-6 rounded-md overflow-hidden" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid #222" }}>
                  {/* Filled range */}
                  <div
                    className="absolute inset-y-0 rounded-sm"
                    style={{
                      left: `${(trimStart / totalSecs) * 100}%`,
                      width: `${(trimDuration / totalSecs) * 100}%`,
                      background: "rgba(204,255,0,0.15)",
                      borderLeft: "2px solid #ccff00",
                      borderRight: "2px solid #ccff00",
                    }}
                  />
                  {/* Start drag handle */}
                  <input
                    type="range" min={0} max={totalSecs} step={0.1}
                    value={trimStart}
                    onChange={(e) => {
                      const v = Math.min(parseFloat(e.target.value), trimEnd - 0.5);
                      setTrimStart(v);
                      setTrimStartInput(fmtTime(v));
                    }}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer"
                    style={{ zIndex: 2 }}
                  />
                </div>

                {/* Start / End inputs */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] text-[#555]" style={{ fontFamily: "Outfit, sans-serif" }}>Start</label>
                    <input
                      value={trimStartInput}
                      onChange={(e) => setTrimStartInput(e.target.value)}
                      onBlur={(e) => commitTrimStart(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") commitTrimStart(trimStartInput); }}
                      className="w-full h-8 rounded-lg px-2 text-[12px] text-white outline-none"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid #333", fontFamily: "Outfit, sans-serif" }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "#ccff00")}
                      onBlurCapture={(e) => (e.currentTarget.style.borderColor = "#333")}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-[#555]" style={{ fontFamily: "Outfit, sans-serif" }}>End</label>
                    <input
                      value={trimEndInput}
                      onChange={(e) => setTrimEndInput(e.target.value)}
                      onBlur={(e) => commitTrimEnd(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") commitTrimEnd(trimEndInput); }}
                      className="w-full h-8 rounded-lg px-2 text-[12px] text-white outline-none"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid #333", fontFamily: "Outfit, sans-serif" }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "#ccff00")}
                      onBlurCapture={(e) => (e.currentTarget.style.borderColor = "#333")}
                    />
                  </div>
                </div>
              </div>

              {/* Export info */}
              <div className="p-3 rounded-lg bg-[rgba(0,0,0,0.3)] border border-[#222222] text-[10px] text-[#555555] space-y-1" style={{ fontFamily: "Outfit, sans-serif" }}>
                <div className="flex justify-between"><span>Format</span><span className="text-white">{selectedTemplate.width}×{selectedTemplate.height}</span></div>
                <div className="flex justify-between"><span>Duration</span><span className="text-white">{fmtSec(Math.round(trimDuration))}</span></div>
                <div className="flex justify-between"><span>FPS</span><span className="text-white">{selectedTemplate.fps}</span></div>
                <div className="flex justify-between"><span>Overlays</span><span className="text-white">{overlays.filter((o) => o.visible).length}</span></div>
                <div className="flex justify-between"><span>Codec</span><span className="text-white">H.264</span></div>
              </div>
            </>
          )}

          {/* Start error */}
          {startError && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-950/30 border border-red-800/40">
              <AlertCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
              <p className="text-xs text-red-300" style={{ fontFamily: "Outfit, sans-serif" }}>{startError}</p>
            </div>
          )}

          {/* Progress */}
          {renderId && (
            <div className="space-y-4">
              {isRendering && (
                <div className="space-y-4">
                  <div className="flex flex-col items-center gap-2 py-2">
                    <div className="relative select-none" style={{ lineHeight: 1 }}>
                      <span style={{ fontFamily: "Unbounded, sans-serif", fontSize: "2.6rem", fontWeight: 900, letterSpacing: "0.08em", color: "#1e1e1e", display: "block" }}>
                        DOWNLOAD
                      </span>
                      <motion.span
                        aria-hidden
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        style={{ fontFamily: "Unbounded, sans-serif", fontSize: "2.6rem", fontWeight: 900, letterSpacing: "0.08em", color: "#ccff00", position: "absolute", top: 0, left: 0, overflow: "hidden", whiteSpace: "nowrap", display: "block" }}
                      >
                        DOWNLOAD
                      </motion.span>
                    </div>
                    <span className="text-[10px] tabular-nums" style={{ fontFamily: "Outfit, sans-serif", color: "#555" }}>{pct}% complete</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg p-2 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid #1e1e1e" }}>
                      <p className="text-[8px] text-[#555] uppercase tracking-widest mb-0.5" style={{ fontFamily: "Unbounded, sans-serif" }}>Frames</p>
                      <p className="text-[11px] text-white tabular-nums" style={{ fontFamily: "Outfit, sans-serif" }}>
                        {renderProgress.framesRendered ?? 0}<span className="text-[#444]"> / {renderProgress.totalFrames ?? "?"}</span>
                      </p>
                    </div>
                    <div className="rounded-lg p-2 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid #1e1e1e" }}>
                      <div className="flex items-center justify-center gap-1 mb-0.5">
                        <Clock size={7} className="text-[#555]" />
                        <p className="text-[8px] text-[#555] uppercase tracking-widest" style={{ fontFamily: "Unbounded, sans-serif" }}>Elapsed</p>
                      </div>
                      <p className="text-[11px] text-white tabular-nums" style={{ fontFamily: "Outfit, sans-serif" }}>{fmtSec(elapsed)}</p>
                    </div>
                    <div className="rounded-lg p-2 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid #1e1e1e" }}>
                      <p className="text-[8px] text-[#555] uppercase tracking-widest mb-0.5" style={{ fontFamily: "Unbounded, sans-serif" }}>ETA</p>
                      <p className="text-[11px] tabular-nums" style={{ fontFamily: "Outfit, sans-serif", color: eta !== null ? "#ccff00" : "#444" }}>
                        {eta !== null ? fmtSec(eta) : "—"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {isDone && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-4 py-4">
                  <CheckCircle size={40} className="text-[#ccff00]" />
                  <p className="text-sm text-white font-semibold" style={{ fontFamily: "Unbounded, sans-serif", fontSize: "0.75rem" }}>Render Complete!</p>
                  <a
                    href={renderProgress.outputUrl}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold text-[#050505]"
                    style={{ background: "#ccff00", fontFamily: "Unbounded, sans-serif", fontSize: "0.65rem", letterSpacing: "0.1em", textTransform: "uppercase" }}
                  >
                    <Download size={14} />
                    Download MP4
                  </a>
                </motion.div>
              )}

              {isError && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-950/30 border border-red-800/40">
                  <AlertCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-300" style={{ fontFamily: "Outfit, sans-serif" }}>{renderProgress.error ?? "Render failed"}</p>
                </div>
              )}
            </div>
          )}

          {/* Start button */}
          {!renderId && (
            <button
              className="w-full py-3 rounded-xl text-[#050505] font-bold transition-all duration-200 flex items-center justify-center gap-2"
              style={{ background: starting ? "#F7F6E5" : "#ccff00", fontFamily: "Unbounded, sans-serif", fontSize: "0.65rem", letterSpacing: "0.1em", textTransform: "uppercase", cursor: starting ? "not-allowed" : "pointer" }}
              onClick={handleStartRender}
              disabled={starting}
            >
              {starting ? (
                <><Loader2 size={14} className="animate-spin" /> Starting...</>
              ) : (
                <><Download size={14} /> Export {selectedTemplate.name}</>
              )}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
