import type { AdData, BrandMetrics, WeeklyLaunchData, BurstStatus } from "./types";

interface StoredEntry {
  pageId: string;
  brandName: string;
  estimatedActiveAdsCount: number | null;
  countSource: "mcp_graph_api" | "apify_sample" | "unavailable";
  countUpdatedAt: string | null;
  newAds20d?: number | null;
  avgRunningDays?: number | null;
  videoRatio?: number | null;
  weeklyLaunches?: WeeklyLaunchData[];
  currentWeekLaunches?: number | null;
  fourWeekAvgLaunches?: number | null;
  burstStatus?: BurstStatus | null;
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

export function mergeMetrics(pageId: string, ads: AdData): AdData {
  const file = loadMetrics();
  const entry = file[pageId];
  if (!entry) return ads;

  const metrics: BrandMetrics = {
    estimatedActiveAdsCount: entry.estimatedActiveAdsCount,
    countSource: entry.countSource,
    countUpdatedAt: entry.countUpdatedAt,
    newAds20d: entry.newAds20d ?? null,
    avgRunningDays: entry.avgRunningDays ?? null,
    videoRatio: entry.videoRatio ?? null,
    weeklyLaunches: entry.weeklyLaunches ?? [],
    currentWeekLaunches: entry.currentWeekLaunches ?? null,
    fourWeekAvgLaunches: entry.fourWeekAvgLaunches ?? null,
    burstStatus: entry.burstStatus ?? null,
  };

  return { ...ads, metrics };
}
