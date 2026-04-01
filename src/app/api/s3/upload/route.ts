import { NextRequest, NextResponse } from "next/server";
import { getPresignedUploadUrl } from "@/lib/s3Client";
import { v4 as uuidv4 } from "uuid";

export const runtime = "nodejs";

const ALLOWED_TYPES: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/ogg": "ogg",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, fileName, contentType, fileType, uniqueKey } = body as {
      projectId: string;
      fileName: string;
      contentType: string;
      fileType: "audio" | "video" | "image";
      uniqueKey?: string;
    };

    if (!projectId || !contentType) {
      return NextResponse.json({ error: "Missing projectId or contentType" }, { status: 400 });
    }

    const ext = ALLOWED_TYPES[contentType];
    if (!ext) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }

    const key = uniqueKey
      ? `projects/${projectId}/${uniqueKey}.${ext}`
      : `projects/${projectId}/${fileType}.${ext}`;
    const uploadUrl = await getPresignedUploadUrl(key, contentType);
    const publicUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    return NextResponse.json({ uploadUrl, key, publicUrl, fileName });
  } catch (err) {
    console.error("[/api/s3/upload]", err);
    return NextResponse.json({ error: "Failed to generate upload URL" }, { status: 500 });
  }
}
