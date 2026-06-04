import { ApifyClient } from "apify-client";
import type { AdData, AdCreative } from "../types";

// curious_coder/facebook-ads-library-scraper (XtaWFhbtfxyzqrFmd)
const ACTOR_ID = process.env.APIFY_ACTOR_ID ?? "XtaWFhbtfxyzqrFmd";

interface SnapshotCard {
  body?: string;
  title?: string;
  link_url?: string;
  original_image_url?: string;
  resized_image_url?: string;
  video_hd_url?: string | null;
  video_sd_url?: string | null;
  video_preview_image_url?: string | null;
}

interface ApifyAdItem {
  ad_archive_id?: string;
  ad_library_url?: string;
  page_name?: string;
  page_id?: string;
  start_date?: number | string | null;
  start_date_formatted?: string | null;
  publisher_platform?: string[];
  snapshot?: {
    display_format?: string;
    title?: string;
    caption?: string;
    link_url?: string;
    body?: { text?: string };
    images?: Array<{ original_image_url?: string; resized_image_url?: string }>;
    videos?: Array<{
      video_hd_url?: string;
      video_sd_url?: string;
      video_preview_image_url?: string;
    }>;
    cards?: SnapshotCard[];
  };
}

function extractAdCopy(item: ApifyAdItem): string {
  const bodyText = item.snapshot?.body?.text;
  if (bodyText) return bodyText;
  const firstCard = item.snapshot?.cards?.[0];
  return firstCard?.body ?? firstCard?.title ?? item.snapshot?.title ?? item.snapshot?.caption ?? "";
}

function extractImageUrl(item: ApifyAdItem): string | null {
  const snap = item.snapshot;
  if (!snap) return null;

  // Prefer video thumbnail if it's a video ad
  const firstCard = snap.cards?.[0];
  if (firstCard?.video_preview_image_url) return firstCard.video_preview_image_url;

  // Standard image from snapshot.images
  if (snap.images?.length) {
    return snap.images[0].original_image_url ?? snap.images[0].resized_image_url ?? null;
  }

  // Image from first card (DPA / carousel)
  if (firstCard?.original_image_url) return firstCard.original_image_url;
  if (firstCard?.resized_image_url) return firstCard.resized_image_url;

  // Video thumbnail from snapshot.videos
  if (snap.videos?.length) return snap.videos[0].video_preview_image_url ?? null;

  return null;
}

function detectFormat(item: ApifyAdItem): "video" | "image" | "carousel" | "unknown" {
  const snap = item.snapshot;
  if (!snap) return "unknown";

  // Check for video content
  const hasVideo =
    snap.videos?.some((v) => v.video_hd_url || v.video_sd_url) ||
    snap.cards?.some((c) => c.video_hd_url || c.video_sd_url);
  if (hasVideo) return "video";

  const cardCount = snap.cards?.length ?? 0;
  const imageCount = snap.images?.length ?? 0;

  if (cardCount >= 2) return "carousel";
  if (cardCount === 1 || imageCount >= 1) return "image";
  return "unknown";
}

function parseStartDate(item: ApifyAdItem): string | null {
  // Prefer the formatted string from the actor
  if (item.start_date_formatted) return item.start_date_formatted.split(" ")[0];

  const raw = item.start_date;
  if (!raw) return null;
  if (typeof raw === "number") return new Date(raw * 1000).toISOString().split("T")[0];
  return String(raw).split("T")[0];
}

function extractLandingPage(item: ApifyAdItem): string | null {
  return (
    item.snapshot?.link_url ??
    item.snapshot?.cards?.[0]?.link_url ??
    null
  );
}

function extractPlatforms(item: ApifyAdItem): string[] {
  const platforms = item.publisher_platform;
  if (platforms?.length) return platforms.map((p) => p.toLowerCase());
  return ["facebook", "instagram"];
}

function domainToBrandName(domain: string): string {
  return domain
    .replace(/^(www\.)?/, "")
    .split(".")[0]
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function scrapeApifyMetaAds(
  domain: string,
  pageId: string
): Promise<AdData> {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) throw new Error("APIFY_API_TOKEN not set");

  const client = new ApifyClient({ token });

  // facebook.com/{pageId}/ works for both numeric IDs and usernames.
  // view_all_page_id Ads Library URLs silently fail for many pages (e.g. Adidas).
  const adLibraryUrl = `https://www.facebook.com/${pageId}/`;

  const run = await client.actor(ACTOR_ID).call(
    {
      urls: [{ url: adLibraryUrl }],
      limitPerSource: 200,
      scrapePageAds: {
        activeStatus: "active",
        countryCode: "US",
        sortBy: "impressions_desc",
      },
    },
    { waitSecs: 300 }
  );

  const { items } = await client
    .dataset(run.defaultDatasetId)
    .listItems({ limit: 200 });

  const adItems = items as ApifyAdItem[];

  const brandName =
    adItems.find((i) => i.page_name)?.page_name ?? domainToBrandName(domain);

  const creatives: AdCreative[] = adItems
    .filter((item) => item.ad_archive_id)
    .map((item) => ({
      libraryId: item.ad_archive_id!,
      advertiserName: item.page_name ?? brandName,
      adCopy: extractAdCopy(item),
      imageUrl: extractImageUrl(item),
      adLibraryUrl: item.ad_library_url ?? `https://www.facebook.com/ads/library/?id=${item.ad_archive_id}`,
      startDate: parseStartDate(item),
      landingPage: extractLandingPage(item),
      format: detectFormat(item),
      platforms: extractPlatforms(item),
      dataSource: "apify" as const,
    }));

  return {
    domain,
    brandName,
    totalActiveAds: creatives.length,
    creatives,
    dataSource: "apify",
  };
}
