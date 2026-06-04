"use client";

import type { BrandData, BrandMetrics, BurstStatus, WeeklyLaunchData } from "@/lib/types";

const BURST_CONFIG: Record<BurstStatus, { color: string; bar: string; bg: string }> = {
  Surge:        { color: "text-red-600",    bar: "bg-red-400",    bg: "bg-red-50 border-red-200"       },
  Accelerating: { color: "text-amber-600",  bar: "bg-amber-400",  bg: "bg-amber-50 border-amber-200"   },
  Steady:       { color: "text-emerald-600",bar: "bg-emerald-400",bg: "bg-emerald-50 border-emerald-200"},
  Slowing:      { color: "text-gray-500",   bar: "bg-gray-300",   bg: "bg-gray-50 border-gray-200"     },
};

function BurstMeter({ metrics }: { metrics: BrandMetrics | null }) {
  if (!metrics) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
        <p className="text-xs text-gray-400 italic">No MCP data — run npm run enrich to populate timeline metrics</p>
      </div>
    );
  }

  const { burstStatus, currentWeekLaunches, fourWeekAvgLaunches } = metrics;

  if (!burstStatus) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-1">
        <p className="text-xs text-gray-500 font-medium">Burst Score: Insufficient history</p>
        <p className="text-[10px] text-gray-400">
          Current week: {currentWeekLaunches ?? "–"} · 4-week avg: {fourWeekAvgLaunches ?? "–"}
        </p>
        <p className="text-[10px] text-gray-400 italic">
          Burst ratio requires at least 1 launch in the prior 4 weeks. High-volume brands may need a larger MCP sample.
        </p>
      </div>
    );
  }

  const cfg = BURST_CONFIG[burstStatus];
  const ratio =
    fourWeekAvgLaunches && fourWeekAvgLaunches > 0 && currentWeekLaunches !== null
      ? Math.round((currentWeekLaunches / fourWeekAvgLaunches) * 10) / 10
      : null;
  const pct = ratio !== null ? Math.min(100, (ratio / 3) * 100) : 0;

  return (
    <div className={`rounded-lg border p-3 space-y-2 ${cfg.bg}`}>
      <div className="flex items-end gap-2">
        {ratio !== null && (
          <span className={`text-3xl font-bold ${cfg.color}`}>{ratio}x</span>
        )}
        <span className={`text-sm font-medium mb-1 ${cfg.color}`}>{burstStatus}</span>
      </div>
      {ratio !== null && (
        <div className="h-1.5 rounded-full bg-white/60 overflow-hidden">
          <div className={`h-full rounded-full ${cfg.bar} transition-all`} style={{ width: `${pct}%` }} />
        </div>
      )}
      <p className="text-[10px] text-gray-500">
        Current week: {currentWeekLaunches ?? "–"} launches · 4-week avg: {fourWeekAvgLaunches ?? "–"}.
        {" "}&gt;1.3x = accelerating · &gt;2x = surge.
      </p>
    </div>
  );
}

function WeeklyBarChart({ data }: { data: WeeklyLaunchData[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-1 h-24 pb-6">
      {data.map(({ label, count }) => (
        <div key={label} className="flex-1 flex flex-col items-center gap-0.5">
          <span className="text-[9px] text-gray-500 shrink-0">{count > 0 ? count : ""}</span>
          <div
            className="w-full rounded-t bg-indigo-200 hover:bg-indigo-400 transition cursor-default"
            style={{ height: `${Math.max(2, (count / max) * 44)}px` }}
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

interface Props {
  brand: BrandData;
}

export default function AdTimelineTab({ brand }: Props) {
  const { metrics } = brand.ads;

  return (
    <div className="space-y-3">
      {/* Campaign Burst Score */}
      <div className="space-y-1.5">
        <p className="text-[10px] text-gray-400 uppercase tracking-wider">Campaign Burst Score</p>
        <BurstMeter metrics={metrics} />
      </div>

      {/* Weekly launch trend */}
      <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider">Weekly New Ad Launches</p>
          <span className="text-[9px] text-gray-300 border border-gray-100 rounded px-1.5 py-0.5">MCP</span>
        </div>
        {metrics && metrics.weeklyLaunches.length > 0 ? (
          <WeeklyBarChart data={metrics.weeklyLaunches} />
        ) : (
          <p className="text-xs text-gray-400 italic text-center py-4">
            {metrics ? "No launch data in sample" : "Run npm run enrich to populate"}
          </p>
        )}
      </div>

      {/* Launch stats row */}
      {metrics && (
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-gray-50 border border-gray-200 p-2.5 text-center">
            <div className="text-xl font-bold text-indigo-600">
              {metrics.currentWeekLaunches ?? "–"}
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5">Current Week</div>
          </div>
          <div className="rounded-lg bg-gray-50 border border-gray-200 p-2.5 text-center">
            <div className="text-xl font-bold text-gray-600">
              {metrics.fourWeekAvgLaunches ?? "–"}
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5">4-Week Avg</div>
          </div>
        </div>
      )}

      {/* Source note */}
      <p className="text-[9px] text-gray-300 text-center">
        Timeline data from MCP recency sample (up to 50 ads). High-volume brands may show all launches in current week due to 50-ad cap.
      </p>
    </div>
  );
}
