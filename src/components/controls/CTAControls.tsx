"use client";

import { useRef, useState } from "react";
import { useStudioStore } from "@/store/studioStore";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { AnimationVariantControl, SUBSCRIBE_VARIANTS, LIKE_VARIANTS } from "@/components/controls/AnimationVariantControl";
import { HexColorPicker } from "react-colorful";
import { ImageIcon, Upload, X, ChevronDown } from "lucide-react";
import { injectGoogleFont } from "@/lib/googleFonts";
import { FALLBACK_FONTS } from "@/lib/googleFonts";

interface Props {
  overlayId: string;
}

function ScaleControl({ overlayId }: { overlayId: string }) {
  const overlay = useStudioStore((s) => s.overlays.find((o) => o.id === overlayId));
  const updateOverlay = useStudioStore((s) => s.updateOverlay);
  if (!overlay) return null;
  const scale = overlay.componentScale ?? 1;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[10px] text-[#F7F6E5]" style={{ fontFamily: "Outfit, sans-serif" }}>
        <span>Size</span>
        <span>{Math.round(scale * 100)}%</span>
      </div>
      <Slider
        min={0.2} max={3} step={0.05}
        value={[scale]}
        onValueChange={(vals) => updateOverlay(overlayId, { componentScale: (vals as number[])[0] })}
      />
      <div className="flex gap-1.5 mt-1">
        {[0.5, 0.75, 1, 1.5, 2].map((v) => (
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
  );
}

/* ── Inline mini color picker swatch ── */
function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (c: string) => void }) {
  const [open, setOpen] = useState(false);
  const safeColor = /^#[0-9a-fA-F]{3,8}$/.test(value) ? value : "#ccff00";
  return (
    <div className="space-y-1">
      <Label className="text-[10px] text-[#F7F6E5]" style={{ fontFamily: "Outfit, sans-serif" }}>{label}</Label>
      <div className="flex items-center gap-2">
        <button
          className="w-7 h-7 rounded-md border border-[rgba(255,255,255,0.1)] shrink-0 transition-transform hover:scale-110"
          style={{ background: safeColor }}
          onClick={() => setOpen(v => !v)}
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 text-[11px] font-mono bg-[rgba(255,255,255,0.04)] border-[#333] text-white flex-1"
          style={{ fontFamily: "Outfit, sans-serif" }}
        />
      </div>
      {open && (
        <div className="rounded-xl overflow-hidden border border-[#333]">
          <HexColorPicker color={safeColor} onChange={onChange} style={{ width: "100%" }} />
        </div>
      )}
    </div>
  );
}

/* ── Mini font picker for share card ── */
function ShareFontPicker({ overlayId }: { overlayId: string }) {
  const overlay = useStudioStore((s) => s.overlays.find((o) => o.id === overlayId));
  const updateOverlay = useStudioStore((s) => s.updateOverlay);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  if (!overlay) return null;

  const currentFamily = overlay.font?.family ?? "Outfit";
  const filtered = FALLBACK_FONTS.filter(f => f.family.toLowerCase().includes(search.toLowerCase())).slice(0, 50);

  const select = (family: string) => {
    injectGoogleFont(family, [400, 700]);
    updateOverlay(overlayId, { font: { ...(overlay.font ?? { weight: 700, size: 48, letterSpacing: 0, lineHeight: 1.4, align: "center" }), family } });
    setOpen(false);
    setSearch("");
  };

  return (
    <div className="space-y-1">
      <Label className="text-[10px] text-[#F7F6E5]" style={{ fontFamily: "Outfit, sans-serif" }}>Font</Label>
      <button
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[#333] text-white text-xs hover:border-[#ccff00] transition-colors"
        style={{ fontFamily: `'${currentFamily}', sans-serif` }}
        onClick={() => setOpen(v => !v)}
      >
        <span>{currentFamily}</span>
        <ChevronDown size={12} className="text-[#F7F6E5]" />
      </button>
      {open && (
        <div className="rounded-xl border border-[#333] overflow-hidden" style={{ background: "#141414" }}>
          <div className="flex items-center gap-2 px-3 py-2 border-b border-[#222]">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search fonts..."
              className="flex-1 text-xs text-white bg-transparent outline-none placeholder-[#444]"
              style={{ fontFamily: "Outfit, sans-serif" }}
            />
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 200 }}>
            {filtered.map((f) => (
              <button
                key={f.family}
                className="w-full px-3 py-2.5 text-left flex flex-col gap-0.5 hover:bg-[rgba(255,255,255,0.04)] transition-colors"
                style={{ borderLeft: f.family === currentFamily ? "2px solid #ccff00" : "2px solid transparent" }}
                onClick={() => select(f.family)}
              >
                <span style={{ fontFamily: `'${f.family}', sans-serif`, fontSize: 14, fontWeight: 700, color: f.family === currentFamily ? "#ccff00" : "#F7F6E5" }}>
                  {f.family}
                </span>
                <span style={{ fontFamily: `'${f.family}', sans-serif`, fontSize: 11, color: "rgba(247,246,229,0.35)" }}>
                  The quick brown fox
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Full share card controls ── */
function ShareControls({ overlayId }: { overlayId: string }) {
  const overlay = useStudioStore((s) => s.overlays.find((o) => o.id === overlayId));
  const updateOverlay = useStudioStore((s) => s.updateOverlay);
  const projectId = useStudioStore((s) => s.projectId);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  if (!overlay) return null;

  const uploadImage = async (file: File) => {
    if (!projectId) return;
    setUploading(true);
    setUploadError(null);
    setUploadProgress(0);
    try {
      const res = await fetch("/api/s3/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, fileName: file.name, contentType: file.type, fileType: "share-thumb" }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Upload failed");
      const { uploadUrl, publicUrl } = await res.json();
      const xhr = new XMLHttpRequest();
      await new Promise<void>((resolve, reject) => {
        xhr.upload.onprogress = (e) => { if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100)); };
        xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`${xhr.status}`));
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });
      updateOverlay(overlayId, { shareImageSrc: publicUrl });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-[10px] uppercase tracking-[0.2em] text-[#F7F6E5]" style={{ fontFamily: "Unbounded, sans-serif" }}>
        Share Card
      </p>

      {/* Channel / brand name (shown in thumbnail placeholder) */}
      <div className="space-y-1">
        <Label className="text-[10px] text-[#F7F6E5]" style={{ fontFamily: "Outfit, sans-serif" }}>Channel Name</Label>
        <Input
          value={overlay.channelName ?? ""}
          onChange={(e) => updateOverlay(overlayId, { channelName: e.target.value })}
          placeholder="K BEATS"
          className="h-8 text-xs bg-[rgba(255,255,255,0.05)] border-[#333] text-white"
          style={{ fontFamily: "Outfit, sans-serif" }}
        />
      </div>

      {/* Song title */}
      <div className="space-y-1">
        <Label className="text-[10px] text-[#F7F6E5]" style={{ fontFamily: "Outfit, sans-serif" }}>Song / Title</Label>
        <Input
          value={overlay.shareTitle ?? ""}
          onChange={(e) => updateOverlay(overlayId, { shareTitle: e.target.value })}
          placeholder="Latest Beat Drop"
          className="h-8 text-xs bg-[rgba(255,255,255,0.05)] border-[#333] text-white"
          style={{ fontFamily: "Outfit, sans-serif" }}
        />
      </div>

      {/* Username */}
      <div className="space-y-1">
        <Label className="text-[10px] text-[#F7F6E5]" style={{ fontFamily: "Outfit, sans-serif" }}>Username / Handle</Label>
        <Input
          value={overlay.shareUsername ?? ""}
          onChange={(e) => updateOverlay(overlayId, { shareUsername: e.target.value })}
          placeholder="@kbeats"
          className="h-8 text-xs bg-[rgba(255,255,255,0.05)] border-[#333] text-white"
          style={{ fontFamily: "Outfit, sans-serif" }}
        />
      </div>

      {/* Thumbnail image */}
      <div className="space-y-1.5">
        <Label className="text-[10px] text-[#F7F6E5]" style={{ fontFamily: "Outfit, sans-serif" }}>Thumbnail Image</Label>
        {overlay.shareImageSrc ? (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-[#1a1a1c] border border-[rgba(255,255,255,0.05)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={overlay.shareImageSrc} alt="" className="w-10 h-8 object-cover rounded shrink-0" />
              <span className="text-xs text-white truncate flex-1" style={{ fontFamily: "Outfit, sans-serif" }}>Image loaded</span>
              <button className="text-[#F7F6E5] hover:text-red-400 transition-colors" onClick={() => updateOverlay(overlayId, { shareImageSrc: undefined })}>
                <X size={11} />
              </button>
            </div>
            <button
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] text-[#F7F6E5] hover:text-[#ccff00] border border-[#1a1a1c] hover:border-[#333] transition-colors"
              style={{ fontFamily: "Outfit, sans-serif" }}
              onClick={() => inputRef.current?.click()}
            >
              <Upload size={10} /> Replace
            </button>
          </div>
        ) : (
          <button
            className="w-full flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-[#222] hover:border-[#444] transition-all"
            onClick={() => !uploading && inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-[#ccff00] border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-[#F7F6E5]" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {uploadProgress}%
                </span>
              </>
            ) : (
              <>
                <ImageIcon size={15} className="text-[#F7F6E5]" />
                <span className="text-xs text-[#F7F6E5]" style={{ fontFamily: "Outfit, sans-serif" }}>Upload thumbnail</span>
              </>
            )}
          </button>
        )}
        {uploadError && <p className="text-xs text-red-400" style={{ fontFamily: "Outfit, sans-serif" }}>{uploadError}</p>}
        <input ref={inputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.target.value = ""; }} />
      </div>

      {/* Font */}
      <ShareFontPicker overlayId={overlayId} />

      {/* Title color */}
      <ColorField
        label="Text Color"
        value={overlay.color ?? "#F7F6E5"}
        onChange={(c) => updateOverlay(overlayId, { color: c })}
      />

      {/* Accent / send button color */}
      <ColorField
        label="Accent Color"
        value={overlay.accentColor ?? "#ccff00"}
        onChange={(c) => updateOverlay(overlayId, { accentColor: c })}
      />

      {/* Card background */}
      <ColorField
        label="Card Background"
        value={overlay.cardBgColor ?? "#0a0a0a"}
        onChange={(c) => updateOverlay(overlayId, { cardBgColor: c })}
      />

      {/* Card border */}
      <ColorField
        label="Card Border"
        value={overlay.cardBorderColor ?? "rgba(255,255,255,0.08)"}
        onChange={(c) => updateOverlay(overlayId, { cardBorderColor: c })}
      />

      {/* Scale */}
      <ScaleControl overlayId={overlayId} />
    </div>
  );
}

export function CTAControls({ overlayId }: Props) {
  const overlay = useStudioStore((s) => s.overlays.find((o) => o.id === overlayId));
  const updateOverlay = useStudioStore((s) => s.updateOverlay);

  if (!overlay) return null;

  if (overlay.type === "yt-subscribe") {
    return (
      <div className="space-y-3">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#F7F6E5]" style={{ fontFamily: "Unbounded, sans-serif" }}>
          Subscribe CTA
        </p>
        <div className="space-y-1">
          <Label className="text-[10px] text-[#F7F6E5]" style={{ fontFamily: "Outfit, sans-serif" }}>Channel Name</Label>
          <Input
            value={overlay.channelName ?? ""}
            onChange={(e) => updateOverlay(overlayId, { channelName: e.target.value })}
            placeholder="KBeats"
            className="h-8 text-xs bg-[rgba(255,255,255,0.05)] border-[#333333] text-white"
            style={{ fontFamily: "Outfit, sans-serif" }}
          />
        </div>
        <AnimationVariantControl
          overlayId={overlayId}
          variants={SUBSCRIBE_VARIANTS}
          defaultVariant="slide-up"
          sectionLabel="Entrance Style"
        />
        <ScaleControl overlayId={overlayId} />
      </div>
    );
  }

  if (overlay.type === "yt-like") {
    return (
      <div className="space-y-3">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#F7F6E5]" style={{ fontFamily: "Unbounded, sans-serif" }}>
          Like CTA
        </p>
        <AnimationVariantControl
          overlayId={overlayId}
          variants={LIKE_VARIANTS}
          defaultVariant="pulse"
          sectionLabel="Animation Style"
        />
        <ScaleControl overlayId={overlayId} />
      </div>
    );
  }

  if (overlay.type === "ig-like") {
    return (
      <div className="space-y-3">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#F7F6E5]" style={{ fontFamily: "Unbounded, sans-serif" }}>
          Instagram Like
        </p>
        <ScaleControl overlayId={overlayId} />
      </div>
    );
  }

  if (overlay.type === "ig-share") {
    return <ShareControls overlayId={overlayId} />;
  }

  if (overlay.type === "ig-follow") {
    return (
      <div className="space-y-3">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#F7F6E5]" style={{ fontFamily: "Unbounded, sans-serif" }}>
          Instagram Follow
        </p>
        <div className="space-y-1">
          <Label className="text-[10px] text-[#F7F6E5]" style={{ fontFamily: "Outfit, sans-serif" }}>Username</Label>
          <Input
            value={overlay.username ?? ""}
            onChange={(e) => updateOverlay(overlayId, { username: e.target.value })}
            placeholder="@kbeats"
            className="h-8 text-xs bg-[rgba(255,255,255,0.05)] border-[#333333] text-white"
            style={{ fontFamily: "Outfit, sans-serif" }}
          />
        </div>
        <ScaleControl overlayId={overlayId} />
      </div>
    );
  }

  if (overlay.type === "text") {
    return (
      <div className="space-y-3">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#F7F6E5]" style={{ fontFamily: "Unbounded, sans-serif" }}>
          Text Content
        </p>
        <div className="space-y-1">
          <Label className="text-[10px] text-[#F7F6E5]" style={{ fontFamily: "Outfit, sans-serif" }}>Text</Label>
          <textarea
            value={overlay.text ?? ""}
            onChange={(e) => updateOverlay(overlayId, { text: e.target.value })}
            placeholder="Your text here"
            rows={3}
            className="w-full rounded-lg px-3 py-2 text-xs text-white outline-none resize-none"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid #333333",
              fontFamily: "Outfit, sans-serif",
              lineHeight: 1.6,
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#ccff00")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#333333")}
          />
        </div>
      </div>
    );
  }

  return null;
}
