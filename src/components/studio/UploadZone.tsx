"use client";

import { useState, useRef, useCallback } from "react";
import { Music, Video, X, CheckCircle, Volume2, VolumeX, Crop, Scissors } from "lucide-react";
import { useStudioStore } from "@/store/studioStore";

/* ── Upload helper ──────────────────────────────────────────── */
async function uploadToS3(
  file: File,
  projectId: string,
  fileType: "audio" | "video",
  onProgress: (pct: number) => void,
): Promise<string> {
  const res = await fetch("/api/s3/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId, fileName: file.name, contentType: file.type, fileType }),
  });
  if (!res.ok) throw new Error((await res.json()).error ?? "Upload failed");
  const { uploadUrl, publicUrl } = await res.json();
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`${xhr.status}`)));
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.send(file);
  });
  return publicUrl;
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="w-full h-0.5 bg-[#222] rounded-full overflow-hidden mt-1">
      <div className="h-full bg-[#ccff00] rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
    </div>
  );
}

/* ── AudioSection ─────────────────────────────────────────── */
function AudioSection() {
  const projectId = useStudioStore((s) => s.projectId);
  const audioSrc = useStudioStore((s) => s.audioSrc);
  const setAudioSrc = useStudioStore((s) => s.setAudioSrc);
  const audioTrimStart = useStudioStore((s) => s.audioTrimStart);
  const setAudioTrimStart = useStudioStore((s) => s.setAudioTrimStart);
  const durationInFrames = useStudioStore((s) => s.durationInFrames);
  const fps = useStudioStore((s) => s.template.fps);

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(async (file: File) => {
    if (!projectId || !file.type.startsWith("audio/")) { setError("Please use an audio file"); return; }
    setUploading(true); setError(null);
    try { setAudioSrc(await uploadToS3(file, projectId, "audio", setProgress)); }
    catch (e) { setError(e instanceof Error ? e.message : "Upload failed"); }
    finally { setUploading(false); setProgress(0); }
  }, [projectId, setAudioSrc]);

  const trimStartSec = audioTrimStart !== null ? audioTrimStart / fps : 0;
  const totalSec = durationInFrames / fps;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#555555]" style={{ fontFamily: "Unbounded, sans-serif" }}>Audio</p>
        {audioSrc && <button className="text-[#555] hover:text-red-400 transition-colors" onClick={() => setAudioSrc(null)}><X size={11} /></button>}
      </div>
      {audioSrc ? (
        <div className="flex flex-col gap-2 p-2 rounded-lg bg-[#111] border border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center gap-2">
            <Music size={12} className="text-[#ccff00] shrink-0" />
            <span className="text-[10px] text-white truncate flex-1" style={{ fontFamily: "Outfit, sans-serif" }}>Audio loaded</span>
            <CheckCircle size={11} className="text-[#ccff00] shrink-0" />
          </div>
          <div>
            <div className="flex items-center gap-1 mb-1">
              <Scissors size={9} className="text-[#555]" />
              <span className="text-[9px] text-[#666]" style={{ fontFamily: "Outfit, sans-serif" }}>
                Trim start: {trimStartSec.toFixed(1)}s
              </span>
              {audioTrimStart !== null && audioTrimStart > 0 && (
                <button className="ml-auto text-[8px] text-[#555] hover:text-red-400 transition-colors" onClick={() => setAudioTrimStart(null)} style={{ fontFamily: "Outfit, sans-serif" }}>Reset</button>
              )}
            </div>
            <input type="range" min={0} max={Math.max(0, totalSec - 1)} step={0.1} value={trimStartSec}
              onChange={(e) => { const s = Number(e.target.value); setAudioTrimStart(s > 0 ? Math.round(s * fps) : null); }}
              className="w-full" />
            <p className="text-[8px] text-[#444] mt-0.5" style={{ fontFamily: "Outfit, sans-serif" }}>
              Skip first {trimStartSec.toFixed(1)}s of audio
            </p>
          </div>
          <button className="text-[9px] text-[#555] hover:text-[#ccff00] transition-colors text-left" onClick={() => inputRef.current?.click()} style={{ fontFamily: "Outfit, sans-serif" }}>Replace audio</button>
        </div>
      ) : (
        <div
          className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border-2 border-dashed cursor-pointer transition-all duration-200 ${dragging ? "border-[#ccff00] bg-[rgba(204,255,0,0.04)]" : "border-[#1e1e1e] hover:border-[#333]"}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) upload(f); }}
          onClick={() => !uploading && inputRef.current?.click()}
        >
          {uploading ? (
            <>
              <div className="w-5 h-5 border-2 border-[#ccff00] border-t-transparent rounded-full animate-spin" />
              <span className="text-[9px] text-[#F7F6E5]" style={{ fontFamily: "Outfit, sans-serif" }}>{progress}%</span>
              <ProgressBar pct={progress} />
            </>
          ) : (
            <>
              <Music size={14} className={dragging ? "text-[#ccff00]" : "text-[#333]"} />
              <p className="text-[9px] text-[#666] text-center" style={{ fontFamily: "Outfit, sans-serif" }}>WAV · MP3 · AAC · FLAC · M4A · AIFF</p>
              <p className="text-[8px] text-[#444]" style={{ fontFamily: "Outfit, sans-serif" }}>Drop or click to browse</p>
            </>
          )}
        </div>
      )}
      {error && <p className="text-[9px] text-red-400" style={{ fontFamily: "Outfit, sans-serif" }}>{error}</p>}
      <input ref={inputRef} type="file"
        accept="audio/wav,audio/x-wav,audio/mpeg,audio/mp3,audio/aac,audio/flac,audio/x-flac,audio/ogg,audio/mp4,audio/x-m4a,audio/aiff,audio/x-aiff,audio/opus,audio/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }}
      />
    </div>
  );
}

