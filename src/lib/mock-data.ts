import type { BrandData, AdData, AiAnalysis, BrandMetrics } from "./types";

function hashDomain(domain: string): number {
  let h = 0;
  for (let i = 0; i < domain.length; i++) {
    h = (Math.imul(31, h) + domain.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function pick<T>(arr: readonly T[], seed: number): T {
  return arr[seed % arr.length];
}

function range(min: number, max: number, seed: number): number {
  const frac = ((seed * 9301 + 49297) % 233280) / 233280;
  return Math.round(min + frac * (max - min));
}

function extractBrandName(domain: string): string {
  return domain
    .replace(/^(www\.)?/, "")
    .split(".")[0]
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const SENTIMENT_TAG_POOL = [
  "Problem-Solving",
  "Emotional",
  "Offer-Driven",
  "Aspirational",
  "Urgency",
  "Social Proof",
  "Educational",
  "Lifestyle",
  "Trust-Building",
] as const;

const PILLAR_POOL = [
  "Value for Money",
  "Free Shipping",
  "Exclusive Access",
  "Community First",
  "Performance Promise",
  "Sustainability",
  "Limited Time Offer",
  "Social Proof",
  "Expert Endorsement",
] as const;

const AD_COPY_SAMPLES = [
  "Discover a smarter way to shop. Free shipping on orders over $50.",
  "Join 10 million+ customers who trust us for quality products.",
  "Limited time offer: Up to 40% off. Shop the sale now.",
  "Built for performance. Designed for style. Explore our new collection.",
  "Your next adventure starts here. Gear up with confidence.",
  "Exclusive members get early access. Sign up today — it's free.",
  "We've reimagined the everyday. See what's new.",
  "Real results, real people. Read customer stories.",
];

const FORMATS = ["image", "video", "carousel", "unknown"] as const;

export function generateMockData(seed: string, overrideBrandName?: string): BrandData {
  const domain = seed;
  const hashSeed = hashDomain(seed);
  const brandName = overrideBrandName ?? extractBrandName(seed);
  const s1 = hashSeed;
  const s2 = (hashSeed * 1103515245 + 12345) & 0x7fffffff;
  const s3 = (s2 * 1103515245 + 12345) & 0x7fffffff;

  const mockTotal = range(50, 5000, hashSeed);

  const creatives = Array.from({ length: 8 }, (_, i) => ({
    libraryId: `mock_${seed}_${i}`,
    advertiserName: brandName,
    adCopy: pick(AD_COPY_SAMPLES, hashSeed + i),
    imageUrl: null,
    startDate: new Date(Date.now() - range(7, 120, hashSeed + i) * 86400000)
      .toISOString()
      .split("T")[0],
    landingPage: `https://${domain}/offer-${i + 1}`,
    format: pick(FORMATS, hashSeed + i * 3),
    platforms: ["facebook", "instagram"],
    dataSource: "mock" as const,
  }));

  const metrics: BrandMetrics = {
    estimatedActiveAdsCount: mockTotal,
    country: "TW",
    countSource: "mcp_graph_api",
    countUpdatedAt: new Date().toISOString(),
    newAds10d: range(3, 12, hashSeed + 1),
    avgRunningDays: range(14, 60, hashSeed + 2),
    videoRatio: range(25, 70, hashSeed + 3),
  };

  const ads: AdData = {
    domain,
    brandName,
    metrics,
    sampledAdsCount: creatives.length,
    creatives,
    dataSource: "mock",
  };

  const sentimentCount = 2 + (hashSeed % 2);
  const adSentimentTags = Array.from({ length: sentimentCount }, (_, i) =>
    pick(SENTIMENT_TAG_POOL, hashSeed + i * 37)
  );

  const ai: AiAnalysis = {
    adSummaryBullets: [
      `Focuses on ${pick(["value and savings", "performance and quality", "community and belonging", "lifestyle aspiration", "product innovation"], s1)}.`,
      `Targets ${pick(["deal-seeking shoppers", "young professionals aged 25–35", "active lifestyle consumers", "premium buyers", "first-time buyers"], s2)}.`,
      `Uses ${pick(["offer-driven urgency", "social proof and testimonials", "aspirational lifestyle imagery", "problem-solution framing", "exclusivity and early access"], s3)} as the primary creative angle.`,
    ],
    adSentimentTags: [...new Set(adSentimentTags)],
    messagingPillars: [
      pick(PILLAR_POOL, s1),
      pick(PILLAR_POOL, s2 + 3),
      pick(PILLAR_POOL, s3 + 6),
    ],
  };

  return {
    id: domain,
    domain,
    brandName,
    logoUrl: `https://logo.clearbit.com/${domain}`,
    ads,
    ai,
    analysisStatus: "mock",
    analyzedAt: new Date().toISOString(),
  };
}
