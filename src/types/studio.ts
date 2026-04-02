export type SubscribeVariant = "slide-up" | "bounce-in" | "pop" | "typewriter" | "click";
export type LikeVariant      = "pulse" | "heart-pop" | "bounce" | "click";
export type LyricsVariant    = "fade-slide" | "color-fill" | "typewriter" | "typewriter-fill" | "word-pop" | "glow-pulse";
export type ImageVariant     = "none" | "float" | "pulse" | "spin" | "bounce-in" | "slide-in-left" | "zoom-in";

export interface WordStyle {
  wordIndex: number;    // 0-based index into the word array of line.text
  bold?: boolean;
  italic?: boolean;
  color?: string;       // hex override for this word
  scale?: number;       // e.g. 1.3 = 30% bigger
}

export type OverlayType =
  | "yt-subscribe"
  | "yt-like"
  | "ig-follow"
  | "ig-like"
  | "ig-share"
  | "lyrics"
  | "lyrics-chords"
  | "waveform"
  | "text"
  | "image";

export type Platform = "youtube" | "instagram";

export type TemplateFormat =
  | "video"
  | "shorts"
  | "reels"
  | "stories"
  | "post-square"
  | "post-landscape"
  | "4k";

export interface Template {
  id: string;
  name: string;
  platform: Platform;
  format: TemplateFormat;
  width: number;
  height: number;
  fps: 30 | 60;
  description: string;
  aspectLabel: string; // e.g. "16:9"
}

export interface FontConfig {
  family: string;
  weight: number;
  size: number;
  letterSpacing: number;
  lineHeight: number;
  align: "left" | "center" | "right";
}

export interface TextShadowConfig {
  color: string;
  blur: number;
  x: number;
  y: number;
}

export interface TextStrokeConfig {
  color: string;
  width: number;
}

export interface LyricLine {
  text: string;
  startFrame: number;
  durationInFrames?: number;
  animationVariant?: LyricsVariant;
  wordStyles?: WordStyle[];
}

export interface ChordToken {
  chord: string; // e.g. "Am", "G", "C#m7"
  charOffset: number; // character position in the lyric text
}

export interface ChordLine {
  lyric: string;
  chords: ChordToken[];
  startFrame: number;
  durationInFrames?: number;
}

export interface OverlayConfig {
  id: string;
  type: OverlayType;
  label: string;
  visible: boolean;
  startFrame: number;
  durationInFrames: number;
  position: { x: number; y: number }; // 0-100 % of canvas
  opacity: number; // 0-1
  // Typography
  font?: FontConfig;
  color?: string;
  gradientColors?: [string, string];
  textShadow?: TextShadowConfig;
  textStroke?: TextStrokeConfig;
  // Overlay-specific
  lyrics?: LyricLine[];
  chords?: ChordLine[];
  // For text overlay
  text?: string;
  // For image overlay
  imageSrc?: string;
  imageFit?: "none" | "contain" | "cover" | "fill";
  // For waveform
  waveformColor?: string;
  waveformBars?: number;
  waveformStyle?: "bars" | "wave" | "circular" | "particles" | "oscilloscope";
  // For CTA overlays
  channelName?: string;
  subscriberCount?: string;
  // Instagram follow
  username?: string;
  // Instagram Share card
  shareTitle?: string;
  shareUsername?: string;
  shareImageSrc?: string;
  cardBgColor?: string;
  cardBorderColor?: string;
  accentColor?: string;
  // Component scale (1 = 100%, applies to CTA overlays)
  componentScale?: number;
  // Animation style variant — type-specific
  animationVariant?: SubscribeVariant | LikeVariant | LyricsVariant | ImageVariant;
}

export interface ProjectState {
  projectId: string;
  projectName: string;
  template: Template;
  audioSrc: string | null; // S3 HTTPS URL
  videoSrc: string | null; // S3 HTTPS URL
  videoFit: "cover" | "contain" | "fill"; // how the video fills the canvas
  durationInFrames: number;
  overlays: OverlayConfig[];
  selectedOverlayId: string | null;
  isDirty: boolean;
  lastSaved: string | null; // ISO timestamp
  backgroundColor: string;
  backgroundOpacity: number; // 0-1
}

export interface ProjectIndex {
  id: string;
  name: string;
  template: Template;
  updatedAt: string;
  thumbnailUrl?: string;
  audioFileName?: string;
}

export interface RenderJob {
  renderId: string;
  bucketName: string;
  status: "rendering" | "done" | "error";
  progress: number; // 0-1
  outputUrl?: string;
  error?: string;
}

// Remotion inputProps shape (passed to KBeatsComposition)
export interface KBeatsInputProps {
  audioSrc: string | null;
  videoSrc: string | null;
  videoFit: "cover" | "contain" | "fill";
  durationInFrames: number;
  fps: number;
  width: number;
  height: number;
  backgroundColor: string;
  backgroundOpacity: number;
  overlays: OverlayConfig[];
}

export const TEMPLATES: Template[] = [
  {
    id: "yt-1080p",
    name: "YouTube Video",
    platform: "youtube",
    format: "video",
    width: 1920,
    height: 1080,
    fps: 30,
    description: "Standard HD video for YouTube",
    aspectLabel: "16:9",
  },
  {
    id: "yt-4k",
    name: "YouTube 4K",
    platform: "youtube",
    format: "4k",
    width: 3840,
    height: 2160,
    fps: 30,
    description: "Ultra HD 4K video for YouTube",
    aspectLabel: "16:9",
  },
  {
    id: "yt-shorts",
    name: "YouTube Shorts",
    platform: "youtube",
    format: "shorts",
    width: 1080,
    height: 1920,
    fps: 60,
    description: "Vertical short-form content",
    aspectLabel: "9:16",
  },
  {
    id: "ig-square",
    name: "Instagram Post",
    platform: "instagram",
    format: "post-square",
    width: 1080,
    height: 1080,
    fps: 30,
    description: "Square post for Instagram feed",
    aspectLabel: "1:1",
  },
  {
    id: "ig-reels",
    name: "Instagram Reels",
    platform: "instagram",
    format: "reels",
    width: 1080,
    height: 1920,
    fps: 60,
    description: "Vertical Reels format",
    aspectLabel: "9:16",
  },
  {
    id: "ig-stories",
    name: "Instagram Stories",
    platform: "instagram",
    format: "stories",
    width: 1080,
    height: 1920,
    fps: 60,
    description: "Ephemeral Stories format",
    aspectLabel: "9:16",
  },
  {
    id: "ig-landscape",
    name: "Instagram Landscape",
    platform: "instagram",
    format: "post-landscape",
    width: 1080,
    height: 608,
    fps: 30,
    description: "Landscape post for Instagram feed",
    aspectLabel: "1.91:1",
  },
];