/* ── VideoSection ─────────────────────────────────────────── */
function VideoSection() {
  const projectId = useStudioStore((s) => s.projectId);
  const videoSrc = useStudioStore((s) => s.videoSrc);
  const setVideoSrc = useStudioStore((s) => s.setVideoSrc);
  const videoFit = useStudioStore((s) => s.videoFit);
  const setVideoFit = useStudioStore((s) => s.setVideoFit);
  const videoVolume = useStudioStore((s) => s.videoVolume);
  const setVideoVolume = useStudioStore((s) => s.setVideoVolume);
  const videoCrop = useStudioStore((s) => s.videoCrop);
  const setVideoCrop = useStudioStore((s) => s.setVideoCrop);

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [showCrop, setShowCrop] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(async (file: File) => {
    if (!projectId || !file.type.startsWith("video/")) { setError("Please use a video file"); return; }
    setUploading(true); setError(null);
    try { setVideoSrc(await uploadToS3(file, projectId, "video", setProgress)); }
    catch (e) { setError(e instanceof Error ? e.message : "Upload failed"); }
    finally { setUploading(false); setProgress(0); }
  }, [projectId, setVideoSrc]);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#555555]" style={{ fontFamily: "Unbounded, sans-serif" }}>Background Video</p>
        {videoSrc && <button className="text-[#555] hover:text-red-400 transition-colors" onClick={() => setVideoSrc(null)}><X size={11} /></button>}
      </div>
      {videoSrc ? (
        <div className="flex flex-col gap-1.5 p-2 rounded-lg bg-[#111] border border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center gap-2">
            <Video size={12} className="text-[#ccff00] shrink-0" />
            <span className="text-[10px] text-white truncate flex-1" style={{ fontFamily: "Outfit, sans-serif" }}>Video loaded</span>
            <CheckCircle size={11} className="text-[#ccff00] shrink-0" />
          </div>
          <div className="flex gap-1">
            {(["cover", "contain", "fill"] as const).map((fit) => (
              <button key={fit} onClick={() => setVideoFit(fit)}
                title={fit === "cover" ? "Fill — crop edges" : fit === "contain" ? "Fit — letterbox" : "Stretch to fill"}
                className="flex-1 text-[9px] py-0.5 rounded transition-all"
                style={{ fontFamily: "Outfit, sans-serif", background: videoFit === fit ? "#ccff00" : "rgba(255,255,255,0.05)", color: videoFit === fit ? "#050505" : "#666", border: `1px solid ${videoFit === fit ? "#ccff00" : "rgba(255,255,255,0.08)"}`, fontWeight: videoFit === fit ? 700 : 400 }}>
                {fit}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button className="text-[#666] hover:text-[#ccff00] transition-colors" onClick={() => setVideoVolume(videoVolume > 0 ? 0 : 1)}>
              {videoVolume > 0 ? <Volume2 size={12} /> : <VolumeX size={12} />}
            </button>
            <input type="range" min={0} max={1} step={0.05} value={videoVolume} onChange={(e) => setVideoVolume(Number(e.target.value))} className="flex-1" />
            <span className="w-7 text-right text-[9px] text-[#666]" style={{ fontFamily: "Outfit, sans-serif" }}>{Math.round(videoVolume * 100)}%</span>
          </div>
          <div>
            <button className="flex items-center gap-1.5 text-[9px] w-full transition-colors"
              style={{ fontFamily: "Outfit, sans-serif", color: showCrop ? "#ccff00" : "#555" }}
              onClick={() => setShowCrop((v) => !v)}>
              <Crop size={9} /><span>Crop video</span>
              {videoCrop && <span className="ml-auto text-[#ccff00]">active</span>}
            </button>
            {showCrop && (
              <div className="mt-1.5 space-y-1.5 pl-1">
                {(["x", "y", "width", "height"] as const).map((key) => {
                  const crop = videoCrop ?? { x: 0, y: 0, width: 100, height: 100 };
                  const labels: Record<string, string> = { x: "Left", y: "Top", width: "Width", height: "Height" };
                  return (
                    <div key={key} className="space-y-0.5">
                      <div className="flex justify-between text-[9px] text-[#888]" style={{ fontFamily: "Outfit, sans-serif" }}>
                        <span>{labels[key]}</span><span>{Math.round(crop[key])}%</span>
                      </div>
                      <input type="range" min={0} max={100} step={1} value={crop[key]}
                        onChange={(e) => setVideoCrop({ ...crop, [key]: Number(e.target.value) })}
                        className="w-full" />
                    </div>
                  );
                })}
                {videoCrop && (
                  <button className="text-[9px] text-[#555] hover:text-red-400 transition-colors" style={{ fontFamily: "Outfit, sans-serif" }} onClick={() => setVideoCrop(null)}>Reset crop</button>
                )}
              </div>
            )}
          </div>
          <button className="text-[9px] text-[#555] hover:text-[#ccff00] transition-colors text-left" onClick={() => inputRef.current?.click()} style={{ fontFamily: "Outfit, sans-serif" }}>Replace video</button>
        </div>
      ) : (
        <div
          className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border-2 border-dashed cursor-pointer transition-all duration-200 ${dragging ? "border-[#ccff00] bg-[rgba(204,255,0,0.04)]" : "border-[#1e1e1e] hover:border-[#333]"}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) upload(f); }}
          onClick={() => !uploading && inputRef.current?.click()}
        >
          {uploading ? (
            <>
              <div className="w-5 h-5 border-2 border-[#ccff00] border-t-transparent rounded-full animate-spin" />
              <span className="text-[9px] text-[#F7F6E5]" style={{ fontFamily: "Outfit, sans-serif" }}>{progress}%</span>
              <ProgressBar pct={progress} />
            </>
          ) : (
            <>
              <Video size={14} className={dragging ? "text-[#ccff00]" : "text-[#333]"} />
              <p className="text-[9px] text-[#666] text-center" style={{ fontFamily: "Outfit, sans-serif" }}>MP4 · MOV · WebM</p>
              <p className="text-[8px] text-[#444]" style={{ fontFamily: "Outfit, sans-serif" }}>Drop or click to browse</p>
            </>
          )}
        </div>
      )}
      {error && <p className="text-[9px] text-red-400" style={{ fontFamily: "Outfit, sans-serif" }}>{error}</p>}
      <input ref={inputRef} type="file" accept="video/mp4,video/quicktime,video/webm,video/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }}
      />
    </div>
  );
}

/* ── UploadZone ───────────────────────────────────────────── */
export function UploadZone() {
  return (
    <div className="px-4 py-3 border-b flex flex-col gap-4" style={{ borderColor: "#222222" }}>
      <AudioSection />
      <div style={{ height: 1, background: "#1a1a1a" }} />
      <VideoSection />
    </div>
  );
}

