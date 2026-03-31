import { NextResponse } from "next/server";
import { ensureBucketExists } from "@/lib/s3Client";

export const runtime = "nodejs";

/** GET /api/setup — creates S3 bucket and CORS config. Call once after deploy. */
export async function GET() {
  try {
    await ensureBucketExists();
    return NextResponse.json({ success: true, message: "S3 bucket kbeats-studio is ready." });
  } catch (err) {
    console.error("[GET /api/setup]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
