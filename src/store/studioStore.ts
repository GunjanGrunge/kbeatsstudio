"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { v4 as uuidv4 } from "uuid";
import type { ExportSettings, OverlayConfig, OverlayType, LyricLine, ProjectState, Template, TimelineRegion, TimelineRegionType } from "@/types/studio";
import { TEMPLATES } from "@/types/studio";

// ── Undo/Redo ──────────────────────────────────────────────────────────────
// Stored outside the persisted store so they survive HMR but aren't saved to
// localStorage. We snapshot only the overlay-related fields that users edit.
type HistorySnapshot = Pick<ProjectState, "overlays" | "backgroundColor" | "backgroundOpacity" | "durationInFrames" | "timelineRegions" | "exportSettings" | "videoVolume" | "bpm">;
const undoStack: HistorySnapshot[] = [];
const redoStack: HistorySnapshot[] = [];
const MAX_HISTORY = 50;
let overlayClipboard: OverlayConfig | null = null;

function takeSnapshot(state: ProjectState): HistorySnapshot {
  return JSON.parse(JSON.stringify({
    overlays: state.overlays,
    backgroundColor: state.backgroundColor,
    backgroundOpacity: state.backgroundOpacity,
    durationInFrames: state.durationInFrames,
    timelineRegions: state.timelineRegions,
    exportSettings: state.exportSettings,
    videoVolume: state.videoVolume,
    bpm: state.bpm,
  }));
}

interface StudioActions {
  // Project
  initProject: (projectId: string, template: Template) => void;
  loadProject: (state: ProjectState) => void;
  setProjectName: (name: string) => void;
  setAudioSrc: (src: string | null) => void;
  setVideoSrc: (src: string | null) => void;
  setDurationInFrames: (frames: number) => void;
  setBackgroundColor: (color: string) => void;
  setBackgroundOpacity: (opacity: number) => void;
  setVideoFit: (fit: "cover" | "contain" | "fill") => void;
  setVideoVolume: (volume: number) => void;
  setVideoCrop: (crop: { x: number; y: number; width: number; height: number } | null) => void;
  markSaved: () => void;

  // Undo / Redo
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  pushHistory: () => void;

  // Playhead (UI-only, not persisted)
  currentFrame: number;
  setCurrentFrame: (frame: number) => void;

  // Overlays
  addOverlay: (type: OverlayType) => void;
  updateOverlay: (id: string, patch: Partial<OverlayConfig>) => void;
  removeOverlay: (id: string) => void;
  reorderOverlays: (fromIndex: number, toIndex: number) => void;
  setOverlays: (overlays: OverlayConfig[]) => void;
  toggleOverlayVisibility: (id: string) => void;
  selectOverlay: (id: string | null) => void;
  duplicateOverlay: (id: string) => void;
  copyOverlay: (id: string) => void;
  cutOverlay: (id: string) => void;
  pasteOverlay: (startFrame?: number) => void;
  splitOverlayAtFrame: (id: string, frame: number) => void;
  snapOverlayToBeat: (id: string, fps: number) => void;

  // Lyric line UI selection (not persisted)
  selectedLyricLineIndex: number | null;
  setSelectedLyricLineIndex: (idx: number | null) => void;

  // Lyric line CRUD
  addLyricLine: (overlayId: string, line: LyricLine) => void;
  updateLyricLine: (overlayId: string, lineIndex: number, patch: Partial<LyricLine>) => void;
  removeLyricLine: (overlayId: string, lineIndex: number) => void;

  // BPM / beat sync
  setBpm: (bpm: number | null) => void;

  // Timeline markers
  setInMarker: (frame: number | null) => void;
  setOutMarker: (frame: number | null) => void;
  addTimelineRegion: (type: TimelineRegionType) => void;
  updateTimelineRegion: (id: string, patch: Partial<TimelineRegion>) => void;
  removeTimelineRegion: (id: string) => void;
  splitTimelineRegionAtFrame: (id: string, frame: number) => void;
  updateExportSettings: (patch: Partial<ExportSettings>) => void;
}

type StudioStore = ProjectState & StudioActions;

