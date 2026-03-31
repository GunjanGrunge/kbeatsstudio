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

// Curated fallback (top 50 popular Google Fonts)
export const FALLBACK_FONTS: GoogleFont[] = [
  { family: "Roboto", variants: ["100", "300", "regular", "500", "700", "900"], category: "sans-serif", subsets: ["latin"] },
  { family: "Open Sans", variants: ["300", "regular", "500", "600", "700", "800"], category: "sans-serif", subsets: ["latin"] },
  { family: "Lato", variants: ["100", "300", "regular", "700", "900"], category: "sans-serif", subsets: ["latin"] },
  { family: "Montserrat", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"], category: "sans-serif", subsets: ["latin"] },
  { family: "Oswald", variants: ["200", "300", "regular", "500", "600", "700"], category: "sans-serif", subsets: ["latin"] },
  { family: "Raleway", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"], category: "sans-serif", subsets: ["latin"] },
  { family: "Poppins", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"], category: "sans-serif", subsets: ["latin"] },
  { family: "Merriweather", variants: ["300", "regular", "700", "900"], category: "serif", subsets: ["latin"] },
  { family: "Playfair Display", variants: ["regular", "500", "600", "700", "800", "900"], category: "serif", subsets: ["latin"] },
  { family: "Nunito", variants: ["200", "300", "regular", "500", "600", "700", "800", "900"], category: "sans-serif", subsets: ["latin"] },
  { family: "Ubuntu", variants: ["300", "regular", "500", "700"], category: "sans-serif", subsets: ["latin"] },
  { family: "Libre Baskerville", variants: ["regular", "700"], category: "serif", subsets: ["latin"] },
  { family: "Source Sans 3", variants: ["200", "300", "regular", "500", "600", "700", "800", "900"], category: "sans-serif", subsets: ["latin"] },
  { family: "Noto Sans", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"], category: "sans-serif", subsets: ["latin"] },
  { family: "Bebas Neue", variants: ["regular"], category: "display", subsets: ["latin"] },
  { family: "Anton", variants: ["regular"], category: "sans-serif", subsets: ["latin"] },
  { family: "Dancing Script", variants: ["regular", "500", "600", "700"], category: "handwriting", subsets: ["latin"] },
  { family: "Pacifico", variants: ["regular"], category: "handwriting", subsets: ["latin"] },
  { family: "Righteous", variants: ["regular"], category: "display", subsets: ["latin"] },
  { family: "Exo 2", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"], category: "sans-serif", subsets: ["latin"] },
  { family: "Unbounded", variants: ["200", "300", "regular", "500", "600", "700", "800", "900"], category: "display", subsets: ["latin"] },
  { family: "Outfit", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"], category: "sans-serif", subsets: ["latin"] },
  { family: "Inter", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"], category: "sans-serif", subsets: ["latin"] },
  { family: "Space Grotesk", variants: ["300", "regular", "500", "600", "700"], category: "sans-serif", subsets: ["latin"] },
  { family: "DM Sans", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"], category: "sans-serif", subsets: ["latin"] },
  { family: "Josefin Sans", variants: ["100", "200", "300", "regular", "500", "600", "700"], category: "sans-serif", subsets: ["latin"] },
  { family: "Fjalla One", variants: ["regular"], category: "sans-serif", subsets: ["latin"] },
  { family: "Barlow", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"], category: "sans-serif", subsets: ["latin"] },
  { family: "Permanent Marker", variants: ["regular"], category: "handwriting", subsets: ["latin"] },
  { family: "Lobster", variants: ["regular"], category: "display", subsets: ["latin"] },
];
