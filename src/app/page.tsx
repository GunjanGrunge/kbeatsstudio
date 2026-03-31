"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles, Plus } from "lucide-react";
import { TemplatePicker } from "@/components/landing/TemplatePicker";
import { ProjectList } from "@/components/landing/ProjectList";
import type { Template } from "@/types/studio";

export default function HomePage() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const handleTemplateSelect = async (template: Template) => {
    setCreating(true);
    try {
      const res = await fetch("/api/s3/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template, projectName: "Untitled Project" }),
      });
      const data = await res.json();
      if (data.projectId) {
        router.push(`/studio/${data.projectId}`);
      }
    } catch (err) {
      console.error("Failed to create project:", err);
      setCreating(false);
    }
  };

  const handleOpenProject = (projectId: string) => {
    router.push(`/studio/${projectId}`);
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-[rgba(255,255,255,0.05)]">
        <div className="flex items-center gap-1">
          <span
            className="text-2xl text-[#ccff00]"
            style={{ fontFamily: "Unbounded, sans-serif", fontWeight: 900 }}
          >
            K
          </span>
          <span
            className="text-2xl text-white tracking-widest"
            style={{ fontFamily: "Unbounded, sans-serif", fontWeight: 300 }}
          >
            BEATS
          </span>
          <span
            className="ml-2 text-xs text-[#888888] tracking-[0.15em] uppercase"
            style={{ fontFamily: "Outfit, sans-serif", fontWeight: 300 }}
          >
            Studio
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-[#ccff00]" />
          <span className="text-xs text-[#888888]" style={{ fontFamily: "Outfit, sans-serif" }}>
            Music Channel Production
          </span>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center py-16 px-4">
        {/* Hero */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1
            className="text-4xl md:text-6xl font-black text-white mb-4 leading-none"
            style={{ fontFamily: "Unbounded, sans-serif", fontWeight: 900 }}
          >
            Create.{" "}
            <span
              className="text-[#ccff00]"
              style={{ textShadow: "0 0 60px rgba(204,255,0,0.4)" }}
            >
              Animate.
            </span>{" "}
            Drop.
          </h1>
          <p
            className="text-[#888888] text-base md:text-lg max-w-lg mx-auto"
            style={{ fontFamily: "Outfit, sans-serif", fontWeight: 300 }}
          >
            Build animated overlays for your music videos — lyrics, chords, subscribe CTAs, waveforms — then export in 4K.
          </p>
        </motion.div>

        {/* New Project CTA */}
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          {!showPicker ? (
            <button
              className="flex items-center gap-3 px-8 py-4 rounded-xl text-sm"
              style={{
                background: "#ccff00",
                color: "#050505",
                fontFamily: "Unbounded, sans-serif",
                fontWeight: 700,
                fontSize: "0.75rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "#b3e600";
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 12px 30px rgba(204,255,0,0.3)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "#ccff00";
                (e.currentTarget as HTMLButtonElement).style.transform = "none";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
              }}
              onClick={() => setShowPicker(true)}
            >
              <Plus size={16} />
              New Project
            </button>
          ) : (
            <button
              className="text-xs text-[#888888] hover:text-white transition-colors duration-200"
              style={{ fontFamily: "Outfit, sans-serif" }}
              onClick={() => setShowPicker(false)}
            >
              ← Cancel
            </button>
          )}
        </motion.div>

        {/* Template Picker */}
        {showPicker && (
          <motion.div
            className="w-full mb-16"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="text-center mb-8">
              <p
                className="text-xs uppercase tracking-[0.2em] text-[#888888] mb-2"
                style={{ fontFamily: "Unbounded, sans-serif" }}
              >
                Choose a Template
              </p>
            </div>
            {creating ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <div className="w-8 h-8 border-2 border-[#ccff00] border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-[#888888]" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Creating your project...
                </p>
              </div>
            ) : (
              <TemplatePicker onSelect={handleTemplateSelect} />
            )}
          </motion.div>
        )}

        {/* Divider */}
        <div className="w-full max-w-5xl px-6 mb-12">
          <div className="border-t border-[rgba(255,255,255,0.05)]" />
        </div>

        {/* Saved Projects */}
        <motion.div
          className="w-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <ProjectList onOpen={handleOpenProject} />
        </motion.div>
      </main>
    </div>
  );
}
