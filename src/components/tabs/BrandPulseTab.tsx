"use client";

import { useState } from "react";
import type { BrandData, BrandMetrics } from "@/lib/types";
import { topLandingPages } from "@/lib/ad-utils";

function fmtCount(n: number | null): string {
  if (n === null) return "–";
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

const SOURCE_LABELS: Record<string, string> = {
  mcp_graph_api: "Meta Graph API",
  apify_sample: "Apify sample",
  unavailable: "Unavailable",
};

const SOURCE_COLORS: Record<string, string> = {
  mcp_graph_api: "text-emerald-600 bg-emerald-50 border-emerald-200",
  apify_sample: "text-amber-600 bg-amber-50 border-amber-200",
  unavailable: "text-gray-400 bg-gray-50 border-gray-200",
};

function AdInventoryPanel({
  metrics,
  sampledAdsCount,
}: {
  metrics: BrandMetrics | null;
  sampledAdsCount: number;
}) {
  const [showTip, setShowTip] = useState(false);
  const hasEstimate =
    metrics !== null &&
    metrics.estimatedActiveAdsCount !== null &&
    metrics.countSource === "mcp_graph_api";
  const source = metrics?.countSource ?? "unavailable";
  const sourceBadge = SOURCE_LABELS[source] ?? source;
  const sourceBadgeColor = SOURCE_COLORS[source] ?? SOURCE_COLORS.unavailable;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Ad Inventory</span>
        <button
          onClick={() => setShowTip((v) => !v)}
          className="text-[11px] text-gray-300 hover:text-indigo-400 transition"
          aria-label="Data source info"
        >
          ⓘ
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-md bg-gray-50 border border-gray-100 p-2 text-center">
          <div className="text-xl font-bold text-indigo-600">
            {hasEstimate ? fmtCount(metrics!.estimatedActiveAdsCount) : "—"}
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">Active Ads Estimate</div>
        </div>
        <div className="rounded-md bg-gray-50 border border-gray-100 p-2 text-center">
          <div className="text-xl font-bold text-gray-700">{sampledAdsCount}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">Sampled Creatives</div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          <span className="text-[9px] text-gray-400">Count Source</span>
          <span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${sourceBadgeColor}`}>
            {sourceBadge}
          </span>
        </div>
        {metrics?.countUpdatedAt && (
          <>
            <span className="text-gray-200">·</span>
            <span className="text-[9px] text-gray-400">
              Updated{" "}
              <span className="text-gray-500">
                {new Date(metrics.countUpdatedAt).toLocaleDateString("en", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </span>
          </>
        )}
      </div>

      {showTip && (
        <div className="rounded-md bg-indigo-50 border border-indigo-100 p-2.5 space-y-1.5">
          <p className="text-[10px] text-indigo-700 font-medium">About this data</p>
          <p className="text-[10px] text-indigo-600 leading-relaxed">
            <strong>Active Ads Estimate</strong> is the true library total from Meta Graph API, fetched via MCP and stored at dev-time. It is never inferred from sample size.
          </p>
          <p className="text-[10px] text-indigo-600 leading-relaxed">
            <strong>Sampled Creatives</strong> are the top-{sampledAdsCount} ads by impression rank collected via Apify — used for all creative analysis in the Creative Momentum tab.
          </p>
          <p className="text-[9px] text-indigo-400">
            All KPIs on this tab (New Ads, Avg Running, Video Ratio) are derived from the MCP recency sample (50 most recent active ads), not the Apify impression sample.
          </p>
        </div>
      )}
    </div>
  );
}

interface Props {
  brand: BrandData;
}

export default function BrandPulseTab({ brand }: Props) {
  const { ads, ai } = brand;
  const { metrics } = ads;

  const performanceMetrics = [
    {
      label: "New (10d)",
      value: fmtCount(metrics?.newAds10d ?? null),
      color: "text-emerald-600",
    },
    {
      label: "Avg Running",
      value: metrics?.avgRunningDays != null ? `${metrics.avgRunningDays}d` : "–",
      color: "text-amber-600",
    },
    {
      label: "Video Ratio",
      value: metrics?.videoRatio != null ? `${metrics.videoRatio}%` : "–",
      color: "text-sky-600",
    },
  ];

  const landingPages = topLandingPages(ads.creatives, 5);

  return (
    <div className="space-y-3">
      <AdInventoryPanel metrics={metrics} sampledAdsCount={ads.sampledAdsCount} />

      {/* KPIs from MCP recency sample */}
      <div className="grid grid-cols-3 gap-2">
        {performanceMetrics.map((m) => (
          <div key={m.label} className="rounded-lg bg-gray-50 border border-gray-200 p-2.5 text-center">
            <div className={`text-lg font-bold ${m.color}`}>{m.value}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">{m.label}</div>
          </div>
        ))}
      </div>

      {!metrics && (
        <p className="text-[10px] text-amber-600 text-center py-1">
          KPIs unavailable — run <code className="font-mono">npm run enrich</code> to populate MCP metrics
        </p>
      )}

      {/* AI Summary */}
      {ai.adSummaryBullets.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-indigo-50/40 p-3 space-y-1.5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-[10px] text-indigo-600 uppercase tracking-wider font-semibold">AI Summary</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-100 border border-indigo-200 text-indigo-500">Gemini</span>
          </div>
          {ai.adSummaryBullets.map((bullet, i) => (
            <div key={i} className="flex gap-2 text-xs text-gray-700">
              <span className="text-indigo-400 shrink-0 mt-0.5">▸</span>
              <span>{bullet}</span>
            </div>
          ))}
        </div>
      )}

      {/* Messaging pillars + sentiment */}
      <div className="grid grid-cols-2 gap-2">
        {ai.messagingPillars.length > 0 && (
          <div className="rounded-lg border border-gray-200 bg-white p-2.5 space-y-1.5">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Messaging Pillars</p>
            <div className="space-y-1">
              {ai.messagingPillars.map((pillar, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs text-gray-700">
                  <span className="text-[10px] text-gray-300 w-3">{i + 1}.</span>
                  {pillar}
                </div>
              ))}
            </div>
          </div>
        )}
        {ai.adSentimentTags.length > 0 && (
          <div className="rounded-lg border border-gray-200 bg-white p-2.5 space-y-1.5">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Creative Tone</p>
            <div className="flex flex-wrap gap-1">
              {ai.adSentimentTags.map((tag) => (
                <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 border border-gray-200 text-gray-600">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Top landing pages from Apify sample */}
      {landingPages.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-2.5 space-y-1.5">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider">Top Landing Pages</p>
          <div className="space-y-1">
            {landingPages.map(({ url, count }) => (
              <div key={url} className="flex items-center gap-2">
                <a
                  href={url.startsWith("http") ? url : `https://${url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-[11px] text-indigo-600 hover:text-indigo-700 truncate"
                >
                  {url}
                </a>
                <span className="text-[10px] text-gray-400 shrink-0">{count}x</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
