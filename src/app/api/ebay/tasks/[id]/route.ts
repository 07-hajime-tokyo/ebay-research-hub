import { NextResponse } from "next/server";
import { deleteEbayTask, updateEbayTask } from "@/lib/ebay-supabase";
import { requireRouteUser } from "@/lib/auth";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireRouteUser();
  if (error) return NextResponse.json({ error }, { status: 401 });

  const { id } = await context.params;
  const payload = await request.json();
  const task = await updateEbayTask(id, payload, user?.email ?? undefined);
  return NextResponse.json({ task });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireRouteUser();
  if (error) return NextResponse.json({ error }, { status: 401 });

  const { id } = await context.params;
  await deleteEbayTask(id, user?.email ?? undefined);
  return NextResponse.json({ ok: true });
}
