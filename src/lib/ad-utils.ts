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

export function avgRunningDays(creatives: AdCreative[]): number | null {
  const days = creatives.map((c) => runningDays(c.startDate)).filter((d): d is number => d !== null);
  if (days.length === 0) return null;
  return Math.round(days.reduce((a, b) => a + b, 0) / days.length);
}

export function newAdsLast20Days(creatives: AdCreative[]): number {
  const cutoff = new Date(today().getTime() - 20 * 86400000);
  return creatives.filter((c) => {
    const d = parseDate(c.startDate);
    return d !== null && d >= cutoff;
  }).length;
}

export function videoRatio(creatives: AdCreative[]): number | null {
  if (creatives.length === 0) return null;
  const videos = creatives.filter((c) => c.format === "video").length;
  return Math.round((videos / creatives.length) * 100);
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

export function computeBurstScore(creatives: AdCreative[]): number | null {
  if (creatives.length === 0) return null;

  // Group by week bucket (days ago / 7, integer)
  const weekCounts: number[] = Array(5).fill(0);
  for (const c of creatives) {
    const d = runningDays(c.startDate);
    if (d === null) continue;
    const weekIdx = Math.floor(d / 7); // 0 = this week, 1 = last week, ...
    if (weekIdx < 5) weekCounts[weekIdx]++;
  }

  const currentWeek = weekCounts[0];
  const prevWeeks = weekCounts.slice(1, 5);
  const prevCount = prevWeeks.filter((n) => n > 0).length;
  if (prevCount === 0) return null;

  const prevAvg = prevWeeks.reduce((a, b) => a + b, 0) / 4;
  if (prevAvg === 0) return null;

  return Math.round((currentWeek / prevAvg) * 10) / 10;
}

export function weeklyLaunches(creatives: AdCreative[], weeks = 8): { label: string; count: number }[] {
  const result: { label: string; count: number }[] = [];
  const now = today();
  for (let w = weeks - 1; w >= 0; w--) {
    const start = w * 7;
    const end = start + 7;
    const count = creatives.filter((c) => {
      const d = runningDays(c.startDate);
      return d !== null && d >= start && d < end;
    }).length;
    const date = new Date(now.getTime() - (w * 7 + 3) * 86400000);
    result.push({
      label: `${date.toLocaleString("en", { month: "short" })} ${date.getDate()}`,
      count,
    });
  }
  return result;
}

export function formatLabel(format: AdCreative["format"]): string {
  switch (format) {
    case "video": return "Video";
    case "image": return "Image";
    case "carousel": return "Carousel";
    default: return "Unknown";
  }
}