const DEFAULT_STATE: ProjectState = {
  projectId: "",
  projectName: "Untitled Project",
  template: TEMPLATES[0],
  audioSrc: null,
  videoSrc: null,
  videoFit: "cover",
  videoVolume: 0,
  videoCrop: null,
  durationInFrames: 900, // 30s at 30fps
  bpm: null,
  overlays: [],
  selectedOverlayId: null,
  isDirty: false,
  lastSaved: null,
  backgroundColor: "#050505",
  backgroundOpacity: 1,
  inMarker: null,
  outMarker: null,
  timelineRegions: [],
  exportSettings: {
    format: "mp4",
    quality: "high",
    gifFps: 15,
    gifLoop: true,
    scale: 1,
  },
};

const DEFAULT_OVERLAY_DURATION = 150; // 5s at 30fps

function createDefaultOverlay(type: OverlayType, fps: number, startFrame = 0): OverlayConfig {
  const base: Omit<OverlayConfig, "type"> = {
    id: uuidv4(),
    label: OVERLAY_LABELS[type],
    visible: true,
    startFrame,
    durationInFrames: DEFAULT_OVERLAY_DURATION,
    position: { x: 50, y: 50 },
    opacity: 1,
    font: {
      family: "Outfit",
      weight: 700,
      size: 48,
      letterSpacing: 0,
      lineHeight: 1.4,
      align: "center",
    },
    color: "#ffffff",
  };

  switch (type) {
    case "yt-subscribe":
      return {
        ...base,
        type,
        position: { x: 50, y: 85 },
        channelName: "KBeats",
        color: "#ffffff",
        animationVariant: "slide-up" as const,
      };
    case "yt-like":
      return {
        ...base,
        type,
        position: { x: 85, y: 85 },
        color: "#ffffff",
        animationVariant: "pulse" as const,
      };
    case "ig-follow":
      return {
        ...base,
        type,
        position: { x: 50, y: 85 },
        username: "@kbeats",
        color: "#ffffff",
      };
    case "lyrics":
      return {
        ...base,
        type,
        position: { x: 50, y: 70 },
        durationInFrames: fps * 30,
        lyrics: [
          { text: "Add your lyrics here...", startFrame },
        ],
        font: { ...base.font!, size: 56 },
        color: "#ffffff",
        animationVariant: "fade-slide" as const,
      };
    case "lyrics-chords":
      return {
        ...base,
        type,
        position: { x: 50, y: 65 },
        durationInFrames: fps * 30,
        chords: [
          {
            lyric: "Add your lyrics here...",
            chords: [{ chord: "Am", charOffset: 0 }],
            startFrame,
          },
        ],
        font: { ...base.font!, size: 48 },
        color: "#ffffff",
        animationVariant: "fade-slide" as const,
      };
    case "waveform":
      return {
        ...base,
        type,
        position: { x: 50, y: 90 },
        durationInFrames: DEFAULT_STATE.durationInFrames,
        waveformColor: "#ccff00",
        waveformBars: 64,
        opacity: 0.85,
      };
    case "text":
      return {
        ...base,
        type,
        text: "Your text here",
        position: { x: 50, y: 50 },
      };
    case "ig-like":
      return {
        ...base,
        type,
        position: { x: 50, y: 80 },
        color: "#ff306c",
      };
    case "ig-share":
      return {
        ...base,
        type,
        position: { x: 50, y: 78 },
        shareTitle: "Latest Beat Drop",
        shareUsername: "@kbeats",
        cardBgColor: "#0a0a0a",
        cardBorderColor: "rgba(255,255,255,0.08)",
        accentColor: "#ccff00",
      };
    case "image":
      return {
        ...base,
        type,
        position: { x: 50, y: 50 },
        animationVariant: "none" as const,
      };
    case "motion-background":
      return {
        ...base,
        type,
        position: { x: 50, y: 50 },
        startFrame: 0,
        durationInFrames: DEFAULT_STATE.durationInFrames,
        opacity: 0.7,
        motionBg: {
          style: "gradient-shift" as const,
          colors: ["#0d0d2b", "#1a0533", "#0a1a2e", "#050505"],
          speed: 1,
          intensity: 0.8,
          lyricsSourceId: "all",
        },
      };
    case "annotation":
      return {
        ...base,
        type,
        label: "Annotation",
        position: { x: 50, y: 45 },
        durationInFrames: fps * 4,
        color: "#ccff00",
        annotation: {
          kind: "arrow",
          width: 22,
          height: 10,
          rotation: 0,
          strokeWidth: 6,
          borderColor: "#ccff00",
          fillColor: "rgba(204,255,0,0.12)",
          textColor: "#050505",
          arrowDirection: "right",
          cornerRadius: 10,
          text: "New drop",
        },
      };
    default:
      return { ...base, type };
  }
}

