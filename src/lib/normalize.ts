import type { BrandData, AdData } from "./types";
import { generateMockData } from "./mock-data";

function extractBrandName(domain: string): string {
  return domain
    .replace(/^(www\.)?/, "")
    .split(".")[0]
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function isUsableAds(a: AdData): boolean {
  return a.sampledAdsCount > 0 || (a.metrics?.estimatedActiveAdsCount ?? null) !== null;
}

export function normalizeBrandData(
  identifier: string,       // pageId used as fallback when domain is null
  domain: string | null,
  adResult: PromiseSettledResult<AdData>
): Omit<BrandData, "ai"> {
  const ads =
    adResult.status === "fulfilled" && isUsableAds(adResult.value)
      ? adResult.value
      : generateMockData(domain ?? identifier).ads;

  // Prefer real brand name from scraped data, fall back to domain → pageId
  const brandName =
    (adResult.status === "fulfilled" && adResult.value.brandName) ||
    (domain ? extractBrandName(domain) : identifier);

  const effectiveDomain = domain ?? identifier;

  return {
    id: identifier,
    domain: effectiveDomain,
    brandName,
    logoUrl: domain ? `https://logo.clearbit.com/${domain}` : "",
    ads,
    analysisStatus: ads.dataSource === "mock" ? "mock" : "complete",
    analyzedAt: new Date().toISOString(),
  };
}
