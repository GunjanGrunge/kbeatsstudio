import { NextRequest, NextResponse } from "next/server";
import type { KBeatsInputProps } from "@/types/studio";

export const runtime = "nodejs";
export const maxDuration = 60; // Vercel allows 60s on hobby for API routes

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { inputProps, projectId, codec = "h264" } = body as {
      inputProps: KBeatsInputProps;
      projectId: string;
      codec?: string;
    };

    const functionName = process.env.REMOTION_LAMBDA_FUNCTION_NAME;
    const serveUrl = process.env.REMOTION_SERVE_URL;

    if (!functionName || !serveUrl) {
      return NextResponse.json(
        { error: "Lambda not configured. Set REMOTION_LAMBDA_FUNCTION_NAME and REMOTION_SERVE_URL in .env.local" },
        { status: 503 }
      );
    }

    // Dynamic import — keeps @remotion/lambda out of the client bundle
    const { renderMediaOnLambda, speculateFunctionName } = await import("@remotion/lambda/client");

    const { renderId, bucketName } = await renderMediaOnLambda({
      region: (process.env.AWS_REGION as "us-east-1") ?? "us-east-1",
      functionName,
      serveUrl,
      composition: "KBeatsMain",
      inputProps: inputProps as unknown as Record<string, unknown>,
      codec: codec as "h264",
      imageFormat: "jpeg",
      jpegQuality: 95,
      outName: `renders/${projectId}/output-${Date.now()}.mp4`,
      logLevel: "error",
    });

    return NextResponse.json({ renderId, bucketName });
  } catch (err) {
    console.error("[POST /api/render]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
