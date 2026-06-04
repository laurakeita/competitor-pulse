import type { AdData, AdCreative } from "../types";

function parseTotalAds(text: string): number | null {
  const m =
    text.match(/~\s*([0-9,]+)\s*results?/i) ??
    text.match(/([0-9,]+)\s*results?\s*found/i) ??
    text.match(/About\s*([0-9,]+)\s*results?/i);
  return m ? parseInt(m[1].replace(/,/g, "")) : null;
}

function normalizeBrand(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function adBelongsToBrand(advertiser: string, brandName: string): boolean {
  const adv = normalizeBrand(advertiser);
  const brand = normalizeBrand(brandName);
  return adv.includes(brand) || brand.includes(adv);
}

function detectFormat(blockLines: string[]): "video" | "image" | "carousel" | "unknown" {
  const blockText = blockLines.join("\n");
  const imageCount = (blockText.match(/!\[/g) ?? []).length;
  const hasVideo =
    /\bvideo\b/i.test(blockText) ||
    blockText.includes("▶") ||
    blockText.includes("Watch") ||
    /\bplay\b/i.test(blockText);

  if (imageCount >= 3) return "carousel";
  if (hasVideo) return "video";
  if (imageCount >= 1) return "image";
  return "unknown";
}

function parseLandingPage(blockLines: string[]): string | null {
  const blockText = blockLines.join("\n");
  // Match markdown links to non-facebook/instagram/meta domains, skip image URLs
  const linkPattern = /\[([^\]]+)\]\((https?:\/\/(?!(?:www\.)?(?:facebook|instagram|meta|fb)\.)[^)]+)\)/g;
  let match;
  while ((match = linkPattern.exec(blockText)) !== null) {
    const url = match[2];
    if (/\.(jpg|jpeg|png|gif|webp|svg|ico)(\?|$)/i.test(url)) continue;
    return url;
  }
  // Fallback: bare https:// links not from facebook/meta
  const barePattern = /https?:\/\/(?!(?:www\.)?(?:facebook|instagram|meta|fb)\.)([^\s"')]+)/g;
  while ((match = barePattern.exec(blockText)) !== null) {
    const url = match[0];
    if (/\.(jpg|jpeg|png|gif|webp|svg|ico)(\?|$)/i.test(url)) continue;
    return url;
  }
  return null;
}

interface AdBlock {
  libraryId: string;
  startDate: string | null;
  advertiserName: string;
  adCopy: string;
  adLibraryUrl: string;
  landingPage: string | null;
  format: "video" | "image" | "carousel" | "unknown";
}

function parseAdBlocks(text: string, brandName: string): AdBlock[] {
  const blocks: AdBlock[] = [];
  const lines = text.split("\n");

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();

    if (line === "Active") {
      const block: Partial<AdBlock> = {};
      let j = i + 1;
      const blockLines: string[] = [];

      while (j < Math.min(i + 120, lines.length)) {
        const l = lines[j].trim();
        blockLines.push(l);

        if (!block.libraryId) {
          const idMatch = l.match(/Library ID:\s*(\d+)/);
          if (idMatch) {
            block.libraryId = idMatch[1];
            block.adLibraryUrl = `https://www.facebook.com/ads/library/?id=${idMatch[1]}`;
          }
        }

        if (!block.startDate) {
          const dateMatch = l.match(/Started running on\s+(.+)/i);
          if (dateMatch) block.startDate = dateMatch[1].trim();
        }

        if (!block.advertiserName) {
          const advMatch = l.match(/^\[([^\]]+)\]\(https:\/\/www\.facebook\.com\/[^)]+\)$/);
          if (advMatch && !advMatch[1].startsWith("!")) {
            block.advertiserName = advMatch[1];
          }
        }

        if (l === "**Sponsored**") {
          for (let k = j + 1; k < Math.min(j + 8, lines.length); k++) {
            const copy = lines[k].trim();
            if (copy.length > 10 && !copy.startsWith("[") && !copy.startsWith("!") && !copy.startsWith("[![")) {
              block.adCopy = copy;
              break;
            }
          }
        }

        if (j > i + 2 && (lines[j].trim() === "Active" || lines[j].trim() === "Inactive")) {
          break;
        }
        j++;
      }

      if (
        block.libraryId &&
        block.advertiserName &&
        adBelongsToBrand(block.advertiserName, brandName)
      ) {
        blocks.push({
          libraryId: block.libraryId,
          startDate: block.startDate ?? null,
          advertiserName: block.advertiserName,
          adCopy: block.adCopy ?? "",
          adLibraryUrl: block.adLibraryUrl!,
          landingPage: parseLandingPage(blockLines),
          format: detectFormat(blockLines),
        });
      }

      i = j;
    } else {
      i++;
    }
  }

  return blocks;
}

export function parseMetaAds(domain: string, brandName: string, markdown: string): AdData {
  const parsedTotal = parseTotalAds(markdown);
  const blocks = parseAdBlocks(markdown, brandName);

  const creatives: AdCreative[] = blocks.map((b) => ({
    libraryId: b.libraryId,
    advertiserName: b.advertiserName,
    adCopy: b.adCopy,
    imageUrl: null,
    adLibraryUrl: b.adLibraryUrl,
    startDate: b.startDate,
    landingPage: b.landingPage,
    format: b.format,
    platforms: ["facebook", "instagram"],
    dataSource: "firecrawl" as const,
  }));

  return {
    domain,
    brandName,
    estimatedActiveAdsCount: parsedTotal,
    sampledAdsCount: creatives.length,
    countSource: parsedTotal !== null ? "mcp_graph_api" : "unavailable",
    countUpdatedAt: parsedTotal !== null ? new Date().toISOString() : null,
    creatives,
    dataSource: creatives.length > 0 ? "firecrawl" : "mock",
  };
}
