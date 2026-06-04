import type { AdData } from "../types";
import { parseMetaAds } from "../parsers/parse-meta-ads";

const FIRECRAWL_API = "https://api.firecrawl.dev/v1/scrape";

function domainToBrandName(domain: string): string {
  return domain
    .replace(/^(www\.)?/, "")
    .split(".")[0]
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function scrapeMetaAds(domain: string, pageId?: string | null): Promise<AdData> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error("FIRECRAWL_API_KEY not set");

  const brandName = domainToBrandName(domain);
  // page_id URL returns only that brand's ads; keyword search has noise from third-party advertisers
  const url = pageId
    ? `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&view_all_page_id=${pageId}`
    : `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&q=${encodeURIComponent(brandName)}&search_type=keyword_exact_phrase`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);

  try {
    const res = await fetch(FIRECRAWL_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
        onlyMainContent: false,
        actions: [
          { type: "wait", milliseconds: 5000 },
          { type: "scroll", direction: "down", amount: 2000 },
          { type: "wait", milliseconds: 2000 },
          { type: "scroll", direction: "down", amount: 2000 },
          { type: "wait", milliseconds: 2000 },
          { type: "scroll", direction: "down", amount: 2000 },
          { type: "wait", milliseconds: 2000 },
          { type: "scroll", direction: "down", amount: 2000 },
          { type: "wait", milliseconds: 1500 },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) throw new Error(`Firecrawl error: ${res.status}`);

    const json = await res.json();
    const markdown: string = json?.data?.markdown ?? "";
    if (!markdown) throw new Error("Empty markdown from Firecrawl");

    return parseMetaAds(domain, brandName, markdown);
  } finally {
    clearTimeout(timeout);
  }
}
