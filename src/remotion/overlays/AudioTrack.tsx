import { Audio, staticFile } from "remotion";

interface Props {
  audioSrc: string | null;
  volume?: number;
}

export function AudioTrack({ audioSrc, volume = 1 }: Props) {
  if (!audioSrc) return null;
  return <Audio src={audioSrc} volume={volume} />;
}
