import { NextResponse } from "next/server";
import { createEbayTask, getEbayTasks } from "@/lib/ebay-supabase";

export async function GET() {
  const tasks = await getEbayTasks();
  return NextResponse.json({ tasks });
}

export async function POST(request: Request) {
  const payload = await request.json();
  const task = await createEbayTask(payload);
  return NextResponse.json({ task });
}
