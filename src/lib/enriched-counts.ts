import type { AdData } from "./types";

interface EnrichedEntry {
  pageId: string;
  brandName: string;
  estimatedActiveAdsCount: number;
  countSource: "mcp_graph_api";
  countUpdatedAt: string;
}

type EnrichedCountsFile = Record<string, EnrichedEntry>;

let cache: EnrichedCountsFile | null = null;

function loadCounts(): EnrichedCountsFile {
  if (cache) return cache;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cache = require("../../data/enriched-counts.json") as EnrichedCountsFile;
  } catch {
    cache = {};
  }
  return cache;
}

export function mergeEnrichedCount(pageId: string, ads: AdData): AdData {
  const counts = loadCounts();
  const entry = counts[pageId];
  if (!entry) return ads;
  return {
    ...ads,
    estimatedActiveAdsCount: entry.estimatedActiveAdsCount,
    countSource: entry.countSource,
    countUpdatedAt: entry.countUpdatedAt,
  };
}
