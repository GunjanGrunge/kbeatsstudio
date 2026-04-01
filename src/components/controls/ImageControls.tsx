"use client";

import { useRef, useState } from "react";
import { ImageIcon, Upload, X, Scissors } from "lucide-react";
import { useStudioStore } from "@/store/studioStore";
import { Slider } from "@/components/ui/slider";

interface Props {
  overlayId: string;
}

export function ImageControls({ overlayId }: Props) {
  const overlay = useStudioStore((s) => s.overlays.find((o) => o.id === overlayId));
  const updateOverlay = useStudioStore((s) => s.updateOverlay);
  const projectId = useStudioStore((s) => s.projectId);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [removingBg, setRemovingBg] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!overlay) return null;

  const scale = overlay.componentScale ?? 1;

  const uploadImage = async (file: File) => {
    if (!projectId) return;
    setUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const res = await fetch("/api/s3/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          fileName: file.name,
          contentType: file.type,
          fileType: "image",
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Upload failed");
      }

      const { uploadUrl, publicUrl } = await res.json();

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

      updateOverlay(overlayId, { imageSrc: publicUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const removeBackground = async () => {
    if (!overlay.imageSrc || !projectId) return;
    setRemovingBg(true);
    setError(null);
    try {
      const { removeBackground: removeBg } = await import("@imgly/background-removal");
      const blob = await removeBg(overlay.imageSrc);
      const file = new File([blob], "image-nobg.png", { type: "image/png" });

      // Upload with a stable unique key so it doesn't clobber the original
      setUploading(true);
      const res = await fetch("/api/s3/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          fileName: file.name,
          contentType: file.type,
          fileType: "image",
          uniqueKey: "image-nobg",
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Upload failed");
      }
      const { uploadUrl, publicUrl } = await res.json();
      await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      updateOverlay(overlayId, { imageSrc: publicUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Background removal failed");
    } finally {
      setRemovingBg(false);
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-[10px] uppercase tracking-[0.2em] text-[#F7F6E5]" style={{ fontFamily: "Unbounded, sans-serif" }}>
        Image / Logo
      </p>

      {/* Image source */}
      <div className="space-y-2">
        {overlay.imageSrc ? (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-[#1a1a1c] border border-[rgba(255,255,255,0.05)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={overlay.imageSrc}
              alt="Logo preview"
              className="w-8 h-8 object-contain rounded shrink-0"
              style={{ background: "rgba(255,255,255,0.05)" }}
            />
            <span className="text-xs text-white truncate flex-1" style={{ fontFamily: "Outfit, sans-serif" }}>
              Logo loaded
            </span>
            <button
              className="text-[#F7F6E5] hover:text-red-400 transition-colors"
              onClick={() => updateOverlay(overlayId, { imageSrc: undefined })}
            >
              <X size={11} />
            </button>
          </div>
        ) : (
          <button
            className="w-full flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed transition-all duration-300 border-[#222222] hover:border-[#444444]"
            onClick={() => !uploading && inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <div className="w-5 h-5 border-2 border-[#ccff00] border-t-transparent rounded-full animate-spin" />
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
                <ImageIcon size={16} className="text-[#F7F6E5]" />
                <span className="text-xs text-[#F7F6E5]" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Upload logo / image
                </span>
                <span className="text-[10px] text-[#F7F6E5]" style={{ fontFamily: "Outfit, sans-serif" }}>
                  PNG with transparency recommended
                </span>
              </>
            )}
          </button>
        )}

        {overlay.imageSrc && (
          <button
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] transition-colors border"
            style={{
              fontFamily: "Outfit, sans-serif",
              color: removingBg ? "#F7F6E5" : "#F7F6E5",
              borderColor: "#1a1a1c",
            }}
            onClick={removeBackground}
            disabled={removingBg || uploading}
          >
            {removingBg ? (
              <>
                <div className="w-3 h-3 border border-[#ccff00] border-t-transparent rounded-full animate-spin" />
                Processing…
              </>
            ) : (
              <>
                <Scissors size={10} />
                Remove BG
              </>
            )}
          </button>
        )}

        {overlay.imageSrc && (
          <button
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] text-[#F7F6E5] hover:text-[#ccff00] transition-colors border border-[#1a1a1c] hover:border-[#333333]"
            style={{ fontFamily: "Outfit, sans-serif" }}
            onClick={() => inputRef.current?.click()}
          >
            <Upload size={10} />
            Replace image
          </button>
        )}

        {error && (
          <p className="text-xs text-red-400" style={{ fontFamily: "Outfit, sans-serif" }}>
            {error}
          </p>
        )}
      </div>

      {/* Size control */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[10px] text-[#F7F6E5]" style={{ fontFamily: "Outfit, sans-serif" }}>
          <span>Size</span>
          <span>{Math.round(scale * 100)}%</span>
        </div>
        <Slider
          min={0.1}
          max={5}
          step={0.05}
          value={[scale]}
          onValueChange={(vals) => updateOverlay(overlayId, { componentScale: (vals as number[])[0] })}
        />
        <div className="flex gap-1.5 mt-1">
          {[0.5, 1, 1.5, 2, 3].map((v) => (
            <button
              key={v}
              className="flex-1 py-1 rounded text-[10px] transition-all duration-150 border"
              style={{
                fontFamily: "Outfit, sans-serif",
                background: Math.abs(scale - v) < 0.03 ? "rgba(204,255,0,0.1)" : "rgba(255,255,255,0.03)",
                borderColor: Math.abs(scale - v) < 0.03 ? "rgba(204,255,0,0.4)" : "rgba(255,255,255,0.06)",
                color: Math.abs(scale - v) < 0.03 ? "#ccff00" : "#666666",
              }}
              onClick={() => updateOverlay(overlayId, { componentScale: v })}
            >
              {v === 1 ? "1×" : `${v}×`}
            </button>
          ))}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) uploadImage(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
