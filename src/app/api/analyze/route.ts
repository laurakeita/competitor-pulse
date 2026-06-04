import { NextRequest } from "next/server";
import type { AnalyzeRequest, AnalyzeResponse } from "@/lib/types";
import { resolveBrand } from "@/lib/resolvers/resolve-page";
import { scrapeApifyMetaAds } from "@/lib/scrapers/apify-meta-ads";
import { normalizeBrandData } from "@/lib/normalize";
import { mergeMetrics } from "@/lib/enriched-counts";
import { claudeAnalyzeAll } from "@/lib/claude";
import { generateMockData } from "@/lib/mock-data";

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
const USE_APIFY = Boolean(process.env.APIFY_API_TOKEN);
const DEFAULT_COUNTRY = "TW";

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

    const adResults = await Promise.allSettled(
      inputs.map((b) => scrapeApifyMetaAds(b.brandName, b.pageUrl, countryCode))
    );

    // Enrich with MCP-sourced metrics (uses pageId; skipped if handle not in cache)
    const enrichedResults = adResults.map((result, i) => {
      if (result.status !== "fulfilled") return result;
      const pageId = inputs[i].pageId;
      if (!pageId) return result;
      return { status: "fulfilled" as const, value: mergeMetrics(pageId, result.value) };
    });

    const rawBrands = inputs.map((resolved, i) =>
      normalizeBrandData(resolved, enrichedResults[i])
    );

    let aiResults;
    try {
      aiResults = await claudeAnalyzeAll(rawBrands);
    } catch (err) {
      console.error("Gemini analysis failed, using mock AI:", err);
      aiResults = rawBrands.map((b) => generateMockData(b.id).ai);
    }

    const brands = rawBrands.map((raw, i) => ({
      ...raw,
      ai: aiResults[i],
      analyzedAt: new Date().toISOString(),
    }));

    return Response.json({ brands, durationMs: Date.now() - start } satisfies AnalyzeResponse);
  } catch (err) {
    console.error("Analysis error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Analysis failed" },
      { status: 500 }
    );
  }
}
