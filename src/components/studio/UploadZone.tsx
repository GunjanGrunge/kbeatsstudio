"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Music, Video, X, CheckCircle, Volume2, VolumeX, Crop } from "lucide-react";
import { useStudioStore } from "@/store/studioStore";
import { Slider } from "@/components/ui/slider";

export function UploadZone() {
  const projectId = useStudioStore((s) => s.projectId);
  const audioSrc = useStudioStore((s) => s.audioSrc);
  const videoSrc = useStudioStore((s) => s.videoSrc);
  const setAudioSrc = useStudioStore((s) => s.setAudioSrc);
  const setVideoSrc = useStudioStore((s) => s.setVideoSrc);
  const videoFit = useStudioStore((s) => s.videoFit);
  const setVideoFit = useStudioStore((s) => s.setVideoFit);
  const videoVolume = useStudioStore((s) => s.videoVolume);
  const setVideoVolume = useStudioStore((s) => s.setVideoVolume);
  const videoCrop = useStudioStore((s) => s.videoCrop);
  const setVideoCrop = useStudioStore((s) => s.setVideoCrop);
  const [showCrop, setShowCrop] = useState(false);

  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(async (file: File) => {
    if (!projectId) return;
    setUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const isVideo = file.type.startsWith("video/");
      const fileType = isVideo ? "video" : "audio";

      // Get presigned URL
      const res = await fetch("/api/s3/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          fileName: file.name,
          contentType: file.type,
          fileType,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Upload failed");
      }

      const { uploadUrl, publicUrl } = await res.json();

      // Direct upload to S3
      const xhr = new XMLHttpRequest();
      await new Promise<void>((resolve, reject) => {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed: ${xhr.status}`));
        };
        xhr.onerror = () => reject(new Error("Upload network error"));
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });

      if (isVideo) {
        setVideoSrc(publicUrl);
      } else {
        setAudioSrc(publicUrl);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [projectId, setAudioSrc, setVideoSrc]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }, [uploadFile]);

  const hasMedia = audioSrc || videoSrc;

  return (
    <div className="px-4 py-3 border-b" style={{ borderColor: "#222222" }}>
      <p className="text-[10px] uppercase tracking-[0.2em] text-[#555555] mb-2" style={{ fontFamily: "Unbounded, sans-serif" }}>
        Media Source
      </p>

      {hasMedia ? (
        <div className="flex flex-col gap-1.5">
          {audioSrc && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-[#1a1a1c] border border-[rgba(255,255,255,0.05)]">
              <Music size={13} className="text-[#ccff00] shrink-0" />
              <span className="text-xs text-white truncate flex-1" style={{ fontFamily: "Outfit, sans-serif" }}>
                Audio loaded
              </span>
              <CheckCircle size={13} className="text-[#ccff00] shrink-0" />
              <button
                onClick={() => setAudioSrc(null)}
                className="text-[#555555] hover:text-red-400 transition-colors"
              >
                <X size={11} />
              </button>
            </div>
          )}
          {videoSrc && (
            <div className="flex flex-col gap-1.5 p-2 rounded-lg bg-[#1a1a1c] border border-[rgba(255,255,255,0.05)]">
              <div className="flex items-center gap-2">
                <Video size={13} className="text-[#ccff00] shrink-0" />
                <span className="text-xs text-white truncate flex-1" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Video loaded
                </span>
                <CheckCircle size={13} className="text-[#ccff00] shrink-0" />
                <button
                  onClick={() => setVideoSrc(null)}
                  className="text-[#555555] hover:text-red-400 transition-colors"
                >
                  <X size={11} />
                </button>
              </div>
              {/* Fit toggle */}
              <div className="flex gap-1">
                {(["cover", "contain", "fill"] as const).map((fit) => (
                  <button
                    key={fit}
                    onClick={() => setVideoFit(fit)}
                    className="flex-1 text-[9px] py-0.5 rounded transition-all"
                    style={{
                      fontFamily: "Outfit, sans-serif",
                      background: videoFit === fit ? "#ccff00" : "rgba(255,255,255,0.05)",
                      color: videoFit === fit ? "#050505" : "#666666",
                      border: `1px solid ${videoFit === fit ? "#ccff00" : "rgba(255,255,255,0.08)"}`,
                      fontWeight: videoFit === fit ? 700 : 400,
                    }}
                    title={
                      fit === "cover" ? "Fill canvas — crop edges if needed" :
                      fit === "contain" ? "Fit inside canvas — letterbox/pillarbox" :
                      "Stretch to fill — may distort"
                    }
                  >
                    {fit}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  className="text-[#666] hover:text-[#ccff00] transition-colors"
                  title={videoVolume > 0 ? "Mute source video audio" : "Unmute source video audio"}
                  onClick={() => setVideoVolume(videoVolume > 0 ? 0 : 1)}
                >
                  {videoVolume > 0 ? <Volume2 size={13} /> : <VolumeX size={13} />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={videoVolume}
                  onChange={(e) => setVideoVolume(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="w-8 text-right text-[9px] text-[#666]" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {Math.round(videoVolume * 100)}%
                </span>
              </div>
              {/* Crop toggle */}
              <div className="pt-1">
                <button
                  className="flex items-center gap-1.5 text-[9px] transition-colors w-full"
                  style={{
                    fontFamily: "Outfit, sans-serif",
                    color: showCrop ? "#ccff00" : "#555555",
                  }}
                  onClick={() => setShowCrop((v) => !v)}
                >
                  <Crop size={10} />
                  <span>Crop background video</span>
                  {videoCrop && <span className="ml-auto text-[#ccff00]">active</span>}
                </button>
                {showCrop && (
                  <div className="mt-2 space-y-2 pl-1">
                    {(["x", "y", "width", "height"] as const).map((key) => {
                      const crop = videoCrop ?? { x: 0, y: 0, width: 100, height: 100 };
                      const labels: Record<string, string> = { x: "Left", y: "Top", width: "Width", height: "Height" };
                      return (
                        <div key={key} className="space-y-0.5">
                          <div className="flex justify-between text-[9px] text-[#999]" style={{ fontFamily: "Outfit, sans-serif" }}>
                            <span>{labels[key]}</span>
                            <span>{Math.round(crop[key])}%</span>
                          </div>
                          <input
                            type="range"
                            min={0} max={100} step={1}
                            value={crop[key]}
                            onChange={(e) => setVideoCrop({ ...crop, [key]: Number(e.target.value) })}
                            className="w-full"
                          />
                        </div>
                      );
                    })}
                    {videoCrop && (
                      <button
                        className="text-[9px] text-[#555] hover:text-red-400 transition-colors"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                        onClick={() => setVideoCrop(null)}
                      >
                        Reset crop
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          <button
            className="text-[10px] text-[#555555] hover:text-[#ccff00] transition-colors text-center py-1"
            style={{ fontFamily: "Outfit, sans-serif" }}
            onClick={() => inputRef.current?.click()}
          >
            Replace media
          </button>
        </div>
      ) : (
        <div
          className={`relative flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-300 ${
            dragging ? "border-[#ccff00] bg-[rgba(204,255,0,0.05)]" : "border-[#222222] hover:border-[#444444]"
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && inputRef.current?.click()}
        >
          {uploading ? (
            <>
              <div className="w-6 h-6 border-2 border-[#ccff00] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-[#F7F6E5]" style={{ fontFamily: "Outfit, sans-serif" }}>
                Uploading... {uploadProgress}%
              </span>
              <div className="w-full h-1 bg-[#222222] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#ccff00] rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </>
          ) : (
            <>
              <Upload size={18} className={dragging ? "text-[#ccff00]" : "text-[#555555]"} />
              <p className="text-xs text-[#F7F6E5] text-center" style={{ fontFamily: "Outfit, sans-serif" }}>
                Drop MP3 / MP4 here
              </p>
              <p className="text-[10px] text-[#555555]" style={{ fontFamily: "Outfit, sans-serif" }}>
                or click to browse
              </p>
            </>
          )}
        </div>
      )}

      {error && (
        <p className="text-xs text-red-400 mt-1" style={{ fontFamily: "Outfit, sans-serif" }}>
          {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="audio/*,video/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) uploadFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
