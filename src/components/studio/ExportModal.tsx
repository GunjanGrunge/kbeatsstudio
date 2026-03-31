"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Download, X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useStudioStore } from "@/store/studioStore";
import { useRenderProgress } from "@/hooks/useRenderProgress";
import type { KBeatsInputProps } from "@/types/studio";

interface Props {
  open: boolean;
  onClose: () => void;
}

type Resolution = "1080p" | "4k";

const RESOLUTIONS: { id: Resolution; label: string; width: number; height: number; note?: string }[] = [
  { id: "1080p", label: "1080p HD", width: 1920, height: 1080 },
  { id: "4k", label: "4K Ultra HD", width: 3840, height: 2160, note: "Slower render" },
];

export function ExportModal({ open, onClose }: Props) {
  const [resolution, setResolution] = useState<Resolution>("1080p");
  const [renderId, setRenderId] = useState<string | null>(null);
  const [bucketName, setBucketName] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const projectId = useStudioStore((s) => s.projectId);
  const template = useStudioStore((s) => s.template);
  const audioSrc = useStudioStore((s) => s.audioSrc);
  const videoSrc = useStudioStore((s) => s.videoSrc);
  const durationInFrames = useStudioStore((s) => s.durationInFrames);
  const overlays = useStudioStore((s) => s.overlays);
  const backgroundColor = useStudioStore((s) => s.backgroundColor);
  const backgroundOpacity = useStudioStore((s) => s.backgroundOpacity);

  const renderProgress = useRenderProgress(renderId, bucketName);

  const resInfo = RESOLUTIONS.find((r) => r.id === resolution)!;

  // For vertical templates, swap width/height for 4K equivalents
  const isVertical = template.height > template.width;
  const exportWidth = resolution === "4k" ? (isVertical ? 2160 : resInfo.width) : template.width;
  const exportHeight = resolution === "4k" ? (isVertical ? 3840 : resInfo.height) : template.height;

  const handleStartRender = async () => {
    setStarting(true);
    setStartError(null);

    const inputProps: KBeatsInputProps = {
      audioSrc,
      videoSrc,
      durationInFrames,
      fps: template.fps,
      width: exportWidth,
      height: exportHeight,
      backgroundColor,
      backgroundOpacity,
      overlays,
    };

    try {
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent
        className="max-w-md border"
        style={{ background: "#1a1a1c", borderColor: "#333333" }}
      >
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2" style={{ fontFamily: "Unbounded, sans-serif", fontSize: "0.9rem" }}>
            <Download size={16} className="text-[#ccff00]" />
            Export MP4
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Resolution picker */}
          {!renderId && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#555555]" style={{ fontFamily: "Unbounded, sans-serif" }}>
                Resolution
              </p>
              <div className="grid grid-cols-2 gap-2">
                {RESOLUTIONS.map((r) => (
                  <button
                    key={r.id}
                    className="flex flex-col items-start p-3 rounded-xl border transition-all duration-200"
                    style={{
                      background: resolution === r.id ? "rgba(204,255,0,0.06)" : "rgba(255,255,255,0.03)",
                      borderColor: resolution === r.id ? "rgba(204,255,0,0.4)" : "rgba(255,255,255,0.06)",
                    }}
                    onClick={() => setResolution(r.id)}
                  >
                    <span className="text-sm font-bold text-white" style={{ fontFamily: "Unbounded, sans-serif", fontSize: "0.75rem" }}>
                      {r.label}
                    </span>
                    <span className="text-[10px] text-[#888888]" style={{ fontFamily: "Outfit, sans-serif" }}>
                      {isVertical && r.id === "4k" ? "2160×3840" : isVertical ? "1080×1920" : `${r.width}×${r.height}`}
                    </span>
                    {r.note && (
                      <span className="text-[9px] text-[#555555] mt-0.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                        {r.note}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Export info */}
          {!renderId && (
            <div className="p-3 rounded-lg bg-[rgba(0,0,0,0.3)] border border-[#222222] text-[10px] text-[#555555] space-y-1" style={{ fontFamily: "Outfit, sans-serif" }}>
              <div className="flex justify-between"><span>Duration</span><span className="text-white">{Math.round(durationInFrames / template.fps)}s</span></div>
              <div className="flex justify-between"><span>FPS</span><span className="text-white">{template.fps}</span></div>
              <div className="flex justify-between"><span>Overlays</span><span className="text-white">{overlays.filter((o) => o.visible).length}</span></div>
              <div className="flex justify-between"><span>Codec</span><span className="text-white">H.264</span></div>
            </div>
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
                <>
                  <div className="flex items-center gap-3">
                    <Loader2 size={16} className="text-[#ccff00] animate-spin shrink-0" />
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between text-[10px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                        <span className="text-[#888888]">Rendering...</span>
                        <span className="text-white">{Math.round(renderProgress.progress * 100)}%</span>
                      </div>
                      <Progress value={renderProgress.progress * 100} className="h-1.5" />
                    </div>
                  </div>
                  {renderProgress.framesRendered != null && (
                    <p className="text-[10px] text-[#444444] text-center" style={{ fontFamily: "Outfit, sans-serif" }}>
                      {renderProgress.framesRendered} / {renderProgress.totalFrames ?? "?"} frames
                    </p>
                  )}
                </>
              )}

              {isDone && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center gap-4 py-4"
                >
                  <CheckCircle size={40} className="text-[#ccff00]" />
                  <p className="text-sm text-white font-semibold" style={{ fontFamily: "Unbounded, sans-serif", fontSize: "0.75rem" }}>
                    Render Complete!
                  </p>
                  <a
                    href={renderProgress.outputUrl}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold text-[#050505]"
                    style={{
                      background: "#ccff00",
                      fontFamily: "Unbounded, sans-serif",
                      fontSize: "0.65rem",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                    }}
                  >
                    <Download size={14} />
                    Download MP4
                  </a>
                </motion.div>
              )}

              {isError && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-950/30 border border-red-800/40">
                  <AlertCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-300" style={{ fontFamily: "Outfit, sans-serif" }}>
                    {renderProgress.error ?? "Render failed"}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Start button */}
          {!renderId && (
            <button
              className="w-full py-3 rounded-xl text-[#050505] font-bold transition-all duration-200 flex items-center justify-center gap-2"
              style={{
                background: starting ? "#888888" : "#ccff00",
                fontFamily: "Unbounded, sans-serif",
                fontSize: "0.65rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                cursor: starting ? "not-allowed" : "pointer",
              }}
              onClick={handleStartRender}
              disabled={starting}
            >
              {starting ? (
                <><Loader2 size={14} className="animate-spin" /> Starting...</>
              ) : (
                <><Download size={14} /> Start Export</>
              )}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
