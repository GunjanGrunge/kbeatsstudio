import { NextRequest, NextResponse } from "next/server";
import { getPresignedDownloadUrl } from "@/lib/s3Client";

export const runtime = "nodejs";

/** GET /api/s3/media?key=projects/... — streams a private S3 asset through the server.
 *  Serving from the same origin avoids CORS entirely — S3 CORS config not required.
 *  Used by WaveformVisualizer so useAudioData can decode private audio files. */
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (!key) {
    return NextResponse.json({ error: "Missing key" }, { status: 400 });
  }

  try {
    const presignedUrl = await getPresignedDownloadUrl(key, 3600);
    const s3Res = await fetch(presignedUrl);

    if (!s3Res.ok) {
      return NextResponse.json({ error: "S3 fetch failed" }, { status: s3Res.status });
    }

    const contentType = s3Res.headers.get("Content-Type") ?? "application/octet-stream";
    const contentLength = s3Res.headers.get("Content-Length");

    const headers: Record<string, string> = { "Content-Type": contentType };
    if (contentLength) headers["Content-Length"] = contentLength;

    return new NextResponse(s3Res.body, { headers });
  } catch (err) {
    console.error("[/api/s3/media]", err);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
