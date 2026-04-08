export type SubscribeVariant = "slide-up" | "bounce-in" | "pop" | "typewriter" | "click";
export type LikeVariant      = "pulse" | "heart-pop" | "bounce" | "click";
export type LyricsVariant    = "fade-slide" | "color-fill" | "typewriter" | "typewriter-fill" | "word-pop" | "glow-pulse" | "karaoke" | "glitch-scatter" | "fragment-shatter" | "pulse-smoke" | "dust-dissolve" | "hologram-scan" | "magnetic-distort" | "shockwave-burst" | "mirror-echo" | "ink-bleed" | "liquid-drip" | "light-stroke" | "cinematic-blur" | "bounce-letter";
export type ImageVariant     = "none" | "float" | "pulse" | "spin" | "bounce-in" | "slide-in-left" | "zoom-in";
export type TextVariant      = "fade" | "slide-up" | "slide-down" | "slide-left" | "slide-right" | "zoom-in" | "zoom-bounce" | "typewriter" | "word-pop" | "glitch" | "rotate-in" | "blur-in";

// Motion Background
export type MotionBgStyle =
  | "gradient-shift"    // liquid chromatic: spring-driven colour blobs
  | "particle-field"    // stellar drift: 3-depth-layer particles with spring pop-in
  | "aurora"            // plasma aurora: per-point spring oscillator ribbons
  | "noise-wave"        // chromatic ink drop: spring-expanding ink blobs
  | "geometric-pulse"   // orbiting shapes with trails, morph, spring entry
  | "lyrics-float"      // words float with 5 behaviour modes (drift/strafe/warp/burst)
  | "neon-grid"         // synthwave perspective grid with pulse wave
  | "cyber-rain"        // matrix-style digital rain with kanji/binary/music glyphs
  | "frequency-wave"    // simulated audio spectrum analyser with mirrored EQ bars
  | "pixabay-video";    // stock video from Pixabay search

export interface MotionBgConfig {
  style: MotionBgStyle;
  /** Primary palette — up to 4 hex colours */
  colors: [string, string, string?, string?];
  /** 0.1–3.0 — how fast the animation moves */
  speed: number;
  /** 0–1 — overall brightness/intensity */
  intensity: number;
  /** lyrics-float specific: pull from an existing lyrics overlay by id, or "all" */
  lyricsSourceId?: string | "all";
  /** lyrics-float specific: extra raw lyric text if user wants to type custom words */
  customLyricsText?: string;
  /** pixabay-video specific */
  pixabayVideoUrl?: string;
  pixabayVideoId?: number;
  pixabayThumbUrl?: string;
  videoFit?: "cover" | "contain" | "fill";
}

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
  | "image"
  | "video-clip"
  | "motion-background";

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
  fontSize?: number;        // per-segment override; falls back to overlay.font.size
  sectionLabel?: string;    // e.g. "Verse 1", "Chorus", "Bridge"
  color?: string;           // per-segment color override; falls back to overlay.color
  fontFamily?: string;      // per-segment font family override; falls back to overlay.font.family
  fontWeight?: number;      // per-segment font weight override; falls back to overlay.font.weight
  containerWidth?: number;  // canvas px width of the text box; falls back to overlay.containerWidth
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
  // For video-clip overlay
  videoClipSrc?: string;
  videoClipFit?: "none" | "contain" | "cover" | "fill";
  videoClipVolume?: number; // 0–1, default 0 (muted)
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
  // Default text box width in canvas px for lyrics overlays (all segments inherit unless overridden)
  containerWidth?: number;
  // Animation style variant — type-specific
  animationVariant?: SubscribeVariant | LikeVariant | LyricsVariant | ImageVariant | TextVariant;
  // Motion background config (motion-background overlay type)
  motionBg?: MotionBgConfig;
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
  inMarker: number | null;   // frame number for export in point
  outMarker: number | null;  // frame number for export out point
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
  /** Frame offset into audio/video to start playback from (for trim) */
  trimStartFrame?: number;
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
