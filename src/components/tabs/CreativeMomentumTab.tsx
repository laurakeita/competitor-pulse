"use client";

import Image from "next/image";
import type { BrandData, AdCreative } from "@/lib/types";
import { runningDays, formatLabel, topHooks, topCTAs } from "@/lib/ad-utils";

const PLATFORM_ICONS: Record<string, string> = {
  facebook: "fb",
  instagram: "ig",
  messenger: "msg",
  audience_network: "an",
};

const FORMAT_COLORS: Record<string, string> = {
  video: "bg-purple-50 text-purple-600 border-purple-200",
  image: "bg-blue-50 text-blue-600 border-blue-200",
  carousel: "bg-cyan-50 text-cyan-600 border-cyan-200",
  unknown: "bg-gray-100 text-gray-500 border-gray-200",
};

function CreativeRow({ creative }: { creative: AdCreative }) {
  const days = runningDays(creative.startDate);
  const url = creative.adLibraryUrl ?? `https://www.facebook.com/ads/library/?id=${creative.libraryId}`;
  const isMock = creative.dataSource === "mock";

  return (
    <a
      href={isMock ? "#" : url}
      target={isMock ? undefined : "_blank"}
      rel="noopener noreferrer"
      className="flex gap-3 p-2.5 rounded-lg border border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 transition group"
    >
      {creative.imageUrl ? (
        <div className="shrink-0 w-14 h-14 rounded-md overflow-hidden bg-gray-100 relative border border-gray-200">
          <Image
            src={creative.imageUrl}
            alt="Ad creative"
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      ) : (
        <div className="shrink-0 w-10 text-center pt-1">
          <div className="text-sm font-bold text-gray-800">{days !== null ? days : "–"}</div>
          <div className="text-[9px] text-gray-400">days</div>
        </div>
      )}

      <div className="flex-1 min-w-0 space-y-1">
        {creative.imageUrl && days !== null && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-400">{days}d running</span>
          </div>
        )}
        <p className="text-xs text-gray-700 line-clamp-2 leading-relaxed">
          {creative.adCopy || <span className="text-gray-400 italic">No copy available</span>}
        </p>
        <div className="flex items-center gap-1.5 flex-wrap">
          {creative.startDate && (
            <span className="text-[10px] text-gray-400">
              <span className="text-gray-300">Start</span> {creative.startDate}
            </span>
          )}
          <span className={`text-[9px] px-1.5 py-0.5 rounded border ${FORMAT_COLORS[creative.format]}`}>
            {formatLabel(creative.format)}
          </span>
          {creative.landingPage && (() => {
            try {
              return (
                <span className="text-[10px] text-indigo-500 truncate max-w-[90px]">
                  {new URL(creative.landingPage).pathname}
                </span>
              );
            } catch { return null; }
          })()}
          <div className="flex gap-0.5 ml-auto">
            {creative.platforms.slice(0, 2).map((p) => (
              <span key={p} className="text-[9px] px-1 py-0.5 rounded bg-gray-100 text-gray-500 uppercase">
                {PLATFORM_ICONS[p] ?? p}
              </span>
            ))}
          </div>
        </div>
      </div>

      {!isMock && (
        <span className="shrink-0 text-[10px] text-gray-300 group-hover:text-gray-500 transition mt-0.5">↗</span>
      )}
    </a>
  );
}

