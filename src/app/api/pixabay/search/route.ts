import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  const page = req.nextUrl.searchParams.get("page") ?? "1";
  const per_page = req.nextUrl.searchParams.get("per_page") ?? "20";

  if (!q) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  const apiKey = process.env.PIXABAY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Pixabay API key not configured" }, { status: 500 });
  }

  const url = new URL("https://pixabay.com/api/videos/");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("q", q);
  url.searchParams.set("video_type", "film");
  url.searchParams.set("per_page", per_page);
  url.searchParams.set("page", page);

  const res = await fetch(url.toString());
  if (!res.ok) {
    return NextResponse.json({ error: "Pixabay API error", status: res.status }, { status: 502 });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
