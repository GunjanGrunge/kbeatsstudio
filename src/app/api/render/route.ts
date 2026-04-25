import { NextRequest, NextResponse } from "next/server";
import type { ExportSettings, KBeatsInputProps, OverlayConfig } from "@/types/studio";
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
      if (o.type === "video-clip" && o.videoClipSrc) {
        return { ...o, videoClipSrc: await presignIfPrivate(o.videoClipSrc) ?? o.videoClipSrc };
      }
      return o;
    })
  );
}

async function presignTimelineRegions(regions: KBeatsInputProps["timelineRegions"] = []): Promise<KBeatsInputProps["timelineRegions"]> {
  return Promise.all(
    regions.map(async (region) => {
      if (region.type === "audio" && region.audioSrc) {
        return { ...region, audioSrc: await presignIfPrivate(region.audioSrc) ?? region.audioSrc };
      }
      return region;
    })
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { inputProps, projectId, codec, frameRange, exportSettings } = body as {
      inputProps: KBeatsInputProps;
      projectId: string;
      codec?: string;
      frameRange?: [number, number];
      exportSettings?: ExportSettings & { width?: number; height?: number };
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
    const [audioSrc, videoSrc, presignedOverlays, presignedTimelineRegions] = await Promise.all([
      presignIfPrivate(inputProps.audioSrc),
      presignIfPrivate(inputProps.videoSrc),
      presignOverlays(inputProps.overlays),
      presignTimelineRegions(inputProps.timelineRegions),
    ]);

    const resolvedProps: KBeatsInputProps = {
      ...inputProps,
      audioSrc,
      videoSrc,
      overlays: presignedOverlays,
      timelineRegions: presignedTimelineRegions,
    };

    // Dynamic import — keeps @remotion/lambda out of the client bundle
    const { renderMediaOnLambda } = await import("@remotion/lambda/client");

    const format = exportSettings?.format ?? "mp4";
    const outputFileName = `${projectId}-${Date.now()}.${format}`;
    const jpegQuality = exportSettings?.quality === "draft" ? 70 : exportSettings?.quality === "standard" ? 86 : 95;
    const scale = exportSettings?.scale ?? 1;
    const framesPerLambda = exportSettings?.quality === "draft" ? 40 : 20;
    const resolvedCodec = codec ?? (format === "gif" ? "gif" : "h264");

    const { renderId, bucketName } = await renderMediaOnLambda({
      region: (process.env.AWS_REGION as "us-east-1") ?? "us-east-1",
      functionName,
      serveUrl,
      composition: "KBeatsMain",
      inputProps: resolvedProps as unknown as Record<string, unknown>,
      codec: resolvedCodec as "h264",
      privacy: "no-acl",
      downloadBehavior: { type: "download", fileName: outputFileName },
      imageFormat: "jpeg",
      jpegQuality,
      outName: `renders/${projectId}/${outputFileName}`,
      logLevel: "error",
      timeoutInMilliseconds: 60000, // 60s per delayRender call (e.g. audio decode)
      maxRetries: 2,
      framesPerLambda,
      scale,
      ...(frameRange ? { frameRange } : {}),
    });

    return NextResponse.json({ renderId, bucketName });
  } catch (err) {
    console.error("[POST /api/render]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
