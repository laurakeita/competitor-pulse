import type { AnalysisStage } from "@/lib/types";

const STAGES: { stage: AnalysisStage; label: string }[] = [
  { stage: "fetching-ads", label: "Scraping ad creatives…" },
  { stage: "ai-analysis", label: "Running AI analysis…" },
  { stage: "building-report", label: "Building report…" },
];

const STAGE_ORDER: AnalysisStage[] = [
  "fetching-ads",
  "ai-analysis",
  "building-report",
  "complete",
];

interface Props {
  stage: AnalysisStage;
}

export default function LoadingSkeleton({ stage }: Props) {
  const currentIdx = STAGE_ORDER.indexOf(stage);

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <p className="text-xs text-gray-400 mb-3 uppercase tracking-wider">Analysis Progress</p>
        <div className="space-y-2.5">
          {STAGES.map((s, i) => {
            const isDone = currentIdx > STAGE_ORDER.indexOf(s.stage);
            const isActive = s.stage === stage;
            return (
              <div key={i} className="flex items-center gap-3">
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] flex-shrink-0
                    ${isDone ? "bg-emerald-100 text-emerald-600 border border-emerald-200" : isActive ? "bg-indigo-100 text-indigo-600 border border-indigo-200 animate-pulse" : "bg-gray-100 border border-gray-200"}`}
                >
                  {isDone ? "✓" : isActive ? "·" : ""}
                </div>
                <span className={`text-xs ${isDone ? "text-emerald-600" : isActive ? "text-gray-900 font-medium" : "text-gray-400"}`}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
              <div className="w-8 h-8 rounded-lg bg-gray-100 animate-pulse" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
                <div className="h-2 w-16 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
            <div className="p-3 space-y-2.5">
              {[120, 80, 140].map((h, j) => (
                <div key={j} className="rounded-lg border border-gray-100 p-3 space-y-2 animate-pulse">
                  <div className="h-2.5 w-28 bg-gray-100 rounded" />
                  <div className="bg-gray-100 rounded" style={{ height: `${h}px` }} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
