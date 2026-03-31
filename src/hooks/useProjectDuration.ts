"use client";

import { useEffect } from "react";
import { useStudioStore } from "@/store/studioStore";

/**
 * Detects audio/video duration via the Web Audio API and updates durationInFrames in the store.
 * Must be called in a client component. Runs whenever audioSrc changes.
 */
export function useProjectDuration() {
  const audioSrc = useStudioStore((s) => s.audioSrc);
  const videoSrc = useStudioStore((s) => s.videoSrc);
  const fps = useStudioStore((s) => s.template.fps);
  const setDurationInFrames = useStudioStore((s) => s.setDurationInFrames);

  const src = audioSrc ?? videoSrc;

  useEffect(() => {
    if (!src) return;

    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    audio.src = src;

    const onLoad = () => {
      const durationSec = audio.duration;
      if (isFinite(durationSec) && durationSec > 0) {
        setDurationInFrames(Math.ceil(durationSec * fps));
      }
    };

    audio.addEventListener("loadedmetadata", onLoad);
    return () => {
      audio.removeEventListener("loadedmetadata", onLoad);
      audio.src = "";
    };
  }, [src, fps, setDurationInFrames]);
}
