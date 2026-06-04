/**
 * Development-only enrichment script.
 *
 * Makes two MCP calls per brand:
 *   1. limit=1 → estimated_total_count (Ad Inventory)
 *   2. limit=50, sort=creation_time_desc → recency sample for Brand Pulse KPIs + Ad Timeline
 *
 * Usage:
 *   npx tsx scripts/enrich-meta-counts.ts
 *   npx tsx scripts/enrich-meta-counts.ts --pageId 15087023444 --brand Nike
 *
 * Requires FACEBOOK_ACCESS_TOKEN in .env.local (the Claude Code MCP token).
 *
 * Note: The 50-ad MCP cap means high-volume brands (>50 new ads/week) will show
 * all sample ads in the current week. burstStatus will be null when the 4-week
 * average is 0. This is expected — increase the limit or paginate to resolve.
 */

import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import type { WeeklyLaunchData, BurstStatus } from "../src/lib/types";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const METRICS_PATH = path.resolve(__dirname, "../data/enriched-counts.json");
const MCP_URL = "https://mcp.facebook.com/ads";

const DEFAULT_BRANDS: Array<{ pageId: string; brandName: string }> = [
  { pageId: "15087023444", brandName: "Nike" },
  { pageId: "182162001806727", brandName: "Adidas" },
  { pageId: "8119826767", brandName: "Puma" },
  { pageId: "1421581734802579", brandName: "New Balance" },
];

interface McpToolResult {
  content?: Array<{ type: string; text?: string }>;
  result?: unknown;
}

interface AdItem {
  ad_delivery_start_time?: number | null;
  /** Some MCP responses include media_type or creative_type for format detection */
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
  newAds20d: number | null;
  avgRunningDays: number | null;
  videoRatio: number | null;
  weeklyLaunches: WeeklyLaunchData[];
  currentWeekLaunches: number | null;
  fourWeekAvgLaunches: number | null;
  burstStatus: BurstStatus | null;
} {
  const now = todayMidnight();
  const msPerDay = 86_400_000;
  const cutoff20d = new Date(now.getTime() - 20 * msPerDay);

  if (ads.length === 0) {
    return {
      newAds20d: null,
      avgRunningDays: null,
      videoRatio: null,
      weeklyLaunches: [],
      currentWeekLaunches: null,
      fourWeekAvgLaunches: null,
      burstStatus: null,
    };
  }

  let newAds20d = 0;
  const runningDays: number[] = [];
  let videoCount = 0;
  let formatKnown = 0;
  const weekCounts: number[] = Array(8).fill(0);

  for (const ad of ads) {
    const ts = ad.ad_delivery_start_time;
    if (ts == null) continue;

    const startMs = typeof ts === "number" ? ts * 1000 : NaN;
    if (isNaN(startMs)) continue;

    const startDate = new Date(startMs);
    const days = Math.max(0, Math.floor((now.getTime() - startDate.getTime()) / msPerDay));

    if (startDate >= cutoff20d) newAds20d++;
    runningDays.push(days);

    // week bucket: 0 = this week, 1 = last week, ..., 7 = oldest
    const weekIdx = Math.min(7, Math.floor(days / 7));
    weekCounts[weekIdx]++;

    // Format detection — field names vary by MCP version
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

  // Build weekly launch array oldest→newest (chart left→right)
  const weeklyLaunches: WeeklyLaunchData[] = Array.from({ length: 8 }, (_, w) => {
    const daysAgo = (7 - w) * 7;
    const date = new Date(now.getTime() - daysAgo * msPerDay);
    return {
      label: `${date.toLocaleString("en", { month: "short" })} ${date.getDate()}`,
      weekStart: date.toISOString().split("T")[0],
      count: weekCounts[7 - w], // weekCounts[7] = oldest, weekCounts[0] = this week
    };
  });

  const currentWeekLaunches = weekCounts[0];
  const prevFour = [weekCounts[1], weekCounts[2], weekCounts[3], weekCounts[4]];
  const fourWeekAvgLaunches = Math.round(prevFour.reduce((a, b) => a + b, 0) / 4);

  let burstStatus: BurstStatus | null = null;
  if (fourWeekAvgLaunches > 0) {
    const ratio = currentWeekLaunches / fourWeekAvgLaunches;
    if (ratio >= 2) burstStatus = "Surge";
    else if (ratio >= 1.3) burstStatus = "Accelerating";
    else if (ratio >= 0.7) burstStatus = "Steady";
    else burstStatus = "Slowing";
  }

  return {
    newAds20d,
    avgRunningDays,
    videoRatio,
    weeklyLaunches,
    currentWeekLaunches,
    fourWeekAvgLaunches,
    burstStatus,
  };
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

function parseCLIArgs(): { pageId: string; brandName: string } | null {
  const args = process.argv.slice(2);
  const pageIdx = args.indexOf("--pageId");
  const brandIdx = args.indexOf("--brand");
  if (pageIdx !== -1 && args[pageIdx + 1]) {
    return {
      pageId: args[pageIdx + 1],
      brandName: brandIdx !== -1 && args[brandIdx + 1] ? args[brandIdx + 1] : args[pageIdx + 1],
    };
  }
  return null;
}

async function enrichBrand(
  brand: { pageId: string; brandName: string },
  token: string,
  stored: Record<string, unknown>
): Promise<void> {
  process.stdout.write(`  ${brand.brandName} (${brand.pageId})\n`);

  // Call 1: estimated_total_count
  process.stdout.write(`    [1/2] Fetching estimated total count ... `);
  let estimatedCount: number | null = null;
  try {
    const countRes = await callMcp(brand.pageId, token, { limit: 1 });
    estimatedCount = countRes?.estimated_total_count ?? null;
    if (estimatedCount !== null) {
      console.log(`✅  ${estimatedCount.toLocaleString()} active ads`);
    } else {
      console.log("⚠️  count not found");
    }
  } catch (err) {
    console.log(`❌  ${err instanceof Error ? err.message : String(err)}`);
  }

  // Call 2: recency-sorted sample for KPIs + timeline
  process.stdout.write(`    [2/2] Fetching recency sample (limit=50) ... `);
  let derivedMetrics: ReturnType<typeof computeMetrics> = {
    newAds20d: null,
    avgRunningDays: null,
    videoRatio: null,
    weeklyLaunches: [],
    currentWeekLaunches: null,
    fourWeekAvgLaunches: null,
    burstStatus: null,
  };
  try {
    const recencyRes = await callMcp(brand.pageId, token, {
      limit: 50,
      sort_data: "creation_time_desc",
    });
    const ads: AdItem[] = recencyRes?.ads ?? recencyRes?.data ?? [];
    derivedMetrics = computeMetrics(ads);
    console.log(
      `✅  ${ads.length} ads · new20d=${derivedMetrics.newAds20d} · burst=${derivedMetrics.burstStatus ?? "n/a"}`
    );
  } catch (err) {
    console.log(`❌  ${err instanceof Error ? err.message : String(err)}`);
  }

  stored[brand.pageId] = {
    pageId: brand.pageId,
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