const OVERLAY_LABELS: Record<OverlayType, string> = {
  "yt-subscribe": "YouTube Subscribe",
  "yt-like": "YouTube Like",
  "ig-follow": "Instagram Follow",
  "ig-like": "Instagram Like",
  "ig-share": "Instagram Share",
  lyrics: "Lyrics",
  "lyrics-chords": "Lyrics + Chords",
  waveform: "Waveform",
  text: "Text",
  image: "Image",
  "video-clip": "Video Clip",
  "motion-background": "Motion Background",
  annotation: "Annotation",
};

function createDefaultTimelineRegion(type: TimelineRegionType, startFrame: number, fps: number, totalFrames: number): TimelineRegion {
  const durationInFrames = Math.min(fps * 4, Math.max(1, totalFrames - startFrame));
  if (type === "speed") {
    return {
      id: uuidv4(),
      type,
      label: "Speed 1.5x",
      startFrame,
      durationInFrames,
      color: "#38bdf8",
      speed: 1.5,
    };
  }
  if (type === "crop") {
    return {
      id: uuidv4(),
      type,
      label: "Crop Focus",
      startFrame,
      durationInFrames,
      color: "#f59e0b",
      crop: { x: 10, y: 10, width: 80, height: 80 },
    };
  }
  return {
    id: uuidv4(),
    type,
    label: "Audio Bed",
    startFrame,
    durationInFrames,
    color: "#a78bfa",
    volume: 0.6,
  };
}

