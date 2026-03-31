"use client";

import { useEffect, useRef } from "react";
import { useStudioStore } from "@/store/studioStore";

const DEBOUNCE_MS = 2000;

/**
 * Auto-saves the current project state to S3 whenever isDirty becomes true.
 * Debounces by 2 seconds to avoid excessive writes.
 */
export function useAutoSave() {
  const projectId = useStudioStore((s) => s.projectId);
  const isDirty = useStudioStore((s) => s.isDirty);
  const markSaved = useStudioStore((s) => s.markSaved);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isDirty || !projectId) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      // Read current full state snapshot
      const state = useStudioStore.getState();
      try {
        await fetch(`/api/s3/projects/${projectId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: state.projectId,
            projectName: state.projectName,
            template: state.template,
            audioSrc: state.audioSrc,
            videoSrc: state.videoSrc,
            durationInFrames: state.durationInFrames,
            overlays: state.overlays,
            selectedOverlayId: null, // don't persist selection
            isDirty: false,
            lastSaved: null, // server fills this
            backgroundColor: state.backgroundColor,
            backgroundOpacity: state.backgroundOpacity,
          }),
        });
        markSaved();
      } catch (err) {
        console.warn("[auto-save] Failed to save to S3:", err);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isDirty, projectId, markSaved]);
}
