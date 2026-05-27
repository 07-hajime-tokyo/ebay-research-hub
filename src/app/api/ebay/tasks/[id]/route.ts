import { NextResponse } from "next/server";
import { deleteEbayTask, updateEbayTask } from "@/lib/ebay-supabase";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const payload = await request.json();
  const task = await updateEbayTask(id, payload);
  return NextResponse.json({ task });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  await deleteEbayTask(id);
  return NextResponse.json({ ok: true });
}
