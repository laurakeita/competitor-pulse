/**
 * Development-only enrichment script.
 *
 * Makes two MCP calls per brand:
 *   1. limit=1, countries=[country] → estimated_total_count (country-filtered Ad Inventory)
 *   2. limit=50, sort=creation_time_desc → recency sample for Brand Pulse KPIs
 *
 * Usage:
 *   npx tsx scripts/enrich-meta-counts.ts
 *   npx tsx scripts/enrich-meta-counts.ts --pageId 156514087702491 --brand "Lancôme Taiwan" --country TW
 *
 * Requires FACEBOOK_ACCESS_TOKEN in .env.local (the Claude Code MCP token).
 *
 * Note: The 50-ad MCP cap means high-volume brands (>50 new ads/10d) will show
 * all sample ads in the current window. This is expected — no pagination available.
 */

import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const METRICS_PATH = path.resolve(__dirname, "../data/enriched-counts.json");
const MCP_URL = "https://mcp.facebook.com/ads";

const DEFAULT_BRANDS: Array<{ pageId: string; brandName: string; country: string }> = [
  { pageId: "188151501215824", brandName: "Estée Lauder Taiwan", country: "TW" },
  { pageId: "156514087702491", brandName: "Lancôme Taiwan", country: "TW" },
];

interface McpToolResult {
  content?: Array<{ type: string; text?: string }>;
  result?: unknown;
}

interface AdItem {
  ad_delivery_start_time?: number | null;
  media_type?: string | null;
  creative_type?: string | null;
}

interface AdsLibraryResponse {
  estimated_total_count?: number;
  ads?: AdItem[];
  data?: AdItem[];
}

async function callMcp(
  pageId: string,
  token: string,
  args: Record<string, unknown>
): Promise<AdsLibraryResponse | null> {
  const body = {
    jsonrpc: "2.0",
    method: "tools/call",
    params: {
      name: "ads_library_search",
      arguments: { page_ids: [pageId], ad_active_status: "ACTIVE", ...args },
    },
    id: 1,
  };

  let res: Response;
  try {
    res = await fetch(MCP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new Error(`Network error calling MCP: ${err}`);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`MCP returned ${res.status}: ${text}`);
  }

  const contentType = res.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const json = (await res.json()) as { result?: McpToolResult };
    return parseToolResult(json.result);
  }

  if (contentType.includes("text/event-stream")) {
    const text = await res.text();
    for (const line of text.split("\n")) {
      if (!line.startsWith("data:")) continue;
      try {
        const event = JSON.parse(line.slice(5).trim()) as { result?: McpToolResult };
        const parsed = parseToolResult(event.result);
        if (parsed) return parsed;
      } catch {
        // skip non-JSON lines
      }
    }
    return null;
  }

  throw new Error(`Unexpected content-type from MCP: ${contentType}`);
}

function parseToolResult(result: McpToolResult | undefined): AdsLibraryResponse | null {
  if (!result) return null;
  const textContent = result.content?.find((c) => c.type === "text")?.text;
  if (textContent) {
    try {
      return JSON.parse(textContent) as AdsLibraryResponse;
    } catch {
      // fall through
    }
  }
  return null;
}

