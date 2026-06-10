import { NextResponse } from "next/server";
import { requireRouteUser } from "@/lib/auth";
import {
  createEbayImprovementLog,
  getEbayImprovementLogs,
  resolveEbayImprovementLog,
  updateEbayImprovementMemo,
} from "@/lib/ebay-supabase";

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
  const imageUrl = String(payload.imageUrl ?? "").trim();
  const memo = String(payload.memo ?? "").trim();

  if (!itemId || !title || !improvement) {
    return NextResponse.json({ error: "itemId, title, and improvement are required." }, { status: 400 });
  }

  const item = await createEbayImprovementLog(
    {
      itemId,
      title,
      itemUrl,
      imageUrl,
      improvement,
      memo,
    },
    user?.email ?? undefined,
  );

  if (!item) {
    return NextResponse.json({ error: "Failed to save improvement." }, { status: 500 });
  }

  return NextResponse.json({ improvement: item });
}

export async function PATCH(request: Request) {
  const { error, user } = await requireRouteUser();
  if (error) return NextResponse.json({ error }, { status: 401 });

  const payload = await request.json();
  const id = String(payload.id ?? "").trim();
  const memo = String(payload.memo ?? "").trim();

  if (!id) {
    return NextResponse.json({ error: "id is required." }, { status: 400 });
  }

  const item = await updateEbayImprovementMemo(id, memo, user?.email ?? undefined);
  if (!item) {
    return NextResponse.json({ error: "Failed to update memo." }, { status: 500 });
  }

  return NextResponse.json({ improvement: item });
}

export async function DELETE(request: Request) {
  const { error, user } = await requireRouteUser();
  if (error) return NextResponse.json({ error }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = String(searchParams.get("id") ?? "").trim();

  if (!id) {
    return NextResponse.json({ error: "id is required." }, { status: 400 });
  }

  const item = await resolveEbayImprovementLog(id, user?.email ?? undefined);
  if (!item) {
    return NextResponse.json({ error: "Failed to remove improvement." }, { status: 500 });
  }

  return NextResponse.json({ improvement: item });
}
