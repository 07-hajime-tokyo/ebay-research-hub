import { readFileSync } from "node:fs";

let localEnvLoaded = false;

function loadLocalEnvFallback() {
  if (localEnvLoaded) return;
  localEnvLoaded = true;

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return;

  const text = (() => {
    try {
      return readFileSync("../youtube-production-hub-main/.env.local", "utf8");
    } catch {
      return "";
    }
  })();

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

export function getSupabasePublicConfig() {
  loadLocalEnvFallback();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return {
    url,
    anonKey,
    configured: Boolean(url && anonKey),
  };
}

export function getSupabaseServiceConfig() {
  loadLocalEnvFallback();
  const { url } = getSupabasePublicConfig();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.PROJECT_SUPABASE_SERVICE_ROLE_KEY;
  return {
    url,
    serviceRoleKey,
    configured: Boolean(url && serviceRoleKey),
  };
}

export function getAllowedEmails() {
  loadLocalEnvFallback();
  return (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isEmailAllowed(email?: string | null) {
  const allowed = getAllowedEmails();
  if (!email) return false;
  if (allowed.length === 0) return true;
  return allowed.includes(email.toLowerCase());
}

export function isLocalAuthBypassEnabled() {
  loadLocalEnvFallback();
  return process.env.LOCAL_AUTH_BYPASS === "1";
}

export function getBaseUrl() {
  loadLocalEnvFallback();
  const vercelUrl = process.env.VERCEL_URL;
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (vercelUrl ? `https://${vercelUrl}` : undefined) ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined) ||
    "http://localhost:3001"
  );
}