function AdLifespanGantt({ creatives }: { creatives: AdCreative[] }) {
  if (creatives.length === 0) {
    return <p className="text-xs text-gray-400 italic text-center py-4">No timeline data</p>;
  }

  const withDays = creatives
    .map((c) => ({ ...c, days: runningDays(c.startDate) }))
    .filter((c): c is typeof c & { days: number } => c.days !== null)
    .sort((a, b) => b.days - a.days)
    .slice(0, 30);

  if (withDays.length === 0) {
    return <p className="text-xs text-gray-400 italic text-center py-4">No date data available</p>;
  }

  const maxDays = withDays[0].days;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[9px] text-gray-400 px-1 mb-1">
        <span>← Today</span>
        <span>{maxDays}d ago →</span>
      </div>
      {withDays.map((c, idx) => {
        const pct = maxDays > 0 ? (c.days / maxDays) * 100 : 100;
        const isNew = c.days <= 7;
        return (
          <div key={c.libraryId} className="flex items-center gap-2">
            <span className="text-[9px] text-gray-400 w-4 text-right shrink-0">{idx + 1}</span>
            <div
              className="flex-1 h-2.5 rounded bg-gray-100 overflow-hidden relative"
              title={`${c.adCopy?.slice(0, 60) || "No copy"} (${c.days}d)`}
            >
              <div
                className={`absolute right-0 h-full rounded transition-all ${
                  isNew ? "bg-emerald-300" : c.days > 30 ? "bg-indigo-400" : "bg-indigo-200"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[9px] text-gray-400 w-8 text-right shrink-0">{c.days}d</span>
          </div>
        );
      })}
      <div className="flex gap-3 pt-1">
        <span className="flex items-center gap-1 text-[9px] text-gray-400">
          <span className="inline-block w-3 h-2 rounded bg-emerald-300" /> New (≤7d)
        </span>
        <span className="flex items-center gap-1 text-[9px] text-gray-400">
          <span className="inline-block w-3 h-2 rounded bg-indigo-400" /> Running 30d+
        </span>
      </div>
    </div>
  );
}

interface Props {
  brand: BrandData;
}

export default function CreativeMomentumTab({ brand }: Props) {
  const { ads } = brand;
  const creatives = ads.creatives;

  const sorted = [...creatives].sort((a, b) => {
    const da = runningDays(a.startDate) ?? -1;
    const db = runningDays(b.startDate) ?? -1;
    return db - da;
  });

  const formatCounts: Record<string, number> = { video: 0, image: 0, carousel: 0, unknown: 0 };
  for (const c of creatives) formatCounts[c.format]++;
  const total = creatives.length;

  const hooks = topHooks(creatives, 5);
  const ctas = topCTAs(creatives, 5);

  const copyCounts = new Map<string, number>();
  for (const c of creatives) {
    if (!c.adCopy) continue;
    const key = c.adCopy.slice(0, 60).toLowerCase();
    copyCounts.set(key, (copyCounts.get(key) ?? 0) + 1);
  }
  const duplicates = [...copyCounts.values()].filter((n) => n > 1).reduce((a, b) => a + b - 1, 0);

  return (
    <div className="space-y-3">
      {/* Sample stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-2.5 text-center">
          <div className="text-lg font-bold text-gray-800">{creatives.length}</div>
          <div className="text-[10px] text-gray-400">Sample Size</div>
        </div>
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-2.5 text-center">
          <div className="text-lg font-bold text-rose-500">{duplicates}</div>
          <div className="text-[10px] text-gray-400">Duplicates</div>
        </div>
      </div>

      {/* Format breakdown */}
      {total > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-2.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Format Breakdown</p>
            <span className="text-[9px] text-gray-300 border border-gray-100 rounded px-1.5 py-0.5">Apify</span>
          </div>
          <div className="space-y-1.5">
            {(["video", "image", "carousel", "unknown"] as const).map((fmt) => {
              const count = formatCounts[fmt];
              if (count === 0) return null;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={fmt} className="flex items-center gap-2">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border w-14 text-center shrink-0 ${FORMAT_COLORS[fmt]}`}>
                    {formatLabel(fmt)}
                  </span>
                  <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full bg-indigo-400 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[10px] text-gray-400 w-14 text-right shrink-0">{count} ({pct}%)</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top Hooks */}
      <div className="rounded-lg border border-gray-200 bg-white p-2.5 space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider">Top Hooks</p>
          <span className="text-[9px] text-gray-300 border border-gray-100 rounded px-1.5 py-0.5">Apify</span>
        </div>
        {hooks.length > 0 ? (
          <div className="space-y-1.5">
            {hooks.map(({ text, count }, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-[10px] text-gray-300 w-3 shrink-0 pt-px">{i + 1}.</span>
                <span className="text-xs text-gray-700 flex-1 leading-relaxed line-clamp-2">{text}</span>
                {count > 1 && (
                  <span className="text-[10px] text-gray-400 shrink-0">{count}x</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic">No copy available</p>
        )}
      </div>

      {/* Top CTAs */}
      <div className="rounded-lg border border-gray-200 bg-white p-2.5 space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider">Top CTAs</p>
          <span className="text-[9px] text-gray-300 border border-gray-100 rounded px-1.5 py-0.5">Apify</span>
        </div>
        {ctas.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {ctas.map(({ text, count }) => (
              <span
                key={text}
                className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700"
              >
                {text}
                <span className="text-[10px] text-indigo-400">{count}</span>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic">No CTAs detected</p>
        )}
      </div>

      {/* Ad Lifespan Gantt */}
      <div className="rounded-lg border border-gray-200 bg-white p-2.5 space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider">Ad Lifespan (top 30)</p>
          <span className="text-[9px] text-gray-300 border border-gray-100 rounded px-1.5 py-0.5">Apify</span>
        </div>
        <AdLifespanGantt creatives={creatives} />
      </div>

      {/* Ad Survival Ranking */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider">Ad Survival Ranking</p>
          <span className="text-[9px] text-gray-300 border border-gray-100 rounded px-1.5 py-0.5">Apify</span>
        </div>
        <div className="space-y-1.5">
          {sorted.slice(0, 15).map((c) => (
            <CreativeRow key={c.libraryId} creative={c} />
          ))}
          {sorted.length === 0 && (
            <p className="text-xs text-gray-400 italic text-center py-4">No ad creatives tracked</p>
          )}
        </div>
      </div>
    </div>
  );
}
