"use client";

import type { BrandData } from "@/lib/types";
import { runningDays, computeBurstScore, weeklyLaunches } from "@/lib/ad-utils";

function BurstScoreMeter({ score }: { score: number | null }) {
  if (score === null) {
    return <p className="text-xs text-gray-400 italic py-1">Not enough data to compute burst score</p>;
  }

  let label: string;
  let colorText: string;
  let barColor: string;
  let bgColor: string;

  if (score >= 2) {
    label = "Surge";
    colorText = "text-red-600";
    barColor = "bg-red-400";
    bgColor = "bg-red-50 border-red-200";
  } else if (score >= 1.3) {
    label = "Accelerating";
    colorText = "text-amber-600";
    barColor = "bg-amber-400";
    bgColor = "bg-amber-50 border-amber-200";
  } else if (score >= 0.7) {
    label = "Steady";
    colorText = "text-emerald-600";
    barColor = "bg-emerald-400";
    bgColor = "bg-emerald-50 border-emerald-200";
  } else {
    label = "Slowing";
    colorText = "text-gray-500";
    barColor = "bg-gray-300";
    bgColor = "bg-gray-50 border-gray-200";
  }

  const pct = Math.min(100, (score / 3) * 100);

  return (
    <div className={`rounded-lg border p-3 space-y-2 ${bgColor}`}>
      <div className="flex items-end gap-2">
        <span className={`text-3xl font-bold ${colorText}`}>{score}x</span>
        <span className={`text-sm font-medium mb-1 ${colorText}`}>{label}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/60 overflow-hidden">
        <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[10px] text-gray-500">
        Current week launches vs 4-week average. &gt;1.3x = accelerating, &gt;2x = surge.
      </p>
    </div>
  );
}

function WeeklyBarChart({ data }: { data: { label: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-1 h-20 pb-5">
      {data.map(({ label, count }) => (
        <div key={label} className="flex-1 flex flex-col items-center gap-0.5">
          <div
            className="w-full rounded-t bg-indigo-200 hover:bg-indigo-400 transition cursor-default"
            style={{ height: `${Math.max(2, (count / max) * 56)}px` }}
            title={`${count} ads`}
          />
          <span className="text-[8px] text-gray-400 rotate-45 origin-left ml-1 whitespace-nowrap">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

function GanttChart({ brand }: { brand: BrandData }) {
  const creatives = brand.ads.creatives;
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
            <div className="flex-1 h-2.5 rounded bg-gray-100 overflow-hidden relative" title={`${c.adCopy?.slice(0, 60) || "No copy"} (${c.days}d)`}>
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

export default function AdTimelineTab({ brand }: Props) {
  const creatives = brand.ads.creatives;
  const burstScore = computeBurstScore(creatives);
  const launches = weeklyLaunches(creatives, 8);

  return (
    <div className="space-y-3">
      {/* Burst Score */}
      <div className="space-y-1.5">
        <p className="text-[10px] text-gray-400 uppercase tracking-wider">Campaign Burst Score</p>
        <BurstScoreMeter score={burstScore} />
      </div>

      {/* Weekly bar chart */}
      <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-2">
        <p className="text-[10px] text-gray-400 uppercase tracking-wider">Weekly New Ad Launches</p>
        {creatives.length > 0 ? (
          <WeeklyBarChart data={launches} />
        ) : (
          <p className="text-xs text-gray-400 italic text-center py-4">No data</p>
        )}
      </div>

      {/* Gantt */}
      <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-2">
        <p className="text-[10px] text-gray-400 uppercase tracking-wider">Ad Lifespan Timeline (top 30)</p>
        <GanttChart brand={brand} />
      </div>
    </div>
  );
}
