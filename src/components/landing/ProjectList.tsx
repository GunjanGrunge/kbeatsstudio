"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FolderOpen, Trash2, Clock, PlayCircle, Camera } from "lucide-react";
import type { ProjectIndex, Template } from "@/types/studio";
import { Badge } from "@/components/ui/badge";

interface Props {
  onOpen: (projectId: string) => void;
}

function formatRelative(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function PlatformIcon({ platform }: { platform: Template["platform"] }) {
  return platform === "youtube"
    ? <PlayCircle size={12} className="text-[#ccff00]" />
    : <Camera size={12} className="text-[#ccff00]" />;
}

export function ProjectList({ onOpen }: Props) {
  const [projects, setProjects] = useState<ProjectIndex[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/s3/projects")
      .then((r) => r.json())
      .then((d) => setProjects(d.projects ?? []))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this project?")) return;
    setDeletingId(id);
    await fetch(`/api/s3/projects/${id}`, { method: "DELETE" });
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setDeletingId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-5 h-5 border-2 border-[#ccff00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-8 text-[#888888]" style={{ fontFamily: "Outfit, sans-serif" }}>
        <FolderOpen size={32} className="mx-auto mb-2 opacity-30" />
        <p className="text-sm">No saved projects yet.</p>
        <p className="text-xs mt-1">Pick a template above to start.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-6">
      <div className="flex items-center gap-3 mb-5">
        <FolderOpen size={16} className="text-[#ccff00]" />
        <h2
          className="text-sm uppercase tracking-[0.2em] text-white"
          style={{ fontFamily: "Unbounded, sans-serif", fontWeight: 700 }}
        >
          Recent Projects
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <AnimatePresence>
          {projects.map((p) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="group relative flex flex-col gap-2 p-4 rounded-xl bg-[#1a1a1c] border border-[rgba(255,255,255,0.05)]
                cursor-pointer hover:border-[#ccff00] transition-all duration-300 hover:shadow-[0_0_16px_rgba(204,255,0,0.12)]"
              onClick={() => onOpen(p.id)}
            >
              {/* Project name */}
              <p
                className="text-sm font-semibold text-white leading-tight truncate pr-6"
                style={{ fontFamily: "Unbounded, sans-serif" }}
              >
                {p.name}
              </p>

              {/* Meta */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1">
                  <PlatformIcon platform={p.template.platform} />
                  <span className="text-[10px] text-[#888888]">{p.template.name}</span>
                </div>
                <Badge
                  variant="outline"
                  className="text-[9px] px-1.5 py-0 border-[rgba(255,255,255,0.1)] text-[#888888] font-mono"
                >
                  {p.template.width}×{p.template.height}
                </Badge>
              </div>

              <div className="flex items-center gap-1 text-[10px] text-[#555555]">
                <Clock size={10} />
                <span>{formatRelative(p.updatedAt)}</span>
              </div>

              {/* Delete button */}
              <button
                className="absolute top-3 right-3 p-1 rounded-md opacity-0 group-hover:opacity-100
                  text-[#555555] hover:text-red-400 transition-all duration-200"
                onClick={(e) => handleDelete(p.id, e)}
                disabled={deletingId === p.id}
              >
                {deletingId === p.id
                  ? <div className="w-3 h-3 border border-[#555555] border-t-transparent rounded-full animate-spin" />
                  : <Trash2 size={13} />
                }
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
