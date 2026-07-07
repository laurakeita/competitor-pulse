import { NextRequest } from "next/server";
import type { AnalyzeRequest, AnalyzeResponse, BrandData, BrandMetrics } from "@/lib/types";
import { resolveBrand } from "@/lib/resolvers/resolve-page";
import { scrapeApifyMetaAds } from "@/lib/scrapers/apify-meta-ads";
import { normalizeBrandData } from "@/lib/normalize";
import { mergeMetrics } from "@/lib/enriched-counts";
import { claudeAnalyzeAll } from "@/lib/claude";
import { generateMockData } from "@/lib/mock-data";

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
const USE_APIFY = Boolean(process.env.APIFY_API_TOKEN);
const DEFAULT_COUNTRY = "TW";

// Per-instance cache so repeat analyses of the same brand skip the Apify run
// (~$0.04 and 30–300s each) and the Gemini call. Only fully-analyzed brands
// are cached; mock fallbacks are not, so a failed scrape retries next time.
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const brandCache = new Map<string, { brand: BrandData; cachedAt: number }>();

function cacheKey(handle: string, countryCode: string): string {
  return `${handle.toLowerCase()}|${countryCode}`;
}

function getCachedBrand(key: string): BrandData | null {
  const hit = brandCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.cachedAt > CACHE_TTL_MS) {
    brandCache.delete(key);
    return null;
  }
  return hit.brand;
}

export async function POST(req: NextRequest) {
  const start = Date.now();

  try {
    const body: AnalyzeRequest = await req.json();

    // Resolve each brand URL → { pageUrl, pageId, brandName, handle }
    const inputs = (body.brands ?? [])
      .map((b) => resolveBrand(b))
      .filter((b): b is NonNullable<typeof b> => b !== null)
      .slice(0, 5);

    if (inputs.length === 0) {
      return Response.json({ error: "No valid Facebook page URLs provided" }, { status: 400 });
    }

    // Demo mode: env flag OR no API token → return mock data
    if (DEMO_MODE || !USE_APIFY) {
      const brands = inputs.map((b) =>
        generateMockData(b.pageId ?? b.handle, b.brandName)
      );
      return Response.json({ brands, durationMs: Date.now() - start } satisfies AnalyzeResponse);
    }

    const countryCode = (body.countryCode ?? DEFAULT_COUNTRY).toUpperCase().slice(0, 2);

    const cached = inputs.map((b) => getCachedBrand(cacheKey(b.handle, countryCode)));
    const misses = inputs.filter((_, i) => cached[i] === null);

    let freshBrands: BrandData[] = [];
    if (misses.length > 0) {
      const adResults = await Promise.allSettled(
        misses.map((b) => scrapeApifyMetaAds(b.brandName, b.pageUrl, countryCode))
      );

      // Enrich with MCP-sourced metrics (uses pageId; skipped if handle not in cache)
      const enrichedResults = adResults.map((result, i) => {
        if (result.status !== "fulfilled") return result;
        const pageId = misses[i].pageId;
        const withMcp = pageId ? mergeMetrics(pageId, countryCode, result.value) : result.value;

        // videoRatio is Apify-derived (MCP ads_library_search returns no
        // media_type / creative_type), so compute it whether or not this
        // brand has MCP metrics from `npm run enrich`.
        const creatives = withMcp.creatives;
        const knownFmt = creatives.filter((c) => c.format !== "unknown").length;
        const videoCnt = creatives.filter((c) => c.format === "video").length;
        const videoRatio = knownFmt > 0 ? Math.round((videoCnt / knownFmt) * 100) : null;

        const metrics: BrandMetrics = withMcp.metrics
          ? { ...withMcp.metrics, videoRatio }
          : {
              estimatedActiveAdsCount: null,
              country: countryCode,
              countSource: "unavailable",
              countUpdatedAt: null,
              newAds10d: null,
              avgRunningDays: null,
              videoRatio,
            };

        return { status: "fulfilled" as const, value: { ...withMcp, metrics } };
      });

      const rawBrands = misses.map((resolved, i) =>
        normalizeBrandData(resolved, enrichedResults[i])
      );

      let aiResults;
      try {
        aiResults = await claudeAnalyzeAll(rawBrands);
      } catch (err) {
        console.error("Gemini analysis failed, using mock AI:", err);
        aiResults = rawBrands.map((b) => generateMockData(b.id).ai);
      }

      freshBrands = rawBrands.map((raw, i) => ({
        ...raw,
        ai: aiResults[i],
        analyzedAt: new Date().toISOString(),
      }));

      freshBrands.forEach((brand, i) => {
        if (brand.analysisStatus === "complete") {
          brandCache.set(cacheKey(misses[i].handle, countryCode), {
            brand,
            cachedAt: Date.now(),
          });
        }
      });
    }

    // Reassemble in the original request order
    let freshIdx = 0;
    const brands = inputs.map((_, i) => cached[i] ?? freshBrands[freshIdx++]);

    return Response.json({ brands, durationMs: Date.now() - start } satisfies AnalyzeResponse);
  } catch (err) {
    console.error("Analysis error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Analysis failed" },
      { status: 500 }
    );
  }
}
