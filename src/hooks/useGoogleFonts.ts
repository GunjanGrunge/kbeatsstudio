"use client";

import { useState, useEffect } from "react";
import { fetchGoogleFonts, injectGoogleFont, type GoogleFont, type FontCategory } from "@/lib/googleFonts";

export function useGoogleFonts() {
  const [fonts, setFonts] = useState<GoogleFont[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<FontCategory>("all");

  useEffect(() => {
    fetchGoogleFonts()
      .then(setFonts)
      .finally(() => setLoading(false));
  }, []);

  const filtered = fonts.filter((f) => {
    const matchesSearch = f.family.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === "all" || f.category === category;
    return matchesSearch && matchesCategory;
  });

  const loadFont = (family: string, weights?: number[]) => {
    injectGoogleFont(family, weights);
  };

  return { fonts: filtered, loading, search, setSearch, category, setCategory, loadFont };
}
