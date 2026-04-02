/**
 * Module-level ref shared between StudioShell (writer) and
 * TimelinePanel / LyricsEditor (readers). Lives outside any component
 * to avoid circular imports and React re-render cycles.
 */
export const sharedFrameRef = { current: 0 };
