import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ renderId: string }> }
) {
  try {
    const { renderId } = await params;
    const { searchParams } = new URL(req.url);
    const bucketName = searchParams.get("bucketName") ?? process.env.S3_BUCKET_NAME!;

    const { getRenderProgress } = await import("@remotion/lambda/client");

    const progress = await getRenderProgress({
      renderId,
      bucketName,
      functionName: process.env.REMOTION_LAMBDA_FUNCTION_NAME!,
      region: (process.env.AWS_REGION as "us-east-1") ?? "us-east-1",
    });

    if (progress.fatalErrorEncountered) {
      return NextResponse.json({
        status: "error",
        error: progress.errors[0]?.message ?? "Render failed",
        progress: 0,
      });
    }

    if (progress.done) {
      return NextResponse.json({
        status: "done",
        progress: 1,
        outputUrl: progress.outputFile,
        outputSizeInBytes: progress.outputSizeInBytes,
      });
    }

    return NextResponse.json({
      status: "rendering",
      progress: progress.overallProgress,
      framesRendered: progress.framesRendered,
      totalFrames: (progress.renderMetadata as { durationInFrames?: number } | null)?.durationInFrames,
    });
  } catch (err) {
    console.error("[GET /api/render/[renderId]]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
