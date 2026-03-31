"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Music, Video, X, CheckCircle } from "lucide-react";
import { useStudioStore } from "@/store/studioStore";

export function UploadZone() {
  const projectId = useStudioStore((s) => s.projectId);
  const audioSrc = useStudioStore((s) => s.audioSrc);
  const videoSrc = useStudioStore((s) => s.videoSrc);
  const setAudioSrc = useStudioStore((s) => s.setAudioSrc);
  const setVideoSrc = useStudioStore((s) => s.setVideoSrc);

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
            <div className="flex items-center gap-2 p-2 rounded-lg bg-[#1a1a1c] border border-[rgba(255,255,255,0.05)]">
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
              <span className="text-xs text-[#888888]" style={{ fontFamily: "Outfit, sans-serif" }}>
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
              <p className="text-xs text-[#888888] text-center" style={{ fontFamily: "Outfit, sans-serif" }}>
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
