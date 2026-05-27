import { readFile } from "node:fs/promises";
import type { TrafficItem } from "@/lib/types";

type EbayTrafficRow = {
  item_id: string;
  title: string;
  genre: TrafficItem["genre"];
  image_url: string | null;
  item_url: string | null;
  sales: number | null;
  total_impressions: number | null;
  organic_impressions: number | null;
  search_impressions: number | null;
  store_impressions: number | null;
  views: number | null;
  click_rate: number | null;
  conversion_rate: number | null;
  acquired_at: string | null;
  note: string | null;
};

export type ChangeLogItem = {
  id: string;
  title: string;
  detail: string;
  at: string;
  actor: string;
};

export type EbayTask = {
  id: string;
  title: string;
  status: string;
  stage: string;
  date: string;
  due: string;
  end: string;
  owner: string;
  minutes: number;
  priority: string;
  display: string;
  pinned: boolean;
  note: string;
};

type EbayTaskRow = {
  id: string;
  title: string;
  status: string | null;
  stage: string | null;
  task_date: string | null;
  start_time: string | null;
  end_time: string | null;
  owner: string | null;
  minutes: number | null;
  priority: string | null;
  display: string | null;
  pinned: boolean | null;
  note: string | null;
};

let localEnvLoaded = false;

async function loadLocalEnvFallback() {
  if (localEnvLoaded) return;
  localEnvLoaded = true;
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) return;

  const envPath = "../youtube-production-hub-main/.env.local";
  const text = await readFile(envPath, "utf8").catch(() => "");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...rest] = trimmed.split("=");
    if (process.env[key]) continue;
    let value = rest.join("=").trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function formatLogDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatAcquiredAt(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
  return parts.replace("T", " ");
}

export async function supabaseRequest<T>(path: string, options: RequestInit = {}) {
  await loadLocalEnvFallback();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.PROJECT_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.PROJECT_SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;

  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
      ...(options.headers ?? {}),
    },
    cache: "no-store",
  });
  const text = await response.text();
  if (!response.ok) {
    console.error(text);
    return null;
  }
  return text ? (JSON.parse(text) as T) : null;
}

async function supabaseGet<T>(path: string) {
  return supabaseRequest<T>(path);
}

function stripSeconds(value: string | null) {
  if (!value) return "";
  return value.slice(0, 5);
}

function taskRowToTask(row: EbayTaskRow): EbayTask {
  return {
    id: row.id,
    title: row.title,
    status: row.status ?? "未着手",
    stage: row.stage ?? "リサーチ",
    date: row.task_date ?? "",
    due: stripSeconds(row.start_time),
    end: stripSeconds(row.end_time),
    owner: row.owner ?? "",
    minutes: row.minutes ?? 60,
    priority: row.priority ?? "中",
    display: row.display ?? "通常",
    pinned: Boolean(row.pinned),
    note: row.note ?? "",
  };
}

export function taskToRow(task: Partial<EbayTask>) {
  return {
    title: task.title,
    status: task.status ?? "未着手",
    stage: task.stage ?? "リサーチ",
    task_date: task.date || null,
    start_time: task.due || null,
    end_time: task.end || null,
    owner: task.owner || null,
    minutes: Number(task.minutes || 60),
    priority: task.priority ?? "中",
    display: task.display ?? "通常",
    pinned: Boolean(task.pinned),
    note: task.note || null,
    created_by: "local",
  };
}

export async function getEbayTrafficItems() {
  const rows = await supabaseGet<EbayTrafficRow[]>(
    "ebay_traffic_items?select=item_id,title,genre,image_url,item_url,sales,total_impressions,organic_impressions,search_impressions,store_impressions,views,click_rate,conversion_rate,acquired_at,note&order=total_impressions.desc&limit=500",
  );
  if (!rows) return null;

  return rows.map((row): TrafficItem => ({
    id: row.item_id,
    title: row.title,
    itemId: row.item_id,
    sales: row.sales ?? 0,
    totalImpressions: row.total_impressions ?? 0,
    organicImpressions: row.organic_impressions ?? 0,
    searchImpressions: row.search_impressions ?? 0,
    storeImpressions: row.store_impressions ?? 0,
    views: row.views ?? 0,
    ctr: row.click_rate ?? 0,
    conversionRate: row.conversion_rate ?? 0,
    itemUrl: row.item_url || `https://www.ebay.com/itm/${row.item_id}`,
    acquiredAt: formatAcquiredAt(row.acquired_at),
    note: row.note ?? "",
    imageUrl: row.image_url ?? "",
    genre: row.genre || "その他",
  }));
}

export async function getEbayChangeLogs() {
  const rows = await supabaseGet<Array<{
    id: string;
    title: string;
    detail: string | null;
    actor_email: string | null;
    created_at: string;
  }>>(
    "change_logs?select=id,title,detail,actor_email,created_at&app_key=eq.ebay&order=created_at.desc&limit=8",
  );
  if (!rows) return [];

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    detail: row.detail ?? "",
    at: formatLogDate(row.created_at),
    actor: row.actor_email ?? "system",
  }));
}

export async function getEbayTasks() {
  const rows = await supabaseGet<EbayTaskRow[]>(
    "ebay_tasks?select=id,title,status,stage,task_date,start_time,end_time,owner,minutes,priority,display,pinned,note&order=task_date.asc.nullslast&order=start_time.asc.nullslast&limit=500",
  );
  if (!rows) return [];
  return rows.map(taskRowToTask);
}

export async function createChangeLog(input: {
  action: string;
  targetType: string;
  targetId?: string;
  title: string;
  detail?: string;
  actorEmail?: string;
  metadata?: Record<string, unknown>;
}) {
  await supabaseRequest("change_logs", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      app_key: "ebay",
      action: input.action,
      target_type: input.targetType,
      target_id: input.targetId ?? null,
      title: input.title,
      detail: input.detail ?? null,
      actor_email: input.actorEmail ?? "local",
      metadata: input.metadata ?? {},
    }),
  });
}

export async function createEbayTask(task: Partial<EbayTask>, actorEmail?: string) {
  const rows = await supabaseRequest<EbayTaskRow[]>("ebay_tasks?select=id,title,status,stage,task_date,start_time,end_time,owner,minutes,priority,display,pinned,note", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(taskToRow(task)),
  });
  const created = rows?.[0] ? taskRowToTask(rows[0]) : null;
  if (created) {
    await createChangeLog({
      action: "create",
      targetType: "ebay_task",
      targetId: created.id,
      title: "タスクを追加",
      detail: created.title,
      actorEmail,
    });
  }
  return created;
}

export async function updateEbayTask(id: string, task: Partial<EbayTask>, actorEmail?: string) {
  const rows = await supabaseRequest<EbayTaskRow[]>(
    `ebay_tasks?id=eq.${encodeURIComponent(id)}&select=id,title,status,stage,task_date,start_time,end_time,owner,minutes,priority,display,pinned,note`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(taskToRow(task)),
    },
  );
  const updated = rows?.[0] ? taskRowToTask(rows[0]) : null;
  if (updated) {
    await createChangeLog({
      action: "update",
      targetType: "ebay_task",
      targetId: updated.id,
      title: "タスクを更新",
      detail: updated.title,
      actorEmail,
    });
  }
  return updated;
}

export async function deleteEbayTask(id: string, actorEmail?: string) {
  await supabaseRequest(`ebay_tasks?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
  await createChangeLog({
    action: "delete",
    targetType: "ebay_task",
    targetId: id,
    title: "タスクを削除",
    actorEmail,
  });
}
