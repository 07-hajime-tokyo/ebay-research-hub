import { readFile } from "node:fs/promises";
import { createSign } from "node:crypto";
import { createChangeLog, supabaseRequest } from "@/lib/ebay-supabase";

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";
const SPREADSHEET_ID = "1XYUwcdPLC4ev4lHa5_aibTRMMxxASB8MIk1czG2vAhw";
const SHEET_NAME = "出品トラフィック";
let localEnvLoaded = false;

async function loadLocalEnvFallback() {
  if (localEnvLoaded) return;
  localEnvLoaded = true;
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_APPLICATION_CREDENTIALS) return;

  const text = await readFile("../youtube-production-hub-main/.env.local", "utf8").catch(() => "");
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

function base64Url(input: string | Buffer) {
  return Buffer.from(input).toString("base64url");
}

async function loadGoogleCredentials() {
  await loadLocalEnvFallback();
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (raw?.trim()) return JSON.parse(raw);
  if (credentialsPath) return JSON.parse(await readFile(credentialsPath, "utf8"));
  throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS is required");
}

async function getAccessToken() {
  const credentials = await loadGoogleCredentials();
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: credentials.client_email,
    scope: SHEETS_SCOPE,
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };
  const unsigned = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(claim))}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(credentials.private_key, "base64url");
  const assertion = `${unsigned}.${signature}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`Google token request failed: ${JSON.stringify(data)}`);
  return data.access_token as string;
}

async function googleSheetsGet(path: string, accessToken: string) {
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${path}`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  const text = await response.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Google Sheets response was not JSON: ${text.slice(0, 160)}`);
  }
  if (!response.ok) throw new Error(`Google Sheets request failed: ${JSON.stringify(data)}`);
  return data;
}

function columnIndex(headers: unknown[], names: string[]) {
  return headers.findIndex((header) => names.includes(String(header ?? "").trim()));
}

function numberFrom(value: unknown) {
  if (typeof value === "number") return value;
  const normalized = String(value ?? "").replace(/,/g, "").replace(/%/g, "").trim();
  if (!normalized) return 0;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return 0;
  return String(value).includes("%") ? parsed / 100 : parsed;
}

function stringFrom(value: unknown) {
  return String(value ?? "").trim();
}

function timestampFrom(value: unknown) {
  const text = stringFrom(value);
  if (!text) return null;
  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(text)) return `${text.replace(" ", "T")}:00+09:00`;
  return text;
}

function inferGenre(title: string) {
  const text = title.toLowerCase();
  if (/(shimano|daiwa|reel|baitcasting|megabass|fishing|lure|rod|spool)/i.test(text)) return "釣具";
  if (/(taylormade|callaway|titleist|ping|mizuno|driver|iron|golf|putter|wedge)/i.test(text)) return "ゴルフ";
  if (/(nintendo|switch|3ds|psp|vita|playstation|game|famicom|pokemon)/i.test(text)) return "ゲーム";
  if (/(canon|nikon|fujifilm|olympus|pentax|camera|powershot|eos|instax|lens)/i.test(text)) return "カメラ";
  if (/(seiko|orient|citizen|watch|chronograph|g-shock)/i.test(text)) return "時計";
  if (/(gundam|evangelion|figure|jojo|nendoroid|model kit|toy|pokemon card)/i.test(text)) return "ホビー";
  if (/(yamaha|sony|jbl|headphone|speaker|walkman|audio|amplifier)/i.test(text)) return "家電";
  return "その他";
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
  return chunks;
}

function tokyoDateString(value = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function snapshotRows(items: Array<{
  item_id: string;
  title: string;
  genre: string;
  sales: number;
  total_impressions: number;
  views: number;
  click_rate: number;
  conversion_rate: number;
  acquired_at: string | null;
  source_spreadsheet_id: string;
  source_sheet_name: string;
}>) {
  const snapshotDate = tokyoDateString();
  return items.map((item) => ({
    item_id: item.item_id,
    snapshot_date: snapshotDate,
    title: item.title,
    genre: item.genre,
    sales: item.sales,
    total_impressions: item.total_impressions,
    views: item.views,
    click_rate: item.click_rate,
    conversion_rate: item.conversion_rate,
    acquired_at: item.acquired_at,
    source_spreadsheet_id: item.source_spreadsheet_id,
    source_sheet_name: item.source_sheet_name,
  }));
}

export async function readEbayTrafficItems(maxRows = 5000) {
  const accessToken = await getAccessToken();
  const range = encodeURIComponent(`${SHEET_NAME}!A4:Q${maxRows}`);
  const data = await googleSheetsGet(`${SPREADSHEET_ID}/values/${range}?valueRenderOption=FORMATTED_VALUE`, accessToken);
  const rows = data.values ?? [];
  const headers = rows[0] ?? [];

  const indexes = {
    title: columnIndex(headers, ["商品名"]),
    itemId: columnIndex(headers, ["商品ID"]),
    sales: columnIndex(headers, ["販売数"]),
    totalImpressions: columnIndex(headers, ["総インプレッション"]),
    organicImpressions: columnIndex(headers, ["通常インプレッション"]),
    searchImpressions: columnIndex(headers, ["検索インプレッション"]),
    storeImpressions: columnIndex(headers, ["ストアインプレッション"]),
    views: columnIndex(headers, ["閲覧数"]),
    clickRate: columnIndex(headers, ["クリック率"]),
    conversionRate: columnIndex(headers, ["コンバージョン率"]),
    itemUrl: columnIndex(headers, ["商品URL"]),
    acquiredAt: columnIndex(headers, ["取得日時"]),
    note: columnIndex(headers, ["備考"]),
    internalTitle: columnIndex(headers, ["商品タイトル(内部)"]),
    internalUrl: columnIndex(headers, ["商品URL(内部)"]),
    imageUrl: columnIndex(headers, ["商品画像URL(内部)"]),
  };

  if (indexes.title < 0 || indexes.itemId < 0) {
    throw new Error(`必要な列が見つかりません。headers=${JSON.stringify(headers)}`);
  }

  return rows
    .slice(1)
    .map((row: unknown[], index: number) => {
      const title = stringFrom(row[indexes.title]) || stringFrom(row[indexes.internalTitle]);
      const itemId = stringFrom(row[indexes.itemId]);
      const itemUrl = stringFrom(row[indexes.itemUrl]) || stringFrom(row[indexes.internalUrl]) || (itemId ? `https://www.ebay.com/itm/${itemId}` : "");
      return {
        item_id: itemId,
        title,
        genre: inferGenre(title),
        image_url: stringFrom(row[indexes.imageUrl]) || null,
        item_url: itemUrl || null,
        sales: numberFrom(row[indexes.sales]),
        total_impressions: numberFrom(row[indexes.totalImpressions]),
        organic_impressions: numberFrom(row[indexes.organicImpressions]),
        search_impressions: numberFrom(row[indexes.searchImpressions]),
        store_impressions: numberFrom(row[indexes.storeImpressions]),
        views: numberFrom(row[indexes.views]),
        click_rate: numberFrom(row[indexes.clickRate]),
        conversion_rate: numberFrom(row[indexes.conversionRate]),
        acquired_at: timestampFrom(row[indexes.acquiredAt]),
        source_spreadsheet_id: SPREADSHEET_ID,
        source_sheet_name: SHEET_NAME,
        note: stringFrom(row[indexes.note]) || null,
        raw: {
          rowNumber: index + 5,
          values: row,
        },
      };
    })
    .filter((item: { title: string; item_id: string }) => item.title && item.item_id);
}

export async function syncEbayTrafficToSupabase() {
  const items = await readEbayTrafficItems();
  let upserted = 0;

  for (const group of chunk(items, 500)) {
    await supabaseRequest("ebay_traffic_items?on_conflict=item_id", {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(group),
    });
    upserted += group.length;
  }

  for (const group of chunk(snapshotRows(items), 500)) {
    await supabaseRequest("ebay_traffic_daily_snapshots?on_conflict=item_id,snapshot_date", {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(group),
    });
  }

  await createChangeLog({
    action: "sync",
    targetType: "ebay_traffic_items",
    title: "出品トラフィックを同期",
    detail: `${upserted}件の商品データをGoogle Sheetsから同期しました。`,
    actorEmail: "system",
    metadata: {
      spreadsheetId: SPREADSHEET_ID,
      sheetName: SHEET_NAME,
      count: upserted,
    },
  });

  return { count: upserted, spreadsheetId: SPREADSHEET_ID, sheetName: SHEET_NAME };
}
