import { NextRequest } from "next/server";
import type { AnalyzeRequest, AnalyzeResponse, BrandData } from "@/lib/types";
import { scrapeMetaAds } from "@/lib/scrapers/meta-ads";
import { scrapeApifyMetaAds } from "@/lib/scrapers/apify-meta-ads";
import { normalizeBrandData } from "@/lib/normalize";
import { mergeEnrichedCount } from "@/lib/enriched-counts";
import { claudeAnalyzeAll } from "@/lib/claude";
import { generateMockData } from "@/lib/mock-data";

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
const USE_APIFY = Boolean(process.env.APIFY_API_TOKEN);

export async function POST(req: NextRequest) {
  const start = Date.now();

  try {
    const body: AnalyzeRequest = await req.json();
    const inputs = (body.brands ?? [])
      .map((b) => ({
        pageId: b.pageId?.trim().replace(/\D/g, "") ?? "",
        domain: b.domain?.trim().toLowerCase().replace(/^https?:\/\/(www\.)?/, "").split("/")[0] || null,
      }))
      .filter((b) => b.pageId.length > 0)
      .slice(0, 5);

    if (inputs.length === 0) {
      return Response.json({ error: "No valid Page IDs provided" }, { status: 400 });
    }

    if (DEMO_MODE) {
      const brands = inputs.map((b) => generateMockData(b.domain ?? b.pageId));
      return Response.json({ brands, durationMs: Date.now() - start } satisfies AnalyzeResponse);
    }

    const adResults = await Promise.allSettled(
      inputs.map((b) =>
        USE_APIFY
          ? scrapeApifyMetaAds(b.domain ?? b.pageId, b.pageId)
          : scrapeMetaAds(b.domain ?? b.pageId, b.pageId)
      )
    );

    // Enrich each ad result with stored estimated count before normalization
    const enrichedResults = adResults.map((result, i) => {
      if (result.status !== "fulfilled") return result;
      return { status: "fulfilled" as const, value: mergeEnrichedCount(inputs[i].pageId, result.value) };
    });

    const rawBrands = inputs.map((input, i) =>
      normalizeBrandData(input.pageId, input.domain, enrichedResults[i])
    );

    let aiResults;
    try {
      aiResults = await claudeAnalyzeAll(rawBrands);
    } catch (err) {
      console.error("Gemini analysis failed, using mock AI:", err);
      aiResults = rawBrands.map((b) => generateMockData(b.id).ai);
    }

    const brands: BrandData[] = rawBrands.map((raw, i) => ({
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
