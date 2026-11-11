import { parsePlantoes } from "./parse";
import type { Env, SheetData } from "./types";

const CACHE_KEY = "planilha";

export async function getSheet(
  env: Env,
  ctx: ExecutionContext,
): Promise<{ data: SheetData; hit: boolean }> {
  const cached = await env.CACHE.get<SheetData>(CACHE_KEY, "json");
  // entradas de versões antigas (sem "items") são ignoradas e buscadas de novo
  if (cached?.items) return { data: cached, hit: true };

  const data = await fetchSheet(env);
  ctx.waitUntil(saveCache(env, data));
  return { data, hit: false };
}

export function clearSheetCache(env: Env): Promise<void> {
  return env.CACHE.delete(CACHE_KEY);
}

async function fetchSheet(env: Env): Promise<SheetData> {
  const api =
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(env.SHEET_ID)}` +
    `/values/${encodeURIComponent(env.SHEET_RANGE)}` +
    `?key=${encodeURIComponent(env.GOOGLE_API_KEY)}`;

  const res = await fetch(api);
  if (!res.ok) {
    throw new Error(`Google Sheets API respondeu ${res.status}`);
  }

  const raw = (await res.json()) as { range: string; values?: string[][] };
  const [header = [], ...rows] = raw.values ?? [];

  return {
    items: parsePlantoes(header, rows),
    range: raw.range,
    updatedAt: new Date().toISOString(),
  };
}

async function saveCache(env: Env, data: SheetData): Promise<void> {
  const ttl = Math.max(60, Number(env.CACHE_TTL) || 3600);
  await env.CACHE.put(CACHE_KEY, JSON.stringify(data), { expirationTtl: ttl });
}
