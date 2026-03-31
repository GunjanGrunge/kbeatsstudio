import { StudioShell } from "@/components/studio/StudioShell";
import type { ProjectState } from "@/types/studio";

interface Props {
  params: Promise<{ projectId: string }>;
}

async function fetchProject(projectId: string): Promise<ProjectState | null> {
  try {
    // Server-side fetch using internal API base
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const res = await fetch(`${baseUrl}/api/s3/projects/${projectId}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.project ?? null;
  } catch {
    return null;
  }
}

export default async function StudioPage({ params }: Props) {
  const { projectId } = await params;
  const initialState = await fetchProject(projectId);

  return <StudioShell projectId={projectId} initialState={initialState} />;
}

export const dynamic = "force-dynamic";