export const useStudioStore = create<StudioStore>()(
  persist(
    immer((set, get) => ({
      ...DEFAULT_STATE,

      // UI-only playhead state (not persisted)
      currentFrame: 0,
      setCurrentFrame: (frame: number) =>
        set((state) => {
          (state as unknown as { currentFrame: number }).currentFrame = frame;
        }),

      // UI-only lyric line selection (not persisted)
      selectedLyricLineIndex: null,
      setSelectedLyricLineIndex: (idx) =>
        set((state) => {
          (state as unknown as { selectedLyricLineIndex: number | null }).selectedLyricLineIndex = idx;
        }),

      initProject: (projectId, template) =>
        set((state) => {
          Object.assign(state, {
            ...DEFAULT_STATE,
            projectId,
            template,
            durationInFrames: template.fps * 30, // default 30s
            backgroundColor: "#050505",
          });
        }),

      loadProject: (projectState) =>
        set((state) => {
          Object.assign(state, {
            ...projectState,
            timelineRegions: projectState.timelineRegions ?? [],
            exportSettings: {
              ...DEFAULT_STATE.exportSettings,
              ...(projectState.exportSettings ?? {}),
            },
            videoVolume: projectState.videoVolume ?? DEFAULT_STATE.videoVolume,
          });
        }),

      setProjectName: (name) =>
        set((state) => {
          state.projectName = name;
          state.isDirty = true;
        }),

      setAudioSrc: (src) =>
        set((state) => {
          state.audioSrc = src;
          state.isDirty = true;
        }),

      setVideoSrc: (src) =>
        set((state) => {
          state.videoSrc = src;
          state.isDirty = true;
        }),

      setVideoFit: (fit) =>
        set((state) => {
          state.videoFit = fit;
          state.isDirty = true;
        }),

      setVideoVolume: (volume) =>
        set((state) => {
          state.videoVolume = Math.max(0, Math.min(1, volume));
          state.isDirty = true;
        }),

      setVideoCrop: (crop) =>
        set((state) => {
          state.videoCrop = crop;
          state.isDirty = true;
        }),

      setDurationInFrames: (frames) =>
        set((state) => {
          state.durationInFrames = frames;
          state.isDirty = true;
        }),

      setBackgroundColor: (color) =>
        set((state) => {
          state.backgroundColor = color;
          state.isDirty = true;
        }),

      setBackgroundOpacity: (opacity) =>
        set((state) => {
          state.backgroundOpacity = opacity;
          state.isDirty = true;
        }),

      markSaved: () =>
        set((state) => {
          state.isDirty = false;
          state.lastSaved = new Date().toISOString();
        }),

      // ── Undo / Redo ──────────────────────────────────────────────────────
      canUndo: false,
      canRedo: false,

      pushHistory: () => {
        const snap = takeSnapshot(get());
        undoStack.push(snap);
        if (undoStack.length > MAX_HISTORY) undoStack.shift();
        redoStack.length = 0; // clear redo on new action
        set((state) => {
          (state as unknown as { canUndo: boolean; canRedo: boolean }).canUndo = undoStack.length > 0;
          (state as unknown as { canUndo: boolean; canRedo: boolean }).canRedo = redoStack.length > 0;
        });
      },

      undo: () =>
        set((state) => {
          if (undoStack.length === 0) return;
          redoStack.push(takeSnapshot(state as unknown as ProjectState));
          const prev = undoStack.pop()!;
          state.overlays = prev.overlays;
          state.backgroundColor = prev.backgroundColor;
          state.backgroundOpacity = prev.backgroundOpacity;
          state.durationInFrames = prev.durationInFrames;
          state.timelineRegions = prev.timelineRegions;
          state.exportSettings = prev.exportSettings;
          state.videoVolume = prev.videoVolume;
          state.bpm = prev.bpm;
          state.isDirty = true;
          (state as unknown as { canUndo: boolean; canRedo: boolean }).canUndo = undoStack.length > 0;
          (state as unknown as { canUndo: boolean; canRedo: boolean }).canRedo = redoStack.length > 0;
        }),

      redo: () =>
        set((state) => {
          if (redoStack.length === 0) return;
          undoStack.push(takeSnapshot(state as unknown as ProjectState));
          const next = redoStack.pop()!;
          state.overlays = next.overlays;
          state.backgroundColor = next.backgroundColor;
          state.backgroundOpacity = next.backgroundOpacity;
          state.durationInFrames = next.durationInFrames;
          state.timelineRegions = next.timelineRegions;
          state.exportSettings = next.exportSettings;
          state.videoVolume = next.videoVolume;
          state.bpm = next.bpm;
          state.isDirty = true;
          (state as unknown as { canUndo: boolean; canRedo: boolean }).canUndo = undoStack.length > 0;
          (state as unknown as { canUndo: boolean; canRedo: boolean }).canRedo = redoStack.length > 0;
        }),

      addOverlay: (type) => {
        get().pushHistory();
        set((state) => {
          const overlay = createDefaultOverlay(type, state.template.fps, (state as unknown as { currentFrame: number }).currentFrame);
          state.overlays.push(overlay);
          state.selectedOverlayId = overlay.id;
          state.isDirty = true;
        });
      },

      updateOverlay: (id, patch) => {
        set((state) => {
          const idx = state.overlays.findIndex((o) => o.id === id);
          if (idx !== -1) {
            Object.assign(state.overlays[idx], patch);
            state.isDirty = true;
          }
        });
      },

      removeOverlay: (id) => {
        get().pushHistory();
        set((state) => {
          state.overlays = state.overlays.filter((o) => o.id !== id);
          if (state.selectedOverlayId === id) {
            state.selectedOverlayId = null;
          }
          state.isDirty = true;
        });
      },

      reorderOverlays: (fromIndex, toIndex) => {
        get().pushHistory();
        set((state) => {
          const [moved] = state.overlays.splice(fromIndex, 1);
          state.overlays.splice(toIndex, 0, moved);
          state.isDirty = true;
        });
      },

      setOverlays: (overlays) => {
        set((state) => {
          state.overlays = overlays;
          state.isDirty = true;
        });
      },

      addLyricLine: (overlayId, line) => {
        get().pushHistory();
        set((state) => {
          const overlay = state.overlays.find((o) => o.id === overlayId);
          if (!overlay || !overlay.lyrics) return;
          overlay.lyrics.push(line);
          state.isDirty = true;
        });
      },

      updateLyricLine: (overlayId, lineIndex, patch) => {
        set((state) => {
          const overlay = state.overlays.find((o) => o.id === overlayId);
          if (!overlay || !overlay.lyrics || !overlay.lyrics[lineIndex]) return;
          Object.assign(overlay.lyrics[lineIndex], patch);
          // Auto-expand overlay duration if a segment now extends beyond it
          const line = overlay.lyrics[lineIndex];
          const segEnd = line.startFrame + (line.durationInFrames ?? 90);
          if (segEnd > overlay.durationInFrames) {
            overlay.durationInFrames = segEnd;
          }
          state.isDirty = true;
        });
      },

      removeLyricLine: (overlayId, lineIndex) => {
        get().pushHistory();
        set((state) => {
          const overlay = state.overlays.find((o) => o.id === overlayId);
          if (!overlay || !overlay.lyrics) return;
          overlay.lyrics.splice(lineIndex, 1);
          state.isDirty = true;
        });
      },

      toggleOverlayVisibility: (id) => {
        set((state) => {
          const overlay = state.overlays.find((o) => o.id === id);
          if (overlay) {
            overlay.visible = !overlay.visible;
            state.isDirty = true;
          }
        });
      },

      selectOverlay: (id) =>
        set((state) => {
          state.selectedOverlayId = id;
          // Reset lyric line selection when switching overlays
          (state as unknown as { selectedLyricLineIndex: number | null }).selectedLyricLineIndex = null;
        }),

      duplicateOverlay: (id) => {
        get().pushHistory();
        set((state) => {
          const original = state.overlays.find((o) => o.id === id);
          if (!original) return;
          const clone = {
            ...JSON.parse(JSON.stringify(original)),
            id: uuidv4(),
            label: original.label + " (copy)",
          };
          const idx = state.overlays.findIndex((o) => o.id === id);
          state.overlays.splice(idx + 1, 0, clone);
          state.selectedOverlayId = clone.id;
          state.isDirty = true;
        });
      },

      copyOverlay: (id) => {
        const original = get().overlays.find((o) => o.id === id);
        overlayClipboard = original ? JSON.parse(JSON.stringify(original)) : null;
      },

      cutOverlay: (id) => {
        const original = get().overlays.find((o) => o.id === id);
        overlayClipboard = original ? JSON.parse(JSON.stringify(original)) : null;
        get().pushHistory();
        set((state) => {
          state.overlays = state.overlays.filter((o) => o.id !== id);
          if (state.selectedOverlayId === id) state.selectedOverlayId = null;
          state.isDirty = true;
        });
      },

      pasteOverlay: (startFrame) => {
        if (!overlayClipboard) return;
        const copiedOverlay = overlayClipboard;
        get().pushHistory();
        set((state) => {
          const clone = {
            ...JSON.parse(JSON.stringify(copiedOverlay)),
            id: uuidv4(),
            label: `${copiedOverlay.label} (copy)`,
            startFrame: Math.max(0, Math.min(startFrame ?? copiedOverlay.startFrame + state.template.fps, state.durationInFrames - 1)),
          };
          state.overlays.push(clone);
          state.selectedOverlayId = clone.id;
          state.isDirty = true;
        });
      },

      splitOverlayAtFrame: (id, frame) => {
        get().pushHistory();
        set((state) => {
          const idx = state.overlays.findIndex((o) => o.id === id);
          if (idx === -1) return;
          const overlay = state.overlays[idx];
          const start = overlay.startFrame;
          const end = overlay.startFrame + overlay.durationInFrames;
          if (frame <= start || frame >= end) return;
          const second = {
            ...JSON.parse(JSON.stringify(overlay)),
            id: uuidv4(),
            label: `${overlay.label} split`,
            startFrame: frame,
            durationInFrames: end - frame,
          };
          overlay.durationInFrames = frame - start;
          state.overlays.splice(idx + 1, 0, second);
          state.selectedOverlayId = second.id;
          state.isDirty = true;
        });
      },

      setInMarker: (frame) =>
        set((state) => {
          state.inMarker = frame;
        }),

      setOutMarker: (frame) =>
        set((state) => {
          state.outMarker = frame;
        }),

      addTimelineRegion: (type) => {
        get().pushHistory();
        set((state) => {
          const currentFrame = (state as unknown as { currentFrame: number }).currentFrame;
          const region = createDefaultTimelineRegion(type, currentFrame, state.template.fps, state.durationInFrames);
          state.timelineRegions.push(region);
          state.isDirty = true;
        });
      },

      updateTimelineRegion: (id, patch) => {
        set((state) => {
          const region = state.timelineRegions.find((r) => r.id === id);
          if (!region) return;
          Object.assign(region, patch);
          state.isDirty = true;
        });
      },

      removeTimelineRegion: (id) => {
        get().pushHistory();
        set((state) => {
          state.timelineRegions = state.timelineRegions.filter((r) => r.id !== id);
          state.isDirty = true;
        });
      },

      splitTimelineRegionAtFrame: (id, frame) => {
        get().pushHistory();
        set((state) => {
          const idx = state.timelineRegions.findIndex((r) => r.id === id);
          if (idx === -1) return;
          const region = state.timelineRegions[idx];
          const start = region.startFrame;
          const end = region.startFrame + region.durationInFrames;
          if (frame <= start || frame >= end) return;
          const second = {
            ...JSON.parse(JSON.stringify(region)),
            id: uuidv4(),
            label: `${region.label} split`,
            startFrame: frame,
            durationInFrames: end - frame,
          };
          region.durationInFrames = frame - start;
          state.timelineRegions.splice(idx + 1, 0, second);
          state.isDirty = true;
        });
      },

      updateExportSettings: (patch) =>
        set((state) => {
          state.exportSettings = { ...state.exportSettings, ...patch };
          state.isDirty = true;
        }),

      setBpm: (bpm) =>
        set((state) => {
          state.bpm = bpm;
          state.isDirty = true;
        }),

      snapOverlayToBeat: (id, fps) => {
        const state = get();
        const overlay = state.overlays.find((o) => o.id === id);
        if (!overlay) return;
        // Use BPM if set, otherwise snap to nearest second boundary
        const framesPerBeat = state.bpm ? (fps * 60) / state.bpm : fps;
        const snappedStart = Math.round(overlay.startFrame / framesPerBeat) * framesPerBeat;
        const snappedDur = Math.max(framesPerBeat, Math.round(overlay.durationInFrames / framesPerBeat) * framesPerBeat);
        get().pushHistory();
        set((st) => {
          const ov = st.overlays.find((o) => o.id === id);
          if (!ov) return;
          ov.startFrame = Math.max(0, Math.min(snappedStart, st.durationInFrames - 1));
          ov.durationInFrames = Math.min(snappedDur, st.durationInFrames - ov.startFrame);
          st.isDirty = true;
        });
      },
    })),
    {
      name: "kbeats-studio-project",
      storage: createJSONStorage(() => localStorage),
      // Only persist the current project state, not UI state like selectedOverlayId
      partialize: (state) => ({
        projectId: state.projectId,
        projectName: state.projectName,
        template: state.template,
        audioSrc: state.audioSrc,
        videoSrc: state.videoSrc,
        videoFit: state.videoFit,
        videoVolume: state.videoVolume,
        videoCrop: state.videoCrop,
        durationInFrames: state.durationInFrames,
        overlays: state.overlays,
        backgroundColor: state.backgroundColor,
        backgroundOpacity: state.backgroundOpacity,
        lastSaved: state.lastSaved,
        inMarker: state.inMarker,
        outMarker: state.outMarker,
        timelineRegions: state.timelineRegions,
        exportSettings: state.exportSettings,
        bpm: state.bpm,
      }),
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<ProjectState>),
        timelineRegions: (persisted as Partial<ProjectState>)?.timelineRegions ?? [],
        videoVolume: (persisted as Partial<ProjectState>)?.videoVolume ?? DEFAULT_STATE.videoVolume,
        videoCrop: (persisted as Partial<ProjectState>)?.videoCrop ?? DEFAULT_STATE.videoCrop,
        bpm: (persisted as Partial<ProjectState>)?.bpm ?? DEFAULT_STATE.bpm,
        exportSettings: {
          ...DEFAULT_STATE.exportSettings,
          ...((persisted as Partial<ProjectState>)?.exportSettings ?? {}),
        },
      }),
    }
  )
);
