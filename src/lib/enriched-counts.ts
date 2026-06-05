import type { AdData, BrandMetrics } from "./types";

interface StoredEntry {
  pageId: string;
  country: string | null;
  brandName: string;
  estimatedActiveAdsCount: number | null;
  countSource: "mcp_graph_api" | "apify_sample" | "unavailable";
  countUpdatedAt: string | null;
  newAds10d?: number | null;
  avgRunningDays?: number | null;
  videoRatio?: number | null;
}

type MetricsFile = Record<string, StoredEntry>;

let cache: MetricsFile | null = null;

function loadMetrics(): MetricsFile {
  if (cache) return cache;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cache = require("../../data/enriched-counts.json") as MetricsFile;
  } catch {
    cache = {};
  }
  return cache;
}

export function mergeMetrics(pageId: string, countryCode: string, ads: AdData): AdData {
  const file = loadMetrics();
  // Try country-specific entry first, then fall back to global (no-country) entry
  const entry = file[`${pageId}_${countryCode}`] ?? file[pageId];
  if (!entry) return ads;

  const metrics: BrandMetrics = {
    estimatedActiveAdsCount: entry.estimatedActiveAdsCount,
    country: entry.country,
    countSource: entry.countSource,
    countUpdatedAt: entry.countUpdatedAt,
    newAds10d: entry.newAds10d ?? null,
    avgRunningDays: entry.avgRunningDays ?? null,
    videoRatio: entry.videoRatio ?? null,
  };

  return { ...ads, metrics };
}
