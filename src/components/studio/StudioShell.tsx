"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { type PlayerRef } from "@remotion/player";
import { useStudioStore } from "@/store/studioStore";
import { useAutoSave } from "@/hooks/useAutoSave";
import { ProjectHeader } from "./ProjectHeader";
import { OverlayList } from "./OverlayList";
import { UploadZone } from "./UploadZone";
import { PreviewPanel } from "./PreviewPanel";
import { ControlsPanel } from "./ControlsPanel";
import { ExportModal } from "./ExportModal";
import { TimelinePanel } from "./TimelinePanel";
import type { ProjectState } from "@/types/studio";

export { sharedFrameRef } from "@/lib/sharedRefs";
import { sharedFrameRef } from "@/lib/sharedRefs";

interface Props {
  projectId: string;
  initialState?: ProjectState | null;
}

export function StudioShell({ projectId, initialState }: Props) {
  const playerRef = useRef<PlayerRef | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const loadProject = useStudioStore((s) => s.loadProject);
  const setCurrentFrameStore = useStudioStore((s) => s.setCurrentFrame);

  // Cleanup fn ref — holds the removal logic for whichever player is currently mounted
  const cleanupRef = useRef<(() => void) | null>(null);

  // Attach player events via callback ref — fires when Player actually mounts, not before
  const setPlayerRef = useCallback((player: PlayerRef | null) => {
    // Clean up previous listeners
    cleanupRef.current?.();
    cleanupRef.current = null;

    playerRef.current = player;
    if (!player) return;

    const onFrame = (e: CustomEvent<{ frame: number }>) => {
      sharedFrameRef.current = e.detail.frame;
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => {
      setIsPlaying(false);
      setCurrentFrameStore(sharedFrameRef.current);
    };

    // @ts-expect-error remotion player emits custom events not in its TS types
    player.addEventListener("frameupdate", onFrame);
    player.addEventListener("play", onPlay);
    player.addEventListener("pause", onPause);

    cleanupRef.current = () => {
      // @ts-expect-error remotion player emits custom events not in its TS types
      player.removeEventListener("frameupdate", onFrame);
      player.removeEventListener("play", onPlay);
      player.removeEventListener("pause", onPause);
    };
  }, [setCurrentFrameStore]);

  // Load project from S3, but only if S3 data is newer than what's already
  // in the store (localStorage hydration). This prevents a stale S3 snapshot
  // from overwriting unsaved local changes that haven't been flushed yet.
  useEffect(() => {
    if (!initialState || initialState.projectId !== projectId) return;
    const currentStore = useStudioStore.getState();
    // If same project and local store is ahead of S3, keep local state
    if (currentStore.projectId === projectId) {
      const storeLastSaved = currentStore.lastSaved;
      const s3LastSaved = initialState.lastSaved;
      if (currentStore.isDirty) return; // unsaved local changes — don't overwrite
      if (storeLastSaved && s3LastSaved && storeLastSaved > s3LastSaved) return;
    }
    loadProject(initialState);
  }, [projectId, initialState, loadProject]);

  // Auto-save hook
  useAutoSave();

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Space: play/pause
    if (e.code === "Space" && e.target === document.body) {
      e.preventDefault();
      playerRef.current?.toggle?.();
    }
    // Esc: deselect overlay
    if (e.code === "Escape") {
      useStudioStore.getState().selectOverlay(null);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="flex flex-col h-screen bg-[#050505] overflow-hidden">
      {/* Top bar */}
      <ProjectHeader onExport={() => setExportOpen(true)} />

      {/* Main area: 3-pane + bottom timeline */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* 3-pane row */}
        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Left sidebar: media + overlay list */}
          <aside
            className="flex flex-col border-r shrink-0"
            style={{ width: 240, borderColor: "#1a1a1c", background: "#0d0d0d", minHeight: 0 }}
          >
            <UploadZone />
            <OverlayList />
          </aside>

          {/* Center: preview */}
          <main className="flex-1 min-w-0 overflow-hidden">
            <PreviewPanel playerRef={setPlayerRef} />
          </main>

          {/* Right: controls */}
          <aside
            className="flex flex-col border-l shrink-0"
            style={{ width: 300, borderColor: "#1a1a1c", minHeight: 0 }}
          >
            <ControlsPanel />
          </aside>
        </div>

        {/* Bottom timeline */}
        <TimelinePanel playerRef={playerRef} isPlaying={isPlaying} />
      </div>

      {/* Export modal */}
      <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} />
    </div>
  );
}
