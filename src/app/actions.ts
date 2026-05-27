"use server";

import { redirect } from "next/navigation";
import { requireRouteUser } from "@/lib/auth";

export async function signOut() {
  const { supabase } = await requireRouteUser();
  await supabase?.auth.signOut();
  redirect("/login");
}
