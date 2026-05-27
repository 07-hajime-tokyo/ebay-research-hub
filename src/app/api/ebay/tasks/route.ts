import { NextResponse } from "next/server";
import { createEbayTask, getEbayTasks } from "@/lib/ebay-supabase";
import { requireRouteUser } from "@/lib/auth";

export async function GET() {
  const { error } = await requireRouteUser();
  if (error) return NextResponse.json({ error }, { status: 401 });

  const tasks = await getEbayTasks();
  return NextResponse.json({ tasks });
}

export async function POST(request: Request) {
  const { error, user } = await requireRouteUser();
  if (error) return NextResponse.json({ error }, { status: 401 });

  const payload = await request.json();
  const task = await createEbayTask(payload, user?.email ?? undefined);
  return NextResponse.json({ task });
}
