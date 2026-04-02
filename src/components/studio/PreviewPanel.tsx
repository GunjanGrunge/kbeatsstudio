"use client";

import { useMemo, useDeferredValue } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { useStudioStore } from "@/store/studioStore";
import { KBeatsComposition } from "@/remotion/compositions/KBeatsComposition";
import type { KBeatsInputProps } from "@/types/studio";
import { useProjectDuration } from "@/hooks/useProjectDuration";

interface Props {
  playerRef: React.RefObject<PlayerRef | null> | ((ref: PlayerRef | null) => void);
}

export function PreviewPanel({ playerRef }: Props) {
  useProjectDuration();

  const template = useStudioStore((s) => s.template);
  const audioSrc = useStudioStore((s) => s.audioSrc);
  const videoSrc = useStudioStore((s) => s.videoSrc);
  const videoFit = useStudioStore((s) => s.videoFit);
  const durationInFrames = useStudioStore((s) => s.durationInFrames);
  const overlays = useStudioStore((s) => s.overlays);
  const backgroundColor = useStudioStore((s) => s.backgroundColor);
  const backgroundOpacity = useStudioStore((s) => s.backgroundOpacity);

  const rawInputProps: KBeatsInputProps = useMemo(
    () => ({
      audioSrc,
      videoSrc,
      videoFit,
      durationInFrames,
      fps: template.fps,
      width: template.width,
      height: template.height,
      backgroundColor,
      backgroundOpacity,
      overlays,
    }),
    [audioSrc, videoSrc, videoFit, durationInFrames, template, backgroundColor, backgroundOpacity, overlays]
  );

  // Defer to avoid jank while dragging sliders
  const inputProps = useDeferredValue(rawInputProps);

  const aspectRatio = template.width / template.height;

  return (
    <div className="flex flex-col h-full bg-[#050505]">
      {/* Preview canvas */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-hidden">
        <div
          className="relative w-full max-h-full"
          style={{
            aspectRatio: `${template.width} / ${template.height}`,
            maxWidth: `calc(min(100%, (100vh - 160px) * ${aspectRatio}))`,
          }}
        >
          {/* Canvas shadow/border */}
          <div
            className="absolute inset-0 rounded-lg overflow-hidden"
            style={{
              boxShadow: "0 0 0 1px rgba(255,255,255,0.06), 0 20px 60px rgba(0,0,0,0.8)",
            }}
          >
            <Player
              ref={playerRef}
              component={KBeatsComposition as unknown as React.ComponentType<Record<string, unknown>>}
              inputProps={inputProps as unknown as Record<string, unknown>}
              durationInFrames={Math.max(1, durationInFrames)}
              fps={template.fps}
              compositionWidth={template.width}
              compositionHeight={template.height}
              style={{ width: "100%", height: "100%", borderRadius: 8 }}
              loop
              clickToPlay
              acknowledgeRemotionLicense
            />
          </div>
        </div>
      </div>

      {/* Dims info strip */}
      <div
        className="flex items-center justify-between px-4 py-2 border-t shrink-0"
        style={{ borderColor: "#111111", background: "#0a0a0a" }}
      >
        <span className="text-[10px] text-[#444444] font-mono">
          {template.width}×{template.height} · {template.fps}fps · {template.name}
        </span>
        <span className="text-[10px] text-[#444444] font-mono">
          {Math.round(durationInFrames / template.fps)}s · {durationInFrames} frames
        </span>
      </div>
    </div>
  );
}
