export interface AdCreative {
  libraryId: string;
  advertiserName: string;
  adCopy: string;
  imageUrl: string | null;
  adLibraryUrl?: string;
  startDate: string | null;
  landingPage: string | null;
  format: "video" | "image" | "carousel" | "unknown";
  platforms: string[];
  dataSource: "firecrawl" | "apify" | "mock";
}

/**
 * Metrics from two country-filtered MCP calls, stored at dev-time via `npm run enrich`.
 *
 * estimatedActiveAdsCount — true full-inventory count (limit=1, reads estimated_total_count).
 * newAds10d / avgRunningDays / videoRatio — derived from the 50-ad recency sample
 *   (limit=50, sort=creation_time_desc). These are sample-based approximations,
 *   not full-inventory figures.
 */
export interface BrandMetrics {
  estimatedActiveAdsCount: number | null;
  /** ISO-2 country code this count was fetched for, e.g. "TW" */
  country: string | null;
  countSource: "mcp_graph_api" | "apify_sample" | "unavailable";
  countUpdatedAt: string | null;
  /** Ads whose delivery start date falls within the last 10 days */
  newAds10d: number | null;
  /** Mean days-since-start across the MCP recency sample */
  avgRunningDays: number | null;
  /** 0–100 percentage of video ads in the MCP recency sample; null if format unavailable */
  videoRatio: number | null;
}

export interface AdData {
  domain: string;
  brandName: string;
  /** MCP/Graph API sourced metrics — null until `npm run enrich` has been run for this brand */
  metrics: BrandMetrics | null;
  /** Number of creatives in the Apify impression-ranked sample */
  sampledAdsCount: number;
  creatives: AdCreative[];
  dataSource: "firecrawl" | "apify" | "mock";
}

export interface AiAnalysis {
  adSummaryBullets: string[];
  adSentimentTags: string[];
  messagingPillars: string[];
}

export interface BrandData {
  id: string;
  domain: string;
  brandName: string;
  logoUrl: string | null;
  ads: AdData;
  ai: AiAnalysis;
  analysisStatus: "complete" | "mock";
  analyzedAt: string;
}

export type AnalysisStage =
  | "idle"
  | "fetching-ads"
  | "ai-analysis"
  | "building-report"
  | "complete"
  | "error";

export interface AnalysisState {
  stage: AnalysisStage;
  brands: BrandData[];
  error: string | null;
}

export interface BrandInput {
  /** Full Facebook page URL or raw handle. e.g. "https://www.facebook.com/LancomeTW/" */
  facebookPageUrl: string;
  /** Optional display name override. If omitted, resolved from cache or handle. */
  brandName?: string;
}

export interface AnalyzeRequest {
  brands: BrandInput[];
  /** ISO-2 country code for Ads Library filtering. Defaults to "TW". */
  countryCode?: string;
}

export interface AnalyzeResponse {
  brands: BrandData[];
  durationMs: number;
}
