import { Audio } from "remotion";

interface Props {
  audioSrc: string | null;
  volume?: number;
  startFrom?: number;
}

export function AudioTrack({ audioSrc, volume = 1, startFrom = 0 }: Props) {
  if (!audioSrc) return null;
  return <Audio src={audioSrc} volume={volume} startFrom={startFrom} />;
}
