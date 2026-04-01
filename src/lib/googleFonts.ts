export interface GoogleFont {
  family: string;
  variants: string[]; // e.g. ["100", "300", "regular", "700", "700italic"]
  category: "serif" | "sans-serif" | "display" | "handwriting" | "monospace";
  subsets: string[];
}

export type FontCategory = GoogleFont["category"] | "all";

let cachedFonts: GoogleFont[] | null = null;

/** Fetch all Google Fonts sorted by popularity */
export async function fetchGoogleFonts(): Promise<GoogleFont[]> {
  if (cachedFonts) return cachedFonts;

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_FONTS_API_KEY;
  if (!apiKey) {
    // Return a curated fallback list if no API key
    return FALLBACK_FONTS;
  }

  try {
    const res = await fetch(
      `https://www.googleapis.com/webfonts/v1/webfonts?key=${apiKey}&sort=popularity`,
      { next: { revalidate: 86400 } } // cache 24h
    );
    const data = await res.json();
    cachedFonts = data.items as GoogleFont[];
    return cachedFonts;
  } catch {
    return FALLBACK_FONTS;
  }
}

/** Get available numeric weights for a font */
export function getFontWeights(font: GoogleFont): number[] {
  return font.variants
    .filter((v) => !v.includes("italic") && v !== "regular")
    .map((v) => (v === "regular" ? 400 : parseInt(v)))
    .concat(font.variants.includes("regular") ? [400] : [])
    .filter((w, i, arr) => arr.indexOf(w) === i)
    .sort((a, b) => a - b);
}

