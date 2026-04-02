import { StudioShell } from "@/components/studio/StudioShell";
import { readJsonFromS3 } from "@/lib/s3Client";
import type { ProjectState } from "@/types/studio";

interface Props {
  params: Promise<{ projectId: string }>;
}

async function fetchProject(projectId: string): Promise<ProjectState | null> {
  try {
    return await readJsonFromS3<ProjectState>(`projects/${projectId}/config.json`);
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
