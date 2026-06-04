"use client";

import { useState } from "react";
import type { BrandData } from "@/lib/types";
import {
  avgRunningDays,
  newAdsLast20Days,
  videoRatio,
  topLandingPages,
} from "@/lib/ad-utils";

function fmtCount(n: number | null): string {
  if (n === null) return "–";
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

const COUNT_SOURCE_LABELS: Record<string, string> = {
  mcp_graph_api: "Meta Graph API estimate",
  apify_sample: "Apify sample only",
  unavailable: "Unavailable",
};

function ActiveAdsCell({ ads }: { ads: BrandData["ads"] }) {
  const [showTip, setShowTip] = useState(false);
  const hasEstimate = ads.estimatedActiveAdsCount !== null && ads.countSource === "mcp_graph_api";

  return (
    <div className="rounded-lg bg-gray-50 border border-gray-200 p-2.5 text-center relative">
      <div className="text-lg font-bold text-indigo-600">
        {hasEstimate ? fmtCount(ads.estimatedActiveAdsCount) : "N/A"}
      </div>
      <div className="flex items-center justify-center gap-1 mt-0.5">
        <span className="text-[10px] text-gray-400">Active Ads</span>
        <button
          onClick={() => setShowTip((v) => !v)}
          className="text-[9px] text-gray-300 hover:text-gray-500 leading-none"
          aria-label="Count source info"
        >
          ⓘ
        </button>
      </div>
      {showTip && (
        <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg p-2.5 shadow-lg text-left">
          <p className="text-[10px] text-gray-600 leading-relaxed">
            Active Ads count is an estimated total from Meta Ad Library API via MCP in local enrichment mode.
            Creative analysis is based on sampled ads collected via Apify.
          </p>
          <p className="text-[9px] text-gray-400 mt-1.5">
            Source: {COUNT_SOURCE_LABELS[ads.countSource] ?? ads.countSource}
            {ads.countUpdatedAt && (
              <> · Updated {new Date(ads.countUpdatedAt).toLocaleDateString()}</>
            )}
          </p>
          {!hasEstimate && ads.sampledAdsCount > 0 && (
            <p className="text-[9px] text-gray-400 mt-1">
              Sampled creatives: {ads.sampledAdsCount}
            </p>
          )}
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
  const creatives = ads.creatives;

  const avgDays = avgRunningDays(creatives);
  const newAds = newAdsLast20Days(creatives);
  const vidRatio = videoRatio(creatives);
  const landingPages = topLandingPages(creatives, 5);

  const secondaryMetrics = [
    { label: "New (20d)", value: newAds > 0 ? String(newAds) : "–", color: "text-emerald-600" },
    { label: "Avg Running", value: avgDays !== null ? `${avgDays}d` : "–", color: "text-amber-600" },
    { label: "Video Ratio", value: vidRatio !== null ? `${vidRatio}%` : "–", color: "text-sky-600" },
  ];

  return (
    <div className="space-y-3">
      {/* KPI row */}
      <div className="grid grid-cols-4 gap-2">
        <ActiveAdsCell ads={ads} />
        {secondaryMetrics.map((m) => (
          <div key={m.label} className="rounded-lg bg-gray-50 border border-gray-200 p-2.5 text-center">
            <div className={`text-lg font-bold ${m.color}`}>{m.value}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">{m.label}</div>
          </div>
        ))}
      </div>
      {/* Sampled creatives footnote — shown when no estimated count */}
      {ads.countSource !== "mcp_graph_api" && ads.sampledAdsCount > 0 && (
        <p className="text-[10px] text-gray-400 -mt-1">
          Sampled creatives: {ads.sampledAdsCount} · Estimated total unavailable
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
                <div key={pillar} className="flex items-center gap-1.5 text-xs text-gray-700">
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

      {/* Top landing pages */}
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
