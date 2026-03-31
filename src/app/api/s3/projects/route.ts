import { NextRequest, NextResponse } from "next/server";
import { readJsonFromS3, writeJsonToS3 } from "@/lib/s3Client";
import type { ProjectIndex, ProjectState } from "@/types/studio";
import { v4 as uuidv4 } from "uuid";

export const runtime = "nodejs";

const INDEX_KEY = "projects/index.json";

async function getIndex(): Promise<ProjectIndex[]> {
  return (await readJsonFromS3<ProjectIndex[]>(INDEX_KEY)) ?? [];
}

/** GET /api/s3/projects — list all projects */
export async function GET() {
  try {
    const index = await getIndex();
    return NextResponse.json({ projects: index });
  } catch (err) {
    console.error("[GET /api/s3/projects]", err);
    return NextResponse.json({ error: "Failed to list projects" }, { status: 500 });
  }
}

/** POST /api/s3/projects — create a new project */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { template, projectName } = body;

    const projectId = uuidv4();
    const now = new Date().toISOString();

    const newState: ProjectState = {
      projectId,
      projectName: projectName ?? "Untitled Project",
      template,
      audioSrc: null,
      videoSrc: null,
      durationInFrames: template.fps * 30,
      overlays: [],
      selectedOverlayId: null,
      isDirty: false,
      lastSaved: now,
      backgroundColor: "#050505",
      backgroundOpacity: 1,
    };

    // Write config
    await writeJsonToS3(`projects/${projectId}/config.json`, newState);

    // Update index
    const index = await getIndex();
    const entry: ProjectIndex = {
      id: projectId,
      name: projectName ?? "Untitled Project",
      template,
      updatedAt: now,
    };
    index.unshift(entry);
    await writeJsonToS3(INDEX_KEY, index);

    return NextResponse.json({ projectId, project: newState });
  } catch (err) {
    console.error("[POST /api/s3/projects]", err);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
