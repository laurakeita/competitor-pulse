/**
 * Development-only enrichment script.
 * Fetches estimated_total_count from Meta Ad Library via the MCP server
 * and writes results to data/enriched-counts.json.
 *
 * Usage:
 *   npx tsx scripts/enrich-meta-counts.ts
 *   npx tsx scripts/enrich-meta-counts.ts --pageId 15087023444 --brand Nike
 *
 * Requires FACEBOOK_ACCESS_TOKEN in .env.local (the Claude Code MCP token).
 * The token is used via MCP protocol (not direct Graph API), so it remains valid.
 */

import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const COUNTS_PATH = path.resolve(__dirname, "../data/enriched-counts.json");
const MCP_URL = "https://mcp.facebook.com/ads";

// Default brands to enrich when no CLI args given
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

interface AdsLibraryResult {
  estimated_total_count?: number;
  ads?: unknown[];
}

async function callMcpAdsLibrarySearch(
  pageId: string,
  token: string
): Promise<number | null> {
  // Call via MCP Streamable HTTP transport (JSON-RPC 2.0)
  const body = {
    jsonrpc: "2.0",
    method: "tools/call",
    params: {
      name: "ads_library_search",
      arguments: {
        page_ids: [pageId],
        ad_active_status: "ACTIVE",
        limit: 1,
      },
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
    throw new Error(`Network error calling MCP server: ${err}`);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`MCP server returned ${res.status}: ${text}`);
  }

  const contentType = res.headers.get("content-type") ?? "";

  // Streamable HTTP: plain JSON response
  if (contentType.includes("application/json")) {
    const json = (await res.json()) as { result?: McpToolResult };
    return extractCount(json.result);
  }

  // SSE response — read until we find the result event
  if (contentType.includes("text/event-stream")) {
    const text = await res.text();
    for (const line of text.split("\n")) {
      if (!line.startsWith("data:")) continue;
      try {
        const event = JSON.parse(line.slice(5).trim()) as { result?: McpToolResult };
        const count = extractCount(event.result);
        if (count !== null) return count;
      } catch {
        // skip non-JSON lines
      }
    }
    return null;
  }

  throw new Error(`Unexpected content-type from MCP server: ${contentType}`);
}

function extractCount(result: McpToolResult | undefined): number | null {
  if (!result) return null;

  // MCP tool returns content array with JSON text
  const textContent = result.content?.find((c) => c.type === "text")?.text;
  if (textContent) {
    try {
      const parsed = JSON.parse(textContent) as AdsLibraryResult;
      if (typeof parsed.estimated_total_count === "number") {
        return parsed.estimated_total_count;
      }
    } catch {
      // fall through
    }
  }

  return null;
}

function loadCounts(): Record<string, unknown> {
  try {
    return JSON.parse(fs.readFileSync(COUNTS_PATH, "utf8")) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function saveCounts(counts: Record<string, unknown>): void {
  fs.mkdirSync(path.dirname(COUNTS_PATH), { recursive: true });
  fs.writeFileSync(COUNTS_PATH, JSON.stringify(counts, null, 2) + "\n");
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

async function main() {
  const token = process.env.FACEBOOK_ACCESS_TOKEN;
  if (!token) {
    console.error("❌  FACEBOOK_ACCESS_TOKEN not set in .env.local");
    process.exit(1);
  }

  const cliTarget = parseCLIArgs();
  const brands = cliTarget ? [cliTarget] : DEFAULT_BRANDS;
  const counts = loadCounts();

  console.log(`\nEnriching ${brands.length} brand(s) via Meta MCP...\n`);

  for (const brand of brands) {
    process.stdout.write(`  ${brand.brandName} (${brand.pageId}) ... `);
    try {
      const count = await callMcpAdsLibrarySearch(brand.pageId, token);
      if (count === null) {
        console.log("⚠️  count not found in response");
        continue;
      }
      counts[brand.pageId] = {
        pageId: brand.pageId,
        brandName: brand.brandName,
        estimatedActiveAdsCount: count,
        countSource: "mcp_graph_api",
        countUpdatedAt: new Date().toISOString(),
      };
      console.log(`✅  ${count.toLocaleString()} active ads`);
    } catch (err) {
      console.log(`❌  ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  saveCounts(counts);
  console.log(`\nSaved to ${path.relative(process.cwd(), COUNTS_PATH)}\n`);
}

main();