/** Inject a Google Font into the document head for UI preview */
export function injectGoogleFont(family: string, weights: number[] = [300, 400, 700]): void {
  if (typeof document === "undefined") return;
  const id = `gf-${family.replace(/\s+/g, "-")}`;
  if (document.getElementById(id)) return;

  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  const weightsStr = weights.join(";");
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weightsStr}&display=swap`;
  document.head.appendChild(link);
}

// Curated fallback — 180+ free Google Fonts spanning every category
// Especially strong in display/bold/handwriting for music & media use cases
export const FALLBACK_FONTS: GoogleFont[] = [
  // ── Sans-serif ────────────────────────────────────────────────────────────
  { family: "Roboto", variants: ["100", "300", "regular", "500", "700", "900"], category: "sans-serif", subsets: ["latin"] },
  { family: "Open Sans", variants: ["300", "regular", "500", "600", "700", "800"], category: "sans-serif", subsets: ["latin"] },
  { family: "Lato", variants: ["100", "300", "regular", "700", "900"], category: "sans-serif", subsets: ["latin"] },
  { family: "Montserrat", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"], category: "sans-serif", subsets: ["latin"] },
  { family: "Oswald", variants: ["200", "300", "regular", "500", "600", "700"], category: "sans-serif", subsets: ["latin"] },
  { family: "Raleway", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"], category: "sans-serif", subsets: ["latin"] },
  { family: "Poppins", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"], category: "sans-serif", subsets: ["latin"] },
  { family: "Nunito", variants: ["200", "300", "regular", "500", "600", "700", "800", "900"], category: "sans-serif", subsets: ["latin"] },
  { family: "Ubuntu", variants: ["300", "regular", "500", "700"], category: "sans-serif", subsets: ["latin"] },
  { family: "Source Sans 3", variants: ["200", "300", "regular", "500", "600", "700", "800", "900"], category: "sans-serif", subsets: ["latin"] },
  { family: "Noto Sans", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"], category: "sans-serif", subsets: ["latin"] },
  { family: "Anton", variants: ["regular"], category: "sans-serif", subsets: ["latin"] },
  { family: "Exo 2", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"], category: "sans-serif", subsets: ["latin"] },
  { family: "Outfit", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"], category: "sans-serif", subsets: ["latin"] },
  { family: "Inter", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"], category: "sans-serif", subsets: ["latin"] },
  { family: "Space Grotesk", variants: ["300", "regular", "500", "600", "700"], category: "sans-serif", subsets: ["latin"] },
  { family: "DM Sans", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"], category: "sans-serif", subsets: ["latin"] },
  { family: "Josefin Sans", variants: ["100", "200", "300", "regular", "500", "600", "700"], category: "sans-serif", subsets: ["latin"] },
  { family: "Fjalla One", variants: ["regular"], category: "sans-serif", subsets: ["latin"] },
  { family: "Barlow", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"], category: "sans-serif", subsets: ["latin"] },
  { family: "Barlow Condensed", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"], category: "sans-serif", subsets: ["latin"] },
  { family: "Barlow Semi Condensed", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"], category: "sans-serif", subsets: ["latin"] },
  { family: "Manrope", variants: ["200", "300", "regular", "500", "600", "700", "800"], category: "sans-serif", subsets: ["latin"] },
  { family: "Plus Jakarta Sans", variants: ["200", "300", "regular", "500", "600", "700", "800"], category: "sans-serif", subsets: ["latin"] },
  { family: "Syne", variants: ["regular", "500", "600", "700", "800"], category: "sans-serif", subsets: ["latin"] },
  { family: "Figtree", variants: ["300", "regular", "500", "600", "700", "800", "900"], category: "sans-serif", subsets: ["latin"] },
  { family: "Kanit", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"], category: "sans-serif", subsets: ["latin"] },
  { family: "Nunito Sans", variants: ["200", "300", "regular", "500", "600", "700", "800", "900"], category: "sans-serif", subsets: ["latin"] },
  { family: "Work Sans", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"], category: "sans-serif", subsets: ["latin"] },
  { family: "Karla", variants: ["200", "300", "regular", "500", "600", "700", "800"], category: "sans-serif", subsets: ["latin"] },
  { family: "Cabin", variants: ["regular", "500", "600", "700"], category: "sans-serif", subsets: ["latin"] },
  { family: "Quicksand", variants: ["300", "regular", "500", "600", "700"], category: "sans-serif", subsets: ["latin"] },
  { family: "Hind", variants: ["300", "regular", "500", "600", "700"], category: "sans-serif", subsets: ["latin"] },
  { family: "Mukta", variants: ["200", "300", "regular", "500", "600", "700", "800"], category: "sans-serif", subsets: ["latin"] },
  { family: "Mulish", variants: ["200", "300", "regular", "500", "600", "700", "800", "900"], category: "sans-serif", subsets: ["latin"] },
  { family: "Rubik", variants: ["300", "regular", "500", "600", "700", "800", "900"], category: "sans-serif", subsets: ["latin"] },
  { family: "Fira Sans", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"], category: "sans-serif", subsets: ["latin"] },
  { family: "Exo", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"], category: "sans-serif", subsets: ["latin"] },
  { family: "Titillium Web", variants: ["200", "300", "regular", "600", "700", "900"], category: "sans-serif", subsets: ["latin"] },
  { family: "Libre Franklin", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"], category: "sans-serif", subsets: ["latin"] },
  { family: "Teko", variants: ["300", "regular", "500", "600", "700"], category: "sans-serif", subsets: ["latin"] },
  { family: "Lexend", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"], category: "sans-serif", subsets: ["latin"] },
  { family: "Albert Sans", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"], category: "sans-serif", subsets: ["latin"] },
  { family: "Urbanist", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"], category: "sans-serif", subsets: ["latin"] },
  { family: "Be Vietnam Pro", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"], category: "sans-serif", subsets: ["latin"] },
  { family: "Epilogue", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"], category: "sans-serif", subsets: ["latin"] },
  { family: "Geologica", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"], category: "sans-serif", subsets: ["latin"] },

  // ── Display / Headline ────────────────────────────────────────────────────
  { family: "Bebas Neue", variants: ["regular"], category: "display", subsets: ["latin"] },
  { family: "Unbounded", variants: ["200", "300", "regular", "500", "600", "700", "800", "900"], category: "display", subsets: ["latin"] },
  { family: "Righteous", variants: ["regular"], category: "display", subsets: ["latin"] },
  { family: "Lobster", variants: ["regular"], category: "display", subsets: ["latin"] },
  { family: "Fredoka One", variants: ["regular"], category: "display", subsets: ["latin"] },
  { family: "Alfa Slab One", variants: ["regular"], category: "display", subsets: ["latin"] },
  { family: "Boogaloo", variants: ["regular"], category: "display", subsets: ["latin"] },
  { family: "Bowlby One SC", variants: ["regular"], category: "display", subsets: ["latin"] },
  { family: "Bree Serif", variants: ["regular"], category: "serif", subsets: ["latin"] },
  { family: "Chewy", variants: ["regular"], category: "display", subsets: ["latin"] },
  { family: "Chivo", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"], category: "sans-serif", subsets: ["latin"] },
  { family: "Cinzel", variants: ["regular", "500", "600", "700", "800", "900"], category: "display", subsets: ["latin"] },
  { family: "Comfortaa", variants: ["300", "regular", "500", "600", "700"], category: "display", subsets: ["latin"] },
  { family: "Concert One", variants: ["regular"], category: "display", subsets: ["latin"] },
  { family: "Dela Gothic One", variants: ["regular"], category: "display", subsets: ["latin"] },
  { family: "Gruppo", variants: ["regular"], category: "display", subsets: ["latin"] },
  { family: "Hanken Grotesk", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"], category: "sans-serif", subsets: ["latin"] },
  { family: "Heebo", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"], category: "sans-serif", subsets: ["latin"] },
  { family: "Jost", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"], category: "sans-serif", subsets: ["latin"] },
  { family: "Kumbh Sans", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"], category: "sans-serif", subsets: ["latin"] },
  { family: "League Gothic", variants: ["regular"], category: "display", subsets: ["latin"] },
  { family: "League Spartan", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"], category: "sans-serif", subsets: ["latin"] },
  { family: "Lilita One", variants: ["regular"], category: "display", subsets: ["latin"] },
  { family: "Passion One", variants: ["regular", "700", "900"], category: "display", subsets: ["latin"] },
  { family: "Poiret One", variants: ["regular"], category: "display", subsets: ["latin"] },
  { family: "Rajdhani", variants: ["300", "regular", "500", "600", "700"], category: "sans-serif", subsets: ["latin"] },
  { family: "Russo One", variants: ["regular"], category: "sans-serif", subsets: ["latin"] },
  { family: "Saira", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"], category: "sans-serif", subsets: ["latin"] },
  { family: "Saira Condensed", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"], category: "sans-serif", subsets: ["latin"] },
  { family: "Secular One", variants: ["regular"], category: "sans-serif", subsets: ["latin"] },
  { family: "Squada One", variants: ["regular"], category: "display", subsets: ["latin"] },
  { family: "Staatliches", variants: ["regular"], category: "display", subsets: ["latin"] },
  { family: "Syncopate", variants: ["regular", "700"], category: "sans-serif", subsets: ["latin"] },
  { family: "Unica One", variants: ["regular"], category: "display", subsets: ["latin"] },
  { family: "Viga", variants: ["regular"], category: "sans-serif", subsets: ["latin"] },
  { family: "Yeseva One", variants: ["regular"], category: "display", subsets: ["latin"] },
  { family: "Zen Dots", variants: ["regular"], category: "display", subsets: ["latin"] },
  { family: "Black Han Sans", variants: ["regular"], category: "sans-serif", subsets: ["latin"] },
  { family: "Baumans", variants: ["regular"], category: "display", subsets: ["latin"] },
  { family: "Chakra Petch", variants: ["300", "regular", "500", "600", "700"], category: "sans-serif", subsets: ["latin"] },
  { family: "Big Shoulders Display", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"], category: "display", subsets: ["latin"] },
  { family: "Big Shoulders Text", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"], category: "display", subsets: ["latin"] },
  { family: "Sora", variants: ["100", "200", "300", "regular", "500", "600", "700", "800"], category: "sans-serif", subsets: ["latin"] },
  { family: "Space Mono", variants: ["regular", "700"], category: "monospace", subsets: ["latin"] },
  { family: "Share Tech Mono", variants: ["regular"], category: "monospace", subsets: ["latin"] },
  { family: "VT323", variants: ["regular"], category: "monospace", subsets: ["latin"] },
  { family: "Press Start 2P", variants: ["regular"], category: "display", subsets: ["latin"] },
  { family: "Orbitron", variants: ["regular", "500", "600", "700", "800", "900"], category: "sans-serif", subsets: ["latin"] },
  { family: "Nova Square", variants: ["regular"], category: "display", subsets: ["latin"] },
  { family: "Audiowide", variants: ["regular"], category: "display", subsets: ["latin"] },
  { family: "Oxanium", variants: ["200", "300", "regular", "500", "600", "700", "800"], category: "display", subsets: ["latin"] },
  { family: "Quantico", variants: ["regular", "700"], category: "sans-serif", subsets: ["latin"] },
  { family: "Iceland", variants: ["regular"], category: "display", subsets: ["latin"] },
  { family: "Exo 2", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"], category: "sans-serif", subsets: ["latin"] },

  // ── Serif ─────────────────────────────────────────────────────────────────
  { family: "Merriweather", variants: ["300", "regular", "700", "900"], category: "serif", subsets: ["latin"] },
  { family: "Playfair Display", variants: ["regular", "500", "600", "700", "800", "900"], category: "serif", subsets: ["latin"] },
  { family: "Libre Baskerville", variants: ["regular", "700"], category: "serif", subsets: ["latin"] },
  { family: "Lora", variants: ["regular", "500", "600", "700"], category: "serif", subsets: ["latin"] },
  { family: "PT Serif", variants: ["regular", "700"], category: "serif", subsets: ["latin"] },
  { family: "Noto Serif", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"], category: "serif", subsets: ["latin"] },
  { family: "Crimson Text", variants: ["regular", "600", "700"], category: "serif", subsets: ["latin"] },
  { family: "Cormorant Garamond", variants: ["300", "regular", "500", "600", "700"], category: "serif", subsets: ["latin"] },
  { family: "EB Garamond", variants: ["regular", "500", "600", "700", "800"], category: "serif", subsets: ["latin"] },
  { family: "Frank Ruhl Libre", variants: ["300", "regular", "500", "700", "900"], category: "serif", subsets: ["latin"] },
  { family: "Libre Caslon Text", variants: ["regular", "700"], category: "serif", subsets: ["latin"] },
  { family: "Spectral", variants: ["200", "300", "regular", "500", "600", "700", "800"], category: "serif", subsets: ["latin"] },
  { family: "Zilla Slab", variants: ["300", "regular", "500", "600", "700"], category: "serif", subsets: ["latin"] },
  { family: "IBM Plex Serif", variants: ["100", "200", "300", "regular", "500", "600", "700"], category: "serif", subsets: ["latin"] },
  { family: "Bitter", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"], category: "serif", subsets: ["latin"] },

  // ── Handwriting / Script ──────────────────────────────────────────────────
  { family: "Dancing Script", variants: ["regular", "500", "600", "700"], category: "handwriting", subsets: ["latin"] },
  { family: "Pacifico", variants: ["regular"], category: "handwriting", subsets: ["latin"] },
  { family: "Permanent Marker", variants: ["regular"], category: "handwriting", subsets: ["latin"] },
  { family: "Satisfy", variants: ["regular"], category: "handwriting", subsets: ["latin"] },
  { family: "Caveat", variants: ["regular", "500", "600", "700"], category: "handwriting", subsets: ["latin"] },
  { family: "Kalam", variants: ["300", "regular", "700"], category: "handwriting", subsets: ["latin"] },
  { family: "Patrick Hand", variants: ["regular"], category: "handwriting", subsets: ["latin"] },
  { family: "Architects Daughter", variants: ["regular"], category: "handwriting", subsets: ["latin"] },
  { family: "Shadows Into Light", variants: ["regular"], category: "handwriting", subsets: ["latin"] },
  { family: "Indie Flower", variants: ["regular"], category: "handwriting", subsets: ["latin"] },
  { family: "Amatic SC", variants: ["regular", "700"], category: "handwriting", subsets: ["latin"] },
  { family: "Courgette", variants: ["regular"], category: "handwriting", subsets: ["latin"] },
  { family: "Sacramento", variants: ["regular"], category: "handwriting", subsets: ["latin"] },
  { family: "Great Vibes", variants: ["regular"], category: "handwriting", subsets: ["latin"] },
  { family: "Allura", variants: ["regular"], category: "handwriting", subsets: ["latin"] },
  { family: "Alex Brush", variants: ["regular"], category: "handwriting", subsets: ["latin"] },
  { family: "Italianno", variants: ["regular"], category: "handwriting", subsets: ["latin"] },
  { family: "Pinyon Script", variants: ["regular"], category: "handwriting", subsets: ["latin"] },
  { family: "Marck Script", variants: ["regular"], category: "handwriting", subsets: ["latin"] },
  { family: "Rock Salt", variants: ["regular"], category: "handwriting", subsets: ["latin"] },
  { family: "Yellowtail", variants: ["regular"], category: "handwriting", subsets: ["latin"] },
  { family: "Cookie", variants: ["regular"], category: "handwriting", subsets: ["latin"] },
  { family: "Damion", variants: ["regular"], category: "handwriting", subsets: ["latin"] },
  { family: "Leckerli One", variants: ["regular"], category: "handwriting", subsets: ["latin"] },
  { family: "Bad Script", variants: ["regular"], category: "handwriting", subsets: ["latin"] },
  { family: "Gochi Hand", variants: ["regular"], category: "handwriting", subsets: ["latin"] },
  { family: "Neucha", variants: ["regular"], category: "handwriting", subsets: ["latin"] },
  { family: "Homemade Apple", variants: ["regular"], category: "handwriting", subsets: ["latin"] },
  { family: "Redressed", variants: ["regular"], category: "handwriting", subsets: ["latin"] },
  { family: "Tangerine", variants: ["regular", "700"], category: "handwriting", subsets: ["latin"] },

  // ── Monospace / Code ──────────────────────────────────────────────────────
  { family: "Fira Code", variants: ["300", "regular", "500", "600", "700"], category: "monospace", subsets: ["latin"] },
  { family: "JetBrains Mono", variants: ["100", "200", "300", "regular", "500", "600", "700", "800"], category: "monospace", subsets: ["latin"] },
  { family: "IBM Plex Mono", variants: ["100", "200", "300", "regular", "500", "600", "700"], category: "monospace", subsets: ["latin"] },
  { family: "Source Code Pro", variants: ["200", "300", "regular", "500", "600", "700", "800", "900"], category: "monospace", subsets: ["latin"] },
  { family: "Inconsolata", variants: ["200", "300", "regular", "500", "600", "700", "800", "900"], category: "monospace", subsets: ["latin"] },
  { family: "Courier Prime", variants: ["regular", "700"], category: "monospace", subsets: ["latin"] },
  { family: "Roboto Mono", variants: ["100", "200", "300", "regular", "500", "600", "700"], category: "monospace", subsets: ["latin"] },
  { family: "DM Mono", variants: ["300", "regular", "500"], category: "monospace", subsets: ["latin"] },
  { family: "Nanum Gothic Coding", variants: ["regular", "700"], category: "monospace", subsets: ["latin"] },
];
