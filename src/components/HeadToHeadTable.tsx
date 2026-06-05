import type { BrandData } from "@/lib/types";
import React from "react";

function fmtNum(n: number | null): string {
  if (n === null) return "–";
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}


interface RowDef {
  label: string;
  getValue: (b: BrandData) => string | React.ReactNode;
  getNum?: (b: BrandData) => number | null;
  highlight?: "high" | "low";
}

const ROWS: RowDef[] = [
  { label: "Active Ads", getValue: (b) => fmtNum(b.ads.metrics?.estimatedActiveAdsCount ?? null), getNum: (b) => b.ads.metrics?.estimatedActiveAdsCount ?? null, highlight: "high" },
  { label: "New Ads (10d)", getValue: (b) => fmtNum(b.ads.metrics?.newAds10d ?? null), getNum: (b) => b.ads.metrics?.newAds10d ?? null, highlight: "high" },
  { label: "Avg Running Days", getValue: (b) => { const d = b.ads.metrics?.avgRunningDays ?? null; return d !== null ? `${d}d` : "–"; }, getNum: (b) => b.ads.metrics?.avgRunningDays ?? null, highlight: "high" },
  { label: "Video Ratio", getValue: (b) => { const v = b.ads.metrics?.videoRatio ?? null; return v !== null ? `${v}%` : "–"; }, getNum: (b) => b.ads.metrics?.videoRatio ?? null, highlight: "high" },
  { label: "Creative Tone", getValue: (b) => b.ai.adSentimentTags.slice(0, 2).join(", ") || "–" },
];

interface Props {
  brands: BrandData[];
}

export default function HeadToHeadTable({ brands }: Props) {
  if (brands.length < 2) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Head-to-Head Comparison
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="py-2 px-4 text-left text-xs text-gray-400 font-normal w-36">Metric</th>
              {brands.map((b) => (
                <th key={b.id} className="py-2 px-4 text-center text-xs font-semibold text-gray-800">
                  {b.brandName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, ri) => {
              const nums = row.getNum ? brands.map((b) => row.getNum!(b)) : null;
              const knownNums = nums?.filter((n): n is number => n !== null) ?? [];
              const maxNum = knownNums.length > 0 ? Math.max(...knownNums) : null;
              const minNum = knownNums.length > 0 ? Math.min(...knownNums) : null;

              return (
                <tr key={ri} className={`border-b border-gray-100 ${ri % 2 === 0 ? "bg-white" : "bg-gray-50/30"}`}>
                  <td className="py-2 px-4 text-xs text-gray-500">{row.label}</td>
                  {brands.map((b, bi) => {
                    const num = nums?.[bi];
                    const highlight =
                      row.highlight === "high" && num === maxNum ? "text-emerald-600 font-semibold"
                      : row.highlight === "low" && num === minNum ? "text-emerald-600 font-semibold"
                      : row.highlight && num === (row.highlight === "high" ? minNum : maxNum) ? "text-red-500"
                      : "text-gray-700";
                    return (
                      <td key={b.id} className={`py-2 px-4 text-center text-xs ${highlight}`}>
                        {row.getValue(b)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
