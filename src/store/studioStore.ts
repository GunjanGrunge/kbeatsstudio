"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { v4 as uuidv4 } from "uuid";
import type { OverlayConfig, OverlayType, ProjectState, Template } from "@/types/studio";
import { TEMPLATES } from "@/types/studio";

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
  markSaved: () => void;

  // Playhead (UI-only, not persisted)
  currentFrame: number;
  setCurrentFrame: (frame: number) => void;

  // Overlays
  addOverlay: (type: OverlayType) => void;
  updateOverlay: (id: string, patch: Partial<OverlayConfig>) => void;
  removeOverlay: (id: string) => void;
  reorderOverlays: (fromIndex: number, toIndex: number) => void;
  toggleOverlayVisibility: (id: string) => void;
  selectOverlay: (id: string | null) => void;
  duplicateOverlay: (id: string) => void;
}

type StudioStore = ProjectState & StudioActions;

const DEFAULT_STATE: ProjectState = {
  projectId: "",
  projectName: "Untitled Project",
  template: TEMPLATES[0],
  audioSrc: null,
  videoSrc: null,
  durationInFrames: 900, // 30s at 30fps
  overlays: [],
  selectedOverlayId: null,
  isDirty: false,
  lastSaved: null,
  backgroundColor: "#050505",
  backgroundOpacity: 1,
};

const DEFAULT_OVERLAY_DURATION = 150; // 5s at 30fps

function createDefaultOverlay(type: OverlayType, fps: number): OverlayConfig {
  const base: Omit<OverlayConfig, "type"> = {
    id: uuidv4(),
    label: OVERLAY_LABELS[type],
    visible: true,
    startFrame: 0,
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
          { text: "Add your lyrics here...", startFrame: 0 },
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
            startFrame: 0,
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
    case "image":
      return {
        ...base,
        type,
        position: { x: 50, y: 50 },
        animationVariant: "none" as const,
      };
    default:
      return { ...base, type };
  }
}

const OVERLAY_LABELS: Record<OverlayType, string> = {
  "yt-subscribe": "YouTube Subscribe",
  "yt-like": "YouTube Like",
  "ig-follow": "Instagram Follow",
  lyrics: "Lyrics",
  "lyrics-chords": "Lyrics + Chords",
  waveform: "Waveform",
  text: "Text",
  image: "Image",
};

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
          Object.assign(state, projectState);
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

      addOverlay: (type) =>
        set((state) => {
          const overlay = createDefaultOverlay(type, state.template.fps);
          state.overlays.push(overlay);
          state.selectedOverlayId = overlay.id;
          state.isDirty = true;
        }),

      updateOverlay: (id, patch) =>
        set((state) => {
          const idx = state.overlays.findIndex((o) => o.id === id);
          if (idx !== -1) {
            Object.assign(state.overlays[idx], patch);
            state.isDirty = true;
          }
        }),

      removeOverlay: (id) =>
        set((state) => {
          state.overlays = state.overlays.filter((o) => o.id !== id);
          if (state.selectedOverlayId === id) {
            state.selectedOverlayId = null;
          }
          state.isDirty = true;
        }),

      reorderOverlays: (fromIndex, toIndex) =>
        set((state) => {
          const [moved] = state.overlays.splice(fromIndex, 1);
          state.overlays.splice(toIndex, 0, moved);
          state.isDirty = true;
        }),

      toggleOverlayVisibility: (id) =>
        set((state) => {
          const overlay = state.overlays.find((o) => o.id === id);
          if (overlay) {
            overlay.visible = !overlay.visible;
            state.isDirty = true;
          }
        }),

      selectOverlay: (id) =>
        set((state) => {
          state.selectedOverlayId = id;
        }),

      duplicateOverlay: (id) =>
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
        }),
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
        durationInFrames: state.durationInFrames,
        overlays: state.overlays,
        backgroundColor: state.backgroundColor,
        backgroundOpacity: state.backgroundOpacity,
        lastSaved: state.lastSaved,
      }),
    }
  )
);
