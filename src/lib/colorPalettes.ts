export interface ColorPalette {
  id: string;
  name: string;
  colors: string[];
}

export const COLOR_PALETTES: ColorPalette[] = [
  {
    id: "kbeats",
    name: "KBeats Brand",
    colors: ["#ccff00", "#050505", "#1a1a1c", "#ffffff", "#888888", "#b3e600"],
  },
  {
    id: "neon",
    name: "Neon",
    colors: ["#ff006e", "#fb5607", "#ffbe0b", "#8338ec", "#3a86ff", "#06ffa5"],
  },
  {
    id: "pastel",
    name: "Pastel",
    colors: ["#ffd6ff", "#e7c6ff", "#c8b6ff", "#b8c0ff", "#bbd0ff", "#dde5b6"],
  },
  {
    id: "dark",
    name: "Dark Mode",
    colors: ["#0d0d0d", "#1a1a2e", "#16213e", "#0f3460", "#533483", "#e94560"],
  },
  {
    id: "warm",
    name: "Warm Sunset",
    colors: ["#ff4d00", "#ff7700", "#ffac00", "#ffca3a", "#ffd60a", "#fff3b0"],
  },
  {
    id: "cool",
    name: "Cool Ocean",
    colors: ["#03045e", "#0077b6", "#00b4d8", "#90e0ef", "#caf0f8", "#023e8a"],
  },
  {
    id: "monochrome",
    name: "Monochrome",
    colors: ["#000000", "#1a1a1a", "#333333", "#666666", "#999999", "#ffffff"],
  },
  {
    id: "retro",
    name: "Retro",
    colors: ["#ff6b6b", "#feca57", "#48dbfb", "#ff9ff3", "#54a0ff", "#5f27cd"],
  },
  {
    id: "earth",
    name: "Earth Tones",
    colors: ["#582f0e", "#7f4f24", "#936639", "#a68a64", "#b6ad90", "#c2c5aa"],
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk",
    colors: ["#00ff9f", "#00b8ff", "#001eff", "#bd00ff", "#ff0099", "#ffff00"],
  },
  {
    id: "tailwind-slate",
    name: "Tailwind Slate",
    colors: ["#0f172a", "#1e293b", "#334155", "#64748b", "#94a3b8", "#e2e8f0"],
  },
  {
    id: "tailwind-violet",
    name: "Tailwind Violet",
    colors: ["#2e1065", "#4c1d95", "#6d28d9", "#7c3aed", "#a78bfa", "#ddd6fe"],
  },
  {
    id: "music-gold",
    name: "Music Gold",
    colors: ["#3d0000", "#7a0000", "#d4af37", "#ffd700", "#ffe55c", "#ffffff"],
  },
  {
    id: "spotify-green",
    name: "Spotify Green",
    colors: ["#000000", "#121212", "#282828", "#1db954", "#1ed760", "#ffffff"],
  },
];

/** Tailwind 500-weight colors for quick picks */
export const TAILWIND_SWATCHES = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16",
  "#22c55e", "#10b981", "#14b8a6", "#06b6d4", "#3b82f6",
  "#6366f1", "#8b5cf6", "#a855f7", "#ec4899", "#f43f5e",
  "#ffffff", "#ccff00", "#000000", "#1a1a1c", "#888888",
];
