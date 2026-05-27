import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";
const OUTPUT_PATH = resolve("src/lib/generated/research-thumbnail-cache.json");
const MAX_ROWS_PER_SHEET = Number(process.env.RESEARCH_THUMBNAIL_MAX_ROWS ?? 80);

const spreadsheets = [
  { id: "1-fLyZj-FV52XnAOVBGWOrK3zPcWmz-3wSUr2elYZNrA", title: "good.japan398_リサーチシート" },
  { id: "1BLncT5iIf_wXsfQOZCkV69eAfvJ4f1rX5VzD4JanlLM", title: "kakera_リサーチシート" },
  { id: "163DMQK6IvXz6epKYXLk03ffuCyOzuH9g0gWLNRDhPo4", title: "kakera_リサーチシート" },
  { id: "1WNAVEH_XlvO7kfU3Z4-1pXaqe5CefioFyF0poW8U9K0", title: "shins_reel_shop_kyoto_リサーチシート" },
  { id: "1N8NG7wl5eUjJB3vuvokHEuri30epdZzmOlsLum_q_8U", title: "shins_reel_shop_kyoto_リサーチシート" },
  { id: "1dpyRow8wYWKKXTc0C_-lgl5J9tcZnVC3TUNAS9UXds0", title: "north834_リサーチシート" },
  { id: "15GWe55tBeWcZvWs9ackTyAJCCgOYOSh0cbid6rSqwds", title: "kawamura-camera_リサーチシート" },
  { id: "1gboPLfk7KFjTt7R0LpDPgjKcDul-GiTfupTLEFff_io", title: "best_tackle_japan_リサーチシート" },
  { id: "1iNNyQexbZ7URilAcCln0VVx_loNiZ0xC_DoKVw_Q9B0", title: "best-film-camera_リサーチシート" },
  { id: "1FXUS1SkdTZaO4Byg59OXrnXjqYA6CILtR3PrSBAzpxI", title: "mictok_watch_リサーチシート" },
  { id: "1Ug85q7ASyhKvtqq_Rk2ivq4G766J9DWYf8cfjMS9WPc", title: "kiyomizu99770515_リサーチシート" },
  { id: "1-NgONjVcFTnq6_CT11Wa6hM3lWsljheaeoraiTvMA7E", title: "makse2313_リサーチシート_loginless_final" },
  { id: "1tsWHp61VSBt4dFhvPlvrAXUH1qL7h-KOitsJ-iHVR6c", title: "makse2313_リサーチシート_loginless_v2" },
];

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

async function getEbayAccessToken() {
  if (process.env.EBAY_ACCESS_TOKEN) return process.env.EBAY_ACCESS_TOKEN;
  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return "";

  const response = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "https://api.ebay.com/oauth/api_scope",
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`eBay token request failed: ${JSON.stringify(data)}`);
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

function ebayItemUrl(itemId) {
  const clean = String(itemId ?? "").trim();
  if (!/^\d{9,15}$/.test(clean)) return "";
  return `https://www.ebay.com/itm/${clean}`;
}

function findUrl(row, indexes) {
  for (const index of indexes) {
    const value = String(row[index] ?? "").trim();
    if (value.startsWith("http")) return value;
  }
  return "";
}

function extractOgImage(html) {
  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["'][^>]*>/i,
    /"image"\s*:\s*"([^"]+)"/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1].replace(/\\u002F/g, "/");
  }
  return "";
}

async function fetchThumbnailUrl(listingUrl) {
  if (!listingUrl) return "";
  const response = await fetch(listingUrl, {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; MarketKitResearchBot/1.0)",
      accept: "text/html,application/xhtml+xml",
    },
  });
  if (!response.ok) return "";
  return extractOgImage(await response.text());
}

