"use client";

import { useState, useEffect, useRef } from "react";
import type { RenderJob } from "@/types/studio";

interface RenderProgress {
  status: "idle" | "rendering" | "done" | "error";
  progress: number;
  outputUrl?: string;
  error?: string;
  framesRendered?: number;
  totalFrames?: number;
}

export function useRenderProgress(renderId: string | null, bucketName: string | null) {
  const [renderState, setRenderState] = useState<RenderProgress>({ status: "idle", progress: 0 });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!renderId || !bucketName) return;

    setRenderState({ status: "rendering", progress: 0 });

    const poll = async () => {
      try {
        const res = await fetch(`/api/render/${renderId}?bucketName=${encodeURIComponent(bucketName)}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error ?? "Failed to check render progress");
        }

        if (data.status === "done") {
          setRenderState({ status: "done", progress: 1, outputUrl: data.outputUrl });
          if (intervalRef.current) clearInterval(intervalRef.current);
        } else if (data.status === "error") {
          setRenderState({ status: "error", progress: 0, error: data.error });
          if (intervalRef.current) clearInterval(intervalRef.current);
        } else {
          setRenderState({
            status: "rendering",
            progress: data.progress ?? 0,
            framesRendered: data.framesRendered,
            totalFrames: data.totalFrames,
          });
        }
      } catch (err) {
        console.warn("[useRenderProgress] Poll error:", err);
        setRenderState({
          status: "error",
          progress: 0,
          error: err instanceof Error ? err.message : "Failed to check render progress",
        });
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    };

    poll(); // immediate first poll
    intervalRef.current = setInterval(poll, 2000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [renderId, bucketName]);

  return renderState;
}
