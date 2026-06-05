import type { BrandData, AdData, AdCreative } from "./types";
import type { ResolvedBrand } from "./resolvers/resolve-page";
import { generateMockData } from "./mock-data";

function isUsableAds(a: AdData): boolean {
  return a.sampledAdsCount > 0 || (a.metrics?.estimatedActiveAdsCount ?? null) !== null;
}

/** Extract the most common landing-page domain from a set of creatives */
function extractPrimaryDomain(creatives: AdCreative[]): string | null {
  const counts = new Map<string, number>();
  for (const c of creatives) {
    if (!c.landingPage) continue;
    try {
      const host = new URL(c.landingPage).hostname.replace(/^www\./, "");
      if (host) counts.set(host, (counts.get(host) ?? 0) + 1);
    } catch { /* skip */ }
  }
  if (counts.size === 0) return null;
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

export function normalizeBrandData(
  resolved: ResolvedBrand,
  adResult: PromiseSettledResult<AdData>
): Omit<BrandData, "ai"> {
  const mockSeed = resolved.pageId ?? resolved.handle;
  const ads =
    adResult.status === "fulfilled" && isUsableAds(adResult.value)
      ? adResult.value
      : generateMockData(mockSeed, resolved.brandName).ads;

  const brandName =
    (adResult.status === "fulfilled" && adResult.value.brandName) ||
    resolved.brandName;

  // Try landing pages from real data, then mock creatives
  const primaryDomain =
    extractPrimaryDomain(ads.creatives) ??
    (adResult.status === "fulfilled"
      ? extractPrimaryDomain(adResult.value.creatives)
      : null);

  const logoUrl = primaryDomain
    ? `https://logo.clearbit.com/${primaryDomain}`
    : null;

  return {
    id: resolved.pageId ?? resolved.handle,
    domain: primaryDomain ?? resolved.handle,
    brandName,
    logoUrl,
    ads,
    analysisStatus: ads.dataSource === "mock" ? "mock" : "complete",
    analyzedAt: new Date().toISOString(),
  };
}
