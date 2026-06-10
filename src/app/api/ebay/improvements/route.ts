import { NextResponse } from "next/server";
import { requireRouteUser } from "@/lib/auth";
import { createEbayImprovementLog, getEbayImprovementLogs } from "@/lib/ebay-supabase";

export async function GET() {
  const { error } = await requireRouteUser();
  if (error) return NextResponse.json({ error }, { status: 401 });

  const improvements = await getEbayImprovementLogs();
  return NextResponse.json({ improvements });
}

export async function POST(request: Request) {
  const { error, user } = await requireRouteUser();
  if (error) return NextResponse.json({ error }, { status: 401 });

  const payload = await request.json();
  const improvement = String(payload.improvement ?? "").trim();
  const itemId = String(payload.itemId ?? "").trim();
  const title = String(payload.title ?? "").trim();
  const itemUrl = String(payload.itemUrl ?? "").trim();

  if (!itemId || !title || !improvement) {
    return NextResponse.json({ error: "itemId, title, and improvement are required." }, { status: 400 });
  }

  const item = await createEbayImprovementLog(
    {
      itemId,
      title,
      itemUrl,
      improvement,
    },
    user?.email ?? undefined,
  );

  if (!item) {
    return NextResponse.json({ error: "Failed to save improvement." }, { status: 500 });
  }

  return NextResponse.json({ improvement: item });
}
