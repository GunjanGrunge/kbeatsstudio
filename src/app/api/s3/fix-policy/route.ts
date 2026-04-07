import { NextResponse } from "next/server";
import { applyBucketPolicy } from "@/lib/s3Client";

export const runtime = "nodejs";

/** GET /api/s3/fix-policy — re-applies the S3 bucket policy to make project assets public.
 *  Call once after deploying this fix if you have an existing bucket with private project files. */
export async function GET() {
  try {
    await applyBucketPolicy();
    return NextResponse.json({ ok: true, message: "Bucket policy updated — project assets are now publicly readable." });
  } catch (err) {
    console.error("[/api/s3/fix-policy]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
