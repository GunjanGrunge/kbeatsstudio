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
import type { ProjectState } from "@/types/studio";

interface Props {
  projectId: string;
  initialState?: ProjectState | null;
}

export function StudioShell({ projectId, initialState }: Props) {
  const playerRef = useRef<PlayerRef | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const loadProject = useStudioStore((s) => s.loadProject);
  const storeProjectId = useStudioStore((s) => s.projectId);

  // Load project from S3 data (or restore from localStorage if same project)
  useEffect(() => {
    if (initialState && initialState.projectId === projectId) {
      loadProject(initialState);
    }
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

      {/* 3-pane layout */}
      <div className="flex flex-1 overflow-hidden">
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
          <PreviewPanel playerRef={playerRef} />
        </main>

        {/* Right: controls */}
        <aside
          className="flex flex-col border-l shrink-0"
          style={{ width: 300, borderColor: "#1a1a1c", minHeight: 0 }}
        >
          <ControlsPanel />
        </aside>
      </div>

      {/* Export modal */}
      <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} />
    </div>
  );
}
