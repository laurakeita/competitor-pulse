"use client";

import { useState, useCallback } from "react";
import type { AnalysisState, AnalysisStage, BrandInput, AnalyzeResponse } from "@/lib/types";

// Cosmetic pacing for the progress checklist while the request is in flight.
// The fetch result always wins — timers are cleared as soon as it settles,
// so a fast response (demo mode, cache hit) renders immediately.
const STAGE_SCHEDULE: { stage: AnalysisStage; atMs: number }[] = [
  { stage: "ai-analysis", atMs: 5000 },
  { stage: "building-report", atMs: 13000 },
];

export function useAnalysis() {
  const [state, setState] = useState<AnalysisState>({
    stage: "idle",
    brands: [],
    error: null,
  });

  const analyze = useCallback(async (brands: BrandInput[], countryCode = "TW") => {
    setState({ stage: "fetching-ads", brands: [], error: null });

    const timers = STAGE_SCHEDULE.map(({ stage, atMs }) =>
      setTimeout(() => setState((s) => ({ ...s, stage })), atMs)
    );

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brands, countryCode }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error ?? "Analysis failed");
      }

      const data: AnalyzeResponse = await res.json();
      setState({ stage: "complete", brands: data.brands, error: null });
    } catch (err) {
      setState({
        stage: "error",
        brands: [],
        error: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      timers.forEach(clearTimeout);
    }
  }, []);

  const reset = useCallback(() => {
    setState({ stage: "idle", brands: [], error: null });
  }, []);

  return { state, analyze, reset };
}
