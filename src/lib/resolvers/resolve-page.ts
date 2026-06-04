import type { BrandInput } from "../types";

interface CacheEntry {
  pageId: string;
  brandName: string;
  resolvedAt: string;
}

type PageIdCache = Record<string, CacheEntry>;

let cacheStore: PageIdCache | null = null;

function loadCache(): PageIdCache {
  if (cacheStore) return cacheStore;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cacheStore = require("../../../data/page-id-cache.json") as PageIdCache;
  } catch {
    cacheStore = {};
  }
  return cacheStore;
}

/**
 * Extract the raw handle or numeric ID from any Facebook page URL or bare string.
 *
 * Accepted formats:
 *   https://www.facebook.com/LancomeTW/        → "LancomeTW"
 *   https://facebook.com/esteelaudertw         → "esteelaudertw"
 *   https://www.facebook.com/profile.php?id=123 → "123"
 *   15087023444                                 → "15087023444"
 *   LancomeTW                                   → "LancomeTW"
 */
export function parseFacebookUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";

  // Raw numeric ID
  if (/^\d+$/.test(trimmed)) return trimmed;

  // profile.php?id= format
  const phpMatch = trimmed.match(/profile\.php\?id=(\d+)/);
  if (phpMatch) return phpMatch[1];

  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    const parts = url.pathname.split("/").filter(Boolean);
    // /people/Name/NUMERIC_ID/ format
    if (parts[0] === "people" && parts.length >= 3) return parts[2];
    // Standard /{handle}/ — skip generic Facebook paths
    if (parts.length > 0 && !["ads", "pages", "groups", "events"].includes(parts[0])) {
      return parts[0];
    }
  } catch {
    // Not a URL — return as-is (bare handle)
    if (/^[\w.-]+$/.test(trimmed)) return trimmed;
  }

  return trimmed;
}

export interface ResolvedBrand {
  /** Full canonical Facebook page URL for Apify (works with handles and numeric IDs) */
  pageUrl: string;
  /**
   * Numeric page ID for MCP enrichment lookups.
   * Null when the handle is not in the pre-resolved cache.
   * Apify still works; only MCP metrics will be unavailable.
   */
  pageId: string | null;
  brandName: string;
  handle: string;
}

export function resolveBrand(input: BrandInput): ResolvedBrand | null {
  const raw = input.facebookPageUrl?.trim();
  if (!raw) return null;

  const handle = parseFacebookUrl(raw);
  if (!handle) return null;

  const cache = loadCache();
  // Case-insensitive cache lookup
  const entry = cache[handle] ?? cache[handle.toLowerCase()];

  const isNumeric = /^\d+$/.test(handle);
  const pageId: string | null = entry?.pageId ?? (isNumeric ? handle : null);

  const pageUrl = `https://www.facebook.com/${handle}/`;

  const brandName =
    input.brandName?.trim() ||
    entry?.brandName ||
    handle;

  return { pageUrl, pageId, brandName, handle };
}
