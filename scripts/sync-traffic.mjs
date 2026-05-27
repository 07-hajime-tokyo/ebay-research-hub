import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";
const SPREADSHEET_ID = "1XYUwcdPLC4ev4lHa5_aibTRMMxxASB8MIk1czG2vAhw";
const SHEET_NAME = "出品トラフィック";
const OUTPUT_PATH = resolve("src/lib/generated/traffic-items.json");
const MAX_ROWS = Number(process.env.TRAFFIC_MAX_ROWS ?? 1000);

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

async function getAccessToken() {
  await loadEnvFile(".env.local");
  await loadEnvFile("../youtube-production-hub-main/.env.local");

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

async function main() {
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
    ctr: columnIndex(headers, ["クリック率"]),
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

  const items = rows
    .slice(1)
    .map((row, index) => {
      const internalTitle = stringFrom(row[indexes.internalTitle]);
      const title = stringFrom(row[indexes.title]) || internalTitle;
      const itemId = stringFrom(row[indexes.itemId]);
      const itemUrl = stringFrom(row[indexes.itemUrl]) || stringFrom(row[indexes.internalUrl]) || (itemId ? `https://www.ebay.com/itm/${itemId}` : "");
      return {
        id: itemId || `row-${index + 5}`,
        title,
        itemId,
        sales: numberFrom(row[indexes.sales]),
        totalImpressions: numberFrom(row[indexes.totalImpressions]),
        organicImpressions: numberFrom(row[indexes.organicImpressions]),
        searchImpressions: numberFrom(row[indexes.searchImpressions]),
        storeImpressions: numberFrom(row[indexes.storeImpressions]),
        views: numberFrom(row[indexes.views]),
        ctr: numberFrom(row[indexes.ctr]),
        conversionRate: numberFrom(row[indexes.conversionRate]),
        itemUrl,
        acquiredAt: stringFrom(row[indexes.acquiredAt]),
        note: stringFrom(row[indexes.note]),
        imageUrl: stringFrom(row[indexes.imageUrl]),
        genre: inferGenre(title),
      };
    })
    .filter((item) => item.title && item.itemId);

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(items, null, 2)}\n`);
  console.log(`synced ${items.length} traffic items from ${SHEET_NAME}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
