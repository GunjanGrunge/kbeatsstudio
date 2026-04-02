import { Video, AbsoluteFill } from "remotion";

interface Props {
  videoSrc: string | null;
  videoFit?: "cover" | "contain" | "fill";
  opacity?: number;
  backgroundColor?: string;
  backgroundOpacity?: number;
}

export function VideoBackground({ videoSrc, videoFit = "cover", opacity = 1, backgroundColor = "#050505", backgroundOpacity = 1 }: Props) {
  return (
    <AbsoluteFill>
      {/* Solid background color */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor,
          opacity: backgroundOpacity,
        }}
      />
      {/* Optional video layer */}
      {videoSrc && (
        <Video
          src={videoSrc}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: videoFit,
            opacity,
          }}
        />
      )}
    </AbsoluteFill>
  );
}
