import { Client } from "@notionhq/client";
import type { EbayTask } from "@/lib/ebay-supabase";

type NotionCreateProperties = NonNullable<Parameters<Client["pages"]["create"]>[0]["properties"]>;
type NotionPageShell = { id: string };

const defaultEbayProjectId = "352abd69af0e814d8b27caeba92f91bc";
const defaultSiteUrl = "https://ebay-research-hub-two.vercel.app";

function cleanEnv(value?: string) {
  return value?.replace(/^\uFEFF/, "").trim() ?? "";
}

function getConfig() {
  const token = cleanEnv(process.env.PROJECT_HUB_NOTION_TOKEN || process.env.NOTION_TOKEN);
  const tasksDataSourceId = cleanEnv(process.env.PROJECT_HUB_NOTION_DS_TASKS || process.env.NOTION_DS_TASKS);
  const ebayProjectId = cleanEnv(process.env.PROJECT_HUB_EBAY_PROJECT_ID) || defaultEbayProjectId;
  return {
    token,
    tasksDataSourceId,
    ebayProjectId,
    enabled: Boolean(token && tasksDataSourceId && ebayProjectId),
  };
}

function getNotionClient(token: string) {
  return new Client({ auth: token });
}

function textItem(content: string) {
  return {
    type: "text" as const,
    text: { content: content.slice(0, 2000) },
  };
}

function titleText(content: string) {
  return { title: [textItem(content)] };
}

function richText(content: string) {
  return { rich_text: [textItem(content)] };
}

function selectValue(name: string) {
  return { select: { name } };
}

function dateValue(start: string) {
  return { date: { start } };
}

function mapStatus(status: string) {
  if (status === "進行中") return "Doing";
  if (status === "完了") return "Done";
  if (status === "ブロック中") return "Blocked";
  return "Todo";
}

function mapPriority(priority: string) {
  if (priority === "高") return "P0";
  if (priority === "中") return "P1";
  if (priority === "低") return "P2";
  return "P2";
}

function baseSiteUrl() {
  const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "";
  const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "";
  return cleanEnv(process.env.NEXT_PUBLIC_SITE_URL) || productionUrl || vercelUrl || defaultSiteUrl;
}

function sourceLinkForTaskId(taskId: string) {
  const base = baseSiteUrl().replace(/\/$/, "");
  return `${base}/?taskId=${encodeURIComponent(taskId)}`;
}

function buildTaskNotes(task: EbayTask) {
  const meta = {
    assignee: task.owner || undefined,
    projectLabel: "eBay自動化",
    memo: task.note || undefined,
    source: "ebay-research-hub",
    ebayTaskId: task.id,
    stage: task.stage,
    minutes: task.minutes,
  };

  return [
    `task-meta: ${JSON.stringify(meta)}`,
    task.owner ? `assignee: ${task.owner}` : "",
    "project-label: eBay自動化",
    "手入力でタスクパネルから追加",
    "source: eBay Research Hub",
    `工程: ${task.stage}`,
    `予定分: ${task.minutes}m`,
    task.note ? `memo: ${task.note}` : "",
  ].filter(Boolean).join("\n");
}

function buildTaskProperties(task: EbayTask, sourceLink: string, ebayProjectId: string) {
  const properties: NotionCreateProperties = {
    Title: titleText(task.title),
    Project: { relation: [{ id: ebayProjectId }] },
    Status: selectValue(mapStatus(task.status)),
    Priority: selectValue(mapPriority(task.priority)),
    Methodology: selectValue("共通"),
    "Source Link": { url: sourceLink },
    "AI Notes": richText(buildTaskNotes(task)),
  };

  properties.Due = task.date ? dateValue(task.date) : { date: null };
  return properties;
}

async function findTaskBySourceLink(client: Client, tasksDataSourceId: string, sourceLink: string) {
  const response = await client.dataSources.query({
    data_source_id: tasksDataSourceId,
    filter: {
      property: "Source Link",
      url: { equals: sourceLink },
    },
    page_size: 1,
  } as Parameters<Client["dataSources"]["query"]>[0]);

  return response.results[0] as NotionPageShell | undefined;
}

export async function syncProjectHubTask(task: EbayTask | null) {
  if (!task) return;
  const config = getConfig();
  if (!config.enabled) return;

  try {
    const client = getNotionClient(config.token);
    const sourceLink = sourceLinkForTaskId(task.id);
    const properties = buildTaskProperties(task, sourceLink, config.ebayProjectId);
    const existing = await findTaskBySourceLink(client, config.tasksDataSourceId, sourceLink);

    if (existing) {
      await client.pages.update({
        page_id: existing.id,
        properties,
      });
      return;
    }

    await client.pages.create({
      parent: { data_source_id: config.tasksDataSourceId },
      properties,
    } as Parameters<Client["pages"]["create"]>[0]);
  } catch (error) {
    console.warn("[project-hub-notion] task sync failed", error);
  }
}

export async function dropProjectHubTask(taskId: string) {
  const config = getConfig();
  if (!config.enabled || !taskId) return;

  try {
    const client = getNotionClient(config.token);
    const sourceLink = sourceLinkForTaskId(taskId);
    const existing = await findTaskBySourceLink(client, config.tasksDataSourceId, sourceLink);
    if (!existing) return;

    await client.pages.update({
      page_id: existing.id,
      properties: {
        Status: selectValue("Dropped"),
      },
    });
  } catch (error) {
    console.warn("[project-hub-notion] task drop failed", error);
  }
}
