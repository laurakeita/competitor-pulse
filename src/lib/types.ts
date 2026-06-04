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

export interface AdData {
  domain: string;
  brandName: string;
  totalActiveAds: number | null;
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
  pageId: string;
  domain: string | null; // optional, used only for logo + brand name display
}

export interface AnalyzeRequest {
  brands: BrandInput[];
}

export interface AnalyzeResponse {
  brands: BrandData[];
  durationMs: number;
}
