import type { AdCreative } from "./types";

function today(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function parseDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

export function runningDays(startDate: string | null): number | null {
  const d = parseDate(startDate);
  if (!d) return null;
  return Math.max(0, Math.floor((today().getTime() - d.getTime()) / 86400000));
}

export function topLandingPages(creatives: AdCreative[], limit = 5): { url: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const c of creatives) {
    if (!c.landingPage) continue;
    try {
      const u = new URL(c.landingPage);
      const key = u.hostname + u.pathname.replace(/\/$/, "");
      counts.set(key, (counts.get(key) ?? 0) + 1);
    } catch {
      counts.set(c.landingPage, (counts.get(c.landingPage) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([url, count]) => ({ url, count }));
}

// Top Hooks — first meaningful line of each ad copy, ranked by frequency
export function topHooks(creatives: AdCreative[], limit = 5): { text: string; count: number }[] {
  const counts = new Map<string, { original: string; count: number }>();
  for (const c of creatives) {
    if (!c.adCopy) continue;
    const firstLine = c.adCopy
      .split(/\n/)
      .map((l) => l.trim())
      .find((l) => l.length >= 8);
    if (!firstLine) continue;
    const key = firstLine.toLowerCase().replace(/\s+/g, " ").slice(0, 80);
    const existing = counts.get(key);
    if (existing) existing.count++;
    else counts.set(key, { original: firstLine, count: 1 });
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map(({ original, count }) => ({ text: original, count }));
}

// CTA phrase list — English + Traditional Chinese
const CTA_LIST = [
  "Shop Now", "Learn More", "Get Started", "Sign Up", "Buy Now",
  "Discover", "Explore", "Order Now", "Try Now", "Try for Free",
  "Start Now", "Join Now", "Book Now", "See More", "View More",
  "Find Out More", "Download Now", "Get Offer", "Claim Now", "Subscribe",
  "Apply Now", "Register Now", "Save Now", "Check It Out", "Shop the Sale",
  "立即購買", "了解更多", "立即訂購", "免費試用", "馬上購買",
  "立即體驗", "搶先購買", "前往選購", "現在購買", "查看更多",
  "立即下單", "限時優惠", "免費領取", "立即申請", "立即報名",
  "立即領取", "前往購買", "立即搶購", "點此了解", "免費體驗",
] as const;

// Top CTAs — counts how many ads contain each CTA phrase
export function topCTAs(creatives: AdCreative[], limit = 5): { text: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const c of creatives) {
    if (!c.adCopy) continue;
    const copy = c.adCopy;
    const seen = new Set<string>();
    for (const cta of CTA_LIST) {
      if (seen.has(cta)) continue;
      const isEnglish = /[a-zA-Z]/.test(cta);
      const found = isEnglish
        ? new RegExp(`\\b${cta}\\b`, "i").test(copy)
        : copy.includes(cta);
      if (found) {
        counts.set(cta, (counts.get(cta) ?? 0) + 1);
        seen.add(cta);
      }
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([text, count]) => ({ text, count }));
}

export function formatLabel(format: AdCreative["format"]): string {
  switch (format) {
    case "video": return "Video";
    case "image": return "Image";
    case "carousel": return "Carousel";
    default: return "Unknown";
  }
}
