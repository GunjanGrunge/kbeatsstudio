import type { ChordLine, ChordToken } from "@/types/studio";

const CHORD_REGEX = /\[([A-G][#b]?(?:m|maj|min|dim|aug|sus2|sus4|add9|7|9|11|13|maj7|min7|dim7|aug7|6|5)?(?:\/[A-G][#b]?)?)\]/g;

/**
 * Parse a line of text with inline chord notation like "[Am]Hello [G]world"
 * Returns the lyric text (chords removed) and an array of chord tokens with character offsets.
 */
export function parseChordsFromLine(input: string): { lyric: string; chords: ChordToken[] } {
  const chords: ChordToken[] = [];
  let lyric = "";
  let lastIndex = 0;
  let charOffset = 0;

  for (const match of input.matchAll(CHORD_REGEX)) {
    const beforeChord = input.slice(lastIndex, match.index);
    lyric += beforeChord;
    charOffset += beforeChord.length;

    chords.push({
      chord: match[1],
      charOffset,
    });

    lastIndex = (match.index ?? 0) + match[0].length;
  }

  lyric += input.slice(lastIndex);
  return { lyric, chords };
}

/**
 * Parse a multi-line lyrics+chords text block.
 * Each line is treated as a separate chord line.
 * Blank lines are skipped.
 */
export function parseFullLyrics(
  text: string,
  startFrame: number,
  framesPerLine: number
): ChordLine[] {
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  return lines.map((line, i) => {
    const { lyric, chords } = parseChordsFromLine(line);
    return {
      lyric,
      chords,
      startFrame: startFrame + i * framesPerLine,
      durationInFrames: framesPerLine,
    };
  });
}

/**
 * Strip all chord brackets from text, returning plain lyrics.
 */
export function stripChords(text: string): string {
  return text.replace(CHORD_REGEX, "").trim();
}