async function fetchThumbnailFromEbayApi(itemId, ebayAccessToken) {
  if (!itemId || !ebayAccessToken) return "";
  const response = await fetch(`https://api.ebay.com/buy/browse/v1/item/get_item_by_legacy_id?legacy_item_id=${encodeURIComponent(itemId)}`, {
    headers: {
      authorization: `Bearer ${ebayAccessToken}`,
      "x-ebay-c-marketplace-id": "EBAY_US",
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return "";
  return data.image?.imageUrl || data.thumbnailImages?.[0]?.imageUrl || "";
}

async function readSheetProducts(spreadsheet, accessToken) {
  const meta = await googleSheetsGet(`${spreadsheet.id}?fields=sheets(properties(title))`, accessToken);
  const visibleSheetNames = (meta.sheets ?? []).map((sheet) => sheet.properties?.title).filter(Boolean);
  const researchSheetNames = visibleSheetNames.filter((name) => String(name).includes("リサーチ"));
  const sheetNames = researchSheetNames.length ? researchSheetNames : visibleSheetNames.slice(0, 3);
  const allItems = [];

  for (const sheetName of sheetNames) {
    const range = encodeURIComponent(`${sheetName}!A1:AZ${MAX_ROWS_PER_SHEET}`);
    const values = await googleSheetsGet(`${spreadsheet.id}/values/${range}?valueRenderOption=FORMATTED_VALUE`, accessToken);
    const rows = values.values ?? [];
    const headers = rows[0] ?? [];
    const itemIdIndex = columnIndex(headers, ["Item ID", "itemId", "item_id"]);
    const titleIndex = columnIndex(headers, ["商品名", "タイトル", "title"]);
    if (itemIdIndex < 0 || titleIndex < 0) continue;

    const urlIndexes = [
      columnIndex(headers, ["競合販売URL"]),
      columnIndex(headers, ["eBay出品検索"]),
      columnIndex(headers, ["eBay Sold検索"]),
    ].filter((index) => index >= 0);

    const items = rows.slice(1).map((row) => {
      const itemId = itemIdIndex >= 0 ? String(row[itemIdIndex] ?? "").trim() : "";
      return {
        itemId,
        title: titleIndex >= 0 ? String(row[titleIndex] ?? "").trim() : "",
        listingUrl: ebayItemUrl(itemId) || findUrl(row, urlIndexes),
      };
    }).filter((item) => item.itemId || item.listingUrl);

    allItems.push(...items);
  }

  return allItems;
}

async function main() {
  const accessToken = await getAccessToken();
  const ebayAccessToken = await getEbayAccessToken();
  const cache = await readFile(OUTPUT_PATH, "utf8")
    .then((text) => JSON.parse(text))
    .catch(() => ({}));
  let scanned = 0;
  let resolved = 0;
  const skipped = [];

  for (const spreadsheet of spreadsheets) {
    console.log(`Reading ${spreadsheet.title}`);
    let items = [];
    try {
      items = await readSheetProducts(spreadsheet, accessToken);
    } catch (error) {
      skipped.push({ title: spreadsheet.title, id: spreadsheet.id, error: error instanceof Error ? error.message : String(error) });
      console.warn(`Skipped ${spreadsheet.title}: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }
    for (const item of items) {
      const key = item.itemId || item.listingUrl;
      if (!key || cache[key]?.thumbnailUrl) continue;
      scanned += 1;
      const thumbnailUrl = await fetchThumbnailFromEbayApi(item.itemId, ebayAccessToken) || await fetchThumbnailUrl(item.listingUrl);
      if (thumbnailUrl) resolved += 1;
      cache[key] = {
        thumbnailUrl,
        listingUrl: item.listingUrl,
        title: item.title,
        source: spreadsheet.title,
      };
    }
  }

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(cache, null, 2)}\n`);
  console.log(`Saved ${OUTPUT_PATH}`);
  console.log(`Scanned ${scanned} items, resolved ${resolved} thumbnails.`);
  if (skipped.length) {
    console.log(`Skipped ${skipped.length} sheets without readable access.`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
