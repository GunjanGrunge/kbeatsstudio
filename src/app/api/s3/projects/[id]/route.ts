import { NextRequest, NextResponse } from "next/server";
import { readJsonFromS3, writeJsonToS3 } from "@/lib/s3Client";
import type { ProjectIndex, ProjectState } from "@/types/studio";

export const runtime = "nodejs";

const INDEX_KEY = "projects/index.json";

/** GET /api/s3/projects/[id] — load a project */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const config = await readJsonFromS3<ProjectState>(`projects/${id}/config.json`);
    if (!config) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    return NextResponse.json({ project: config });
  } catch (err) {
    console.error("[GET /api/s3/projects/[id]]", err);
    return NextResponse.json({ error: "Failed to load project" }, { status: 500 });
  }
}

/** PUT /api/s3/projects/[id] — save/update a project */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const projectState: ProjectState = { ...body, lastSaved: new Date().toISOString(), isDirty: false };

    await writeJsonToS3(`projects/${id}/config.json`, projectState);

    // Update index entry
    const index = (await readJsonFromS3<ProjectIndex[]>(INDEX_KEY)) ?? [];
    const entryIdx = index.findIndex((p) => p.id === id);
    const entry: ProjectIndex = {
      id,
      name: projectState.projectName,
      template: projectState.template,
      updatedAt: projectState.lastSaved!,
      thumbnailUrl: projectState.videoSrc ?? undefined,
    };
    if (entryIdx >= 0) {
      index[entryIdx] = entry;
    } else {
      index.unshift(entry);
    }
    await writeJsonToS3(INDEX_KEY, index);

    return NextResponse.json({ success: true, lastSaved: projectState.lastSaved });
  } catch (err) {
    console.error("[PUT /api/s3/projects/[id]]", err);
    return NextResponse.json({ error: "Failed to save project" }, { status: 500 });
  }
}

/** DELETE /api/s3/projects/[id] — delete a project from the index */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const index = (await readJsonFromS3<ProjectIndex[]>(INDEX_KEY)) ?? [];
    const filtered = index.filter((p) => p.id !== id);
    await writeJsonToS3(INDEX_KEY, filtered);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/s3/projects/[id]]", err);
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}
