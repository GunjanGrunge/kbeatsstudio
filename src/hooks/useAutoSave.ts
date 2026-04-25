"use client";

import { useEffect } from "react";
import { useStudioStore } from "@/store/studioStore";

function buildPayload(state: ReturnType<typeof useStudioStore.getState>) {
  return JSON.stringify({
    projectId: state.projectId,
    projectName: state.projectName,
    template: state.template,
    audioSrc: state.audioSrc,
    videoSrc: state.videoSrc,
    videoFit: state.videoFit,
    videoVolume: state.videoVolume,
    durationInFrames: state.durationInFrames,
    overlays: state.overlays,
    selectedOverlayId: null,
    isDirty: false,
    lastSaved: null,
    backgroundColor: state.backgroundColor,
    backgroundOpacity: state.backgroundOpacity,
    inMarker: state.inMarker,
    outMarker: state.outMarker,
    timelineRegions: state.timelineRegions,
    exportSettings: state.exportSettings,
  });
}

/**
 * Registers a beforeunload beacon so unsaved changes are flushed if the user
 * closes the tab without clicking Save. Auto-save on every keystroke is
 * intentionally removed — the user saves explicitly via the Save button.
 */
export function useAutoSave() {
  useEffect(() => {
    const flush = () => {
      const state = useStudioStore.getState();
      if (!state.isDirty || !state.projectId) return;
      navigator.sendBeacon(
        `/api/s3/projects/${state.projectId}`,
        new Blob([buildPayload(state)], { type: "application/json" })
      );
    };
    window.addEventListener("beforeunload", flush);
    return () => window.removeEventListener("beforeunload", flush);
  }, []);
}

/**
 * Manually save to S3. Call this from the Save button.
 */
export async function saveProject(): Promise<void> {
  const state = useStudioStore.getState();
  if (!state.projectId) return;
  await fetch(`/api/s3/projects/${state.projectId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: buildPayload(state),
  });
  state.markSaved();
}
