import { readFile } from "node:fs/promises";

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";
const SPREADSHEET_ID = "1XYUwcdPLC4ev4lHa5_aibTRMMxxASB8MIk1czG2vAhw";
const SHEET_NAME = "出品トラフィック";
const MAX_ROWS = Number(process.env.TRAFFIC_MAX_ROWS ?? 5000);

function loadEnvFile(path) {
  return readFile(path, "utf8")
    .then((text) => {
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
    })
    .catch(() => {});
}

function base64Url(input) {
  return Buffer.from(input).toString("base64url");
}

async function loadEnv() {
  await loadEnvFile(".env.local");
  await loadEnvFile("../youtube-production-hub-main/.env.local");
}

function requireEnv(names) {
  for (const name of names) {
    if (process.env[name]) return process.env[name];
  }
  throw new Error(`${names.join(" or ")} is required`);
}

async function getAccessToken() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!raw && !credentialsPath) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON か GOOGLE_APPLICATION_CREDENTIALS がありません。");
  }

  const credentials = raw ? JSON.parse(raw) : JSON.parse(await readFile(credentialsPath, "utf8"));
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
  const { createSign } = await import("node:crypto");
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
  return data.access_token;
}

async function googleSheetsGet(path, accessToken) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${path}`;
  const response = await fetch(url, { headers: { authorization: `Bearer ${accessToken}` } });
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Google Sheets response was not JSON: ${text.slice(0, 160)}`);
  }
  if (!response.ok) throw new Error(`Google Sheets request failed: ${JSON.stringify(data)}`);
  return data;
}

function columnIndex(headers, names) {
  return headers.findIndex((header) => names.includes(String(header ?? "").trim()));
}

function numberFrom(value) {
  if (typeof value === "number") return value;
  const normalized = String(value ?? "").replace(/,/g, "").replace(/%/g, "").trim();
  if (!normalized) return 0;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return 0;
  return String(value).includes("%") ? parsed / 100 : parsed;
}

function stringFrom(value) {
  return String(value ?? "").trim();
}

function timestampFrom(value) {
  const text = stringFrom(value);
  if (!text) return null;
  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(text)) return `${text.replace(" ", "T")}:00+09:00`;
  return text;
}

function inferGenre(title) {
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

async function readTrafficItems() {
  const accessToken = await getAccessToken();
  const range = encodeURIComponent(`${SHEET_NAME}!A4:Q${MAX_ROWS}`);
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
    .map((row, index) => {
      const internalTitle = stringFrom(row[indexes.internalTitle]);
      const title = stringFrom(row[indexes.title]) || internalTitle;
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
    .filter((item) => item.title && item.item_id);
}

async function readGeneratedTrafficItems() {
  const text = await readFile("src/lib/generated/traffic-items.json", "utf8");
  const items = JSON.parse(text);
  return items.map((item, index) => ({
    item_id: item.itemId,
    title: item.title,
    genre: item.genre || inferGenre(item.title),
    image_url: item.imageUrl || null,
    item_url: item.itemUrl || (item.itemId ? `https://www.ebay.com/itm/${item.itemId}` : null),
    sales: Number(item.sales || 0),
    total_impressions: Number(item.totalImpressions || 0),
    organic_impressions: Number(item.organicImpressions || 0),
    search_impressions: Number(item.searchImpressions || 0),
    store_impressions: Number(item.storeImpressions || 0),
    views: Number(item.views || 0),
    click_rate: Number(item.ctr || 0),
    conversion_rate: Number(item.conversionRate || 0),
    acquired_at: timestampFrom(item.acquiredAt),
    source_spreadsheet_id: SPREADSHEET_ID,
    source_sheet_name: SHEET_NAME,
    note: item.note || null,
    raw: {
      source: "generated-json",
      rowNumber: index + 1,
    },
  })).filter((item) => item.title && item.item_id);
}

function chunk(items, size) {
  const chunks = [];
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

function snapshotRows(items) {
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

async function supabaseRequest(path, options = {}) {
  const supabaseUrl = requireEnv(["NEXT_PUBLIC_SUPABASE_URL", "PROJECT_SUPABASE_URL"]);
  const serviceRoleKey = requireEnv(["SUPABASE_SERVICE_ROLE_KEY", "PROJECT_SUPABASE_SERVICE_ROLE_KEY"]);
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Supabase request failed (${response.status}): ${text.slice(0, 500)}`);
  }
  return text ? JSON.parse(text) : null;
}

async function upsertTrafficItems(items) {
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
  return upserted;
}

async function upsertTrafficSnapshots(items) {
  let upserted = 0;
  for (const group of chunk(snapshotRows(items), 500)) {
    await supabaseRequest("ebay_traffic_daily_snapshots?on_conflict=item_id,snapshot_date", {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(group),
    });
    upserted += group.length;
  }
  return upserted;
}

async function insertChangeLog(count) {
  await supabaseRequest("change_logs", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      app_key: "ebay",
      action: "sync",
      target_type: "ebay_traffic_items",
      title: "出品トラフィックを同期",
      detail: `${count}件の商品データをGoogle Sheetsから同期しました。`,
      actor_email: "system",
      metadata: {
        spreadsheetId: SPREADSHEET_ID,
        sheetName: SHEET_NAME,
        count,
      },
    }),
  });
}

async function main() {
  await loadEnv();
  const items = process.env.EBAY_TRAFFIC_SOURCE === "generated"
    ? await readGeneratedTrafficItems()
    : await readTrafficItems();
  const upserted = await upsertTrafficItems(items);
  await upsertTrafficSnapshots(items);
  await insertChangeLog(upserted);
  console.log(`synced ${upserted} ebay traffic items to Supabase`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
