import { NextRequest, NextResponse } from "next/server";
import type { KBeatsInputProps, OverlayConfig } from "@/types/studio";
import { getPresignedDownloadUrl, BUCKET } from "@/lib/s3Client";

export const runtime = "nodejs";
export const maxDuration = 60; // Vercel allows 60s on hobby for API routes

const BUCKET_PREFIX = `https://${BUCKET}.s3.`;

/** If a URL points to our private S3 bucket, swap it for a 6-hour presigned URL */
async function presignIfPrivate(url: string | null | undefined): Promise<string | null> {
  if (!url) return url ?? null;
  if (!url.includes(BUCKET_PREFIX)) return url;
  // Extract the S3 key from the URL: everything after the bucket host
  const key = url.split(".amazonaws.com/")[1];
  if (!key) return url;
  return getPresignedDownloadUrl(key, 6 * 3600);
}

/** Walk all overlays and presign any private S3 asset URLs */
async function presignOverlays(overlays: OverlayConfig[]): Promise<OverlayConfig[]> {
  return Promise.all(
    overlays.map(async (o) => {
      if (o.type === "image" && o.imageSrc) {
        return { ...o, imageSrc: await presignIfPrivate(o.imageSrc) ?? o.imageSrc };
      }
      if ((o.type === "audio-track" || o.type === "waveform") && o.audioSrc) {
        return { ...o, audioSrc: await presignIfPrivate(o.audioSrc) ?? o.audioSrc };
      }
      if (o.type === "video-background" && o.videoSrc) {
        return { ...o, videoSrc: await presignIfPrivate(o.videoSrc) ?? o.videoSrc };
      }
      return o;
    })
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { inputProps, projectId, codec = "h264", frameRange } = body as {
      inputProps: KBeatsInputProps;
      projectId: string;
      codec?: string;
      frameRange?: [number, number];
    };

    const functionName = process.env.REMOTION_LAMBDA_FUNCTION_NAME;
    const serveUrl = process.env.REMOTION_SERVE_URL;

    if (!functionName || !serveUrl) {
      return NextResponse.json(
        { error: "Lambda not configured. Set REMOTION_LAMBDA_FUNCTION_NAME and REMOTION_SERVE_URL in .env.local" },
        { status: 503 }
      );
    }

    // Presign any private S3 URLs so Lambda can fetch them during render
    const [audioSrc, videoSrc, presignedOverlays] = await Promise.all([
      presignIfPrivate(inputProps.audioSrc),
      presignIfPrivate(inputProps.videoSrc),
      presignOverlays(inputProps.overlays),
    ]);

    const resolvedProps: KBeatsInputProps = {
      ...inputProps,
      audioSrc,
      videoSrc,
      overlays: presignedOverlays,
    };

    // Dynamic import — keeps @remotion/lambda out of the client bundle
    const { renderMediaOnLambda } = await import("@remotion/lambda/client");

    const { renderId, bucketName } = await renderMediaOnLambda({
      region: (process.env.AWS_REGION as "us-east-1") ?? "us-east-1",
      functionName,
      serveUrl,
      composition: "KBeatsMain",
      inputProps: resolvedProps as unknown as Record<string, unknown>,
      codec: codec as "h264",
      imageFormat: "jpeg",
      jpegQuality: 95,
      outName: `renders/${projectId}/output-${Date.now()}.mp4`,
      logLevel: "error",
      ...(frameRange ? { frameRange } : {}),
    });

    return NextResponse.json({ renderId, bucketName });
  } catch (err) {
    console.error("[POST /api/render]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