function todayMidnight(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function computeMetrics(ads: AdItem[]): {
  newAds10d: number | null;
  avgRunningDays: number | null;
  videoRatio: number | null;
} {
  const now = todayMidnight();
  const msPerDay = 86_400_000;
  const cutoff10d = new Date(now.getTime() - 10 * msPerDay);

  if (ads.length === 0) {
    return { newAds10d: null, avgRunningDays: null, videoRatio: null };
  }

  let newAds10d = 0;
  const runningDays: number[] = [];
  let videoCount = 0;
  let formatKnown = 0;

  for (const ad of ads) {
    const ts = ad.ad_delivery_start_time;
    if (ts == null) continue;

    const startMs = typeof ts === "number" ? ts * 1000 : NaN;
    if (isNaN(startMs)) continue;

    const startDate = new Date(startMs);
    const days = Math.max(0, Math.floor((now.getTime() - startDate.getTime()) / msPerDay));

    if (startDate >= cutoff10d) newAds10d++;
    runningDays.push(days);

    const fmt = (ad.media_type ?? ad.creative_type ?? "").toUpperCase();
    if (fmt) {
      formatKnown++;
      if (fmt.includes("VIDEO")) videoCount++;
    }
  }

  const avgRunningDays =
    runningDays.length > 0
      ? Math.round(runningDays.reduce((a, b) => a + b, 0) / runningDays.length)
      : null;

  const videoRatio = formatKnown > 0 ? Math.round((videoCount / formatKnown) * 100) : null;

  return { newAds10d, avgRunningDays, videoRatio };
}

function loadMetrics(): Record<string, unknown> {
  try {
    return JSON.parse(fs.readFileSync(METRICS_PATH, "utf8")) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function saveMetrics(metrics: Record<string, unknown>): void {
  fs.mkdirSync(path.dirname(METRICS_PATH), { recursive: true });
  fs.writeFileSync(METRICS_PATH, JSON.stringify(metrics, null, 2) + "\n");
}

function parseCLIArgs(): { pageId: string; brandName: string; country: string } | null {
  const args = process.argv.slice(2);
  const pageIdx = args.indexOf("--pageId");
  const brandIdx = args.indexOf("--brand");
  const countryIdx = args.indexOf("--country");
  if (pageIdx !== -1 && args[pageIdx + 1]) {
    return {
      pageId: args[pageIdx + 1],
      brandName: brandIdx !== -1 && args[brandIdx + 1] ? args[brandIdx + 1] : args[pageIdx + 1],
      country: countryIdx !== -1 && args[countryIdx + 1] ? args[countryIdx + 1].toUpperCase() : "TW",
    };
  }
  return null;
}

async function enrichBrand(
  brand: { pageId: string; brandName: string; country: string },
  token: string,
  stored: Record<string, unknown>
): Promise<void> {
  process.stdout.write(`  ${brand.brandName} (${brand.pageId}) [${brand.country}]\n`);

  // Call 1: country-filtered estimated_total_count
  process.stdout.write(`    [1/2] Fetching estimated total count (${brand.country}) ... `);
  let estimatedCount: number | null = null;
  try {
    const countRes = await callMcp(brand.pageId, token, {
      limit: 1,
      countries: [brand.country],
    });
    estimatedCount = countRes?.estimated_total_count ?? null;
    if (estimatedCount !== null) {
      console.log(`✅  ${estimatedCount.toLocaleString()} active ads`);
    } else {
      console.log("⚠️  count not found");
    }
  } catch (err) {
    console.log(`❌  ${err instanceof Error ? err.message : String(err)}`);
  }

  // Call 2: country-filtered recency sample for KPIs
  process.stdout.write(`    [2/2] Fetching recency sample (${brand.country}, limit=50) ... `);
  let derivedMetrics = { newAds10d: null as number | null, avgRunningDays: null as number | null, videoRatio: null as number | null };
  try {
    const recencyRes = await callMcp(brand.pageId, token, {
      limit: 50,
      countries: [brand.country],
      sort_data: "creation_time_desc",
    });
    const ads: AdItem[] = recencyRes?.ads ?? recencyRes?.data ?? [];
    derivedMetrics = computeMetrics(ads);
    console.log(
      `✅  ${ads.length} ads · new10d=${derivedMetrics.newAds10d}`
    );
  } catch (err) {
    console.log(`❌  ${err instanceof Error ? err.message : String(err)}`);
  }

  // Store under country-specific key
  const key = `${brand.pageId}_${brand.country}`;
  stored[key] = {
    pageId: brand.pageId,
    country: brand.country,
    brandName: brand.brandName,
    estimatedActiveAdsCount: estimatedCount,
    countSource: "mcp_graph_api",
    countUpdatedAt: new Date().toISOString(),
    ...derivedMetrics,
  };
}

async function main() {
  const token = process.env.FACEBOOK_ACCESS_TOKEN;
  if (!token) {
    console.error("❌  FACEBOOK_ACCESS_TOKEN not set in .env.local");
    process.exit(1);
  }

  const cliTarget = parseCLIArgs();
  const brands = cliTarget ? [cliTarget] : DEFAULT_BRANDS;
  const stored = loadMetrics();

  console.log(`\nEnriching ${brands.length} brand(s) via Meta MCP...\n`);

  for (const brand of brands) {
    await enrichBrand(brand, token, stored);
    console.log();
  }

  saveMetrics(stored);
  console.log(`Saved to ${path.relative(process.cwd(), METRICS_PATH)}\n`);
}

main();
