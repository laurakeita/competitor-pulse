"use client";

import { useAnalysis } from "@/hooks/useAnalysis";
import DomainInputForm from "@/components/inputs/DomainInputForm";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";
import BrandDashboard from "@/components/BrandDashboard";
import HeadToHeadTable from "@/components/HeadToHeadTable";

import type { BrandInput } from "@/lib/types";

const QUICK_STARTS: [string, BrandInput[]][] = [
  ["Nike vs Adidas", [
    { pageId: "15087023444", domain: "nike.com" },
    { pageId: "182162001806727", domain: "adidas.com" },
  ]],
];

export default function HomePage() {
  const { state, analyze, reset } = useAnalysis();

  const isLoading = !["idle", "complete", "error"].includes(state.stage);
  const hasResults = state.stage === "complete" && state.brands.length > 0;

  return (
    <main className="min-h-screen bg-[#F7F6F3]">
      {/* Top bar */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-5 py-3 flex items-center gap-3">
          <span className="text-base font-semibold text-gray-900 tracking-tight">
            Competitor<span className="text-indigo-600">Pulse</span>
          </span>
          <span className="text-xs text-gray-400 hidden sm:block">Competitive ad monitoring</span>
          {hasResults && (
            <button
              onClick={reset}
              className="ml-auto text-xs text-gray-500 hover:text-gray-700 transition px-3 py-1.5 rounded-md border border-gray-200 hover:border-gray-300 bg-white"
            >
              Clear
            </button>
          )}
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-5 py-6 space-y-6">

        {/* Search panel — always visible */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-gray-900 mb-1">
              Analyze Competitors
            </h2>
            <p className="text-sm text-gray-500">
              Enter up to 5 Facebook Page IDs to monitor ad activity and creative trends.
            </p>
          </div>
          <DomainInputForm onAnalyze={(brands, cc) => analyze(brands, cc)} isLoading={isLoading} />

          {state.error && (
            <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs">
              {state.error}
            </div>
          )}

          {/* Quick starts — only show when idle */}
          {state.stage === "idle" && (
            <div className="mt-4 flex flex-wrap gap-2 items-center">
              <span className="text-[11px] text-gray-400">Try:</span>
              {QUICK_STARTS.map(([label, brands]) => (
                <button
                  key={label}
                  onClick={() => analyze(brands)}
                  className="text-xs px-3 py-1 rounded-full border border-gray-200 text-gray-500 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition"
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Loading state */}
        {isLoading && <LoadingSkeleton stage={state.stage} />}

        {/* Results */}
        {hasResults && (
          <div className="space-y-5">
            {/* Status bar */}
            <div className="flex flex-wrap items-center gap-2 px-1">
              <span className="text-xs text-gray-400">
                {state.brands.length} brand{state.brands.length > 1 ? "s" : ""} analyzed
              </span>
              <span className="text-gray-300">·</span>
              {state.brands.map((b) => (
                <span
                  key={b.id}
                  className={`text-[10px] px-2 py-0.5 rounded-full border ${
                    b.analysisStatus === "complete"
                      ? "border-emerald-200 text-emerald-600 bg-emerald-50"
                      : "border-gray-200 text-gray-500 bg-gray-50"
                  }`}
                >
                  {b.brandName} · {b.analysisStatus}
                </span>
              ))}
            </div>

            <BrandDashboard brands={state.brands} />
            <HeadToHeadTable brands={state.brands} />
          </div>
        )}
      </div>
    </main>
  );
}
