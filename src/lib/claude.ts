import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import type { AiAnalysis, BrandData } from "./types";

const SYSTEM_PROMPT = `You are a competitive intelligence analyst specializing in ad creative analysis.

Analyze the provided ad copy samples and output factual observations only.

Rules:
- Base all analysis strictly on the ad copy provided
- Never invent or estimate metrics: no ROAS, CTR, CPC, CPM, revenue, or conversion numbers
- adSummaryBullets: exactly 3 short bullets (max 20 words each) covering what the ads focus on, who they target, and what tone/angle they use
- adSentimentTags: 2–3 tags from: Problem-Solving, Emotional, Offer-Driven, Aspirational, Urgency, Social Proof, Educational, Lifestyle, Trust-Building, FOMO, Community, Exclusivity
- messagingPillars: exactly 3 short phrases (2–5 words each) that summarize recurring themes in the ad copy

Return ONLY valid JSON. No markdown fences, no explanation.`;

interface RawBrandInput {
  domain: string;
  brandName: string;
  estimatedActiveAdsCount: number | null;
  adCopySamples: string[];
}

export async function claudeAnalyzeAll(
  brands: Omit<BrandData, "ai">[]
): Promise<AiAnalysis[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-flash-latest",
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.3,
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          analyses: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                domain: { type: SchemaType.STRING },
                adSummaryBullets: {
                  type: SchemaType.ARRAY,
                  items: { type: SchemaType.STRING },
                },
                adSentimentTags: {
                  type: SchemaType.ARRAY,
                  items: { type: SchemaType.STRING },
                },
                messagingPillars: {
                  type: SchemaType.ARRAY,
                  items: { type: SchemaType.STRING },
                },
              },
              required: ["domain", "adSummaryBullets", "adSentimentTags", "messagingPillars"],
            },
          },
        },
        required: ["analyses"],
      },
    },
  });

  const rawInputs: RawBrandInput[] = brands.map((b) => ({
    domain: b.domain,
    brandName: b.brandName,
    estimatedActiveAdsCount: b.ads.metrics?.estimatedActiveAdsCount ?? null,
    adCopySamples: b.ads.creatives
      .map((c) => c.adCopy)
      .filter(Boolean)
      .slice(0, 10),
  }));

  const prompt = `Analyze the ad creative strategy for ${brands.length} brand(s). Base your analysis only on the ad copy samples provided.

${JSON.stringify(rawInputs, null, 2)}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const parsed = JSON.parse(text) as {
    analyses: (AiAnalysis & { domain: string })[];
  };

  const byDomain = new Map(parsed.analyses.map((a) => [a.domain, a]));

  return brands.map((b) => {
    const a = byDomain.get(b.domain);
    if (!a) throw new Error(`No analysis for ${b.domain}`);
    return {
      adSummaryBullets: (a.adSummaryBullets ?? []).slice(0, 3),
      adSentimentTags: a.adSentimentTags ?? [],
      messagingPillars: (a.messagingPillars ?? []).slice(0, 3),
    };
  });
}
