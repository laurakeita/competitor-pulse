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

export type BurstStatus = "Surge" | "Accelerating" | "Steady" | "Slowing";

export interface WeeklyLaunchData {
  /** Short label shown on chart axis, e.g. "Jun 3" */
  label: string;
  /** ISO date of the Monday starting this week period */
  weekStart: string;
  count: number;
}

/**
 * All inventory and launch-trend metrics sourced from MCP / Graph API.
 * Stored at dev-time via `npm run enrich`; never computed from the Apify sample.
 */
export interface BrandMetrics {
  estimatedActiveAdsCount: number | null;
  countSource: "mcp_graph_api" | "apify_sample" | "unavailable";
  countUpdatedAt: string | null;
  /** Ads whose delivery start date falls within the last 20 days */
  newAds20d: number | null;
  /** Mean days-since-start across the MCP recency sample */
  avgRunningDays: number | null;
  /** 0–100 percentage of video ads in the MCP recency sample; null if format unavailable */
  videoRatio: number | null;
  /** Last 8 weeks of launch counts, oldest first */
  weeklyLaunches: WeeklyLaunchData[];
  currentWeekLaunches: number | null;
  fourWeekAvgLaunches: number | null;
  burstStatus: BurstStatus | null;
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
  logoUrl: string;
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
