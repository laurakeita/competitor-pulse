"use client";

import { useState, useCallback } from "react";
import type { AnalysisState, AnalysisStage, BrandInput, AnalyzeResponse } from "@/lib/types";

const STAGE_DELAYS: Record<AnalysisStage, number> = {
  idle: 0,
  "fetching-ads": 5000,
  "ai-analysis": 8000,
  "building-report": 500,
  complete: 0,
  error: 0,
};

export function useAnalysis() {
  const [state, setState] = useState<AnalysisState>({
    stage: "idle",
    brands: [],
    error: null,
  });

  const analyze = useCallback(async (brands: BrandInput[]) => {
    setState({ stage: "fetching-ads", brands: [], error: null });

    const advanceStage = (delay: number, next: AnalysisStage) =>
      new Promise<void>((r) => setTimeout(() => { setState((s) => ({ ...s, stage: next })); r(); }, delay));

    const stagePromise = (async () => {
      await advanceStage(STAGE_DELAYS["fetching-ads"], "ai-analysis");
      await advanceStage(STAGE_DELAYS["ai-analysis"], "building-report");
    })();

    try {
      const fetchPromise = fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brands }),
      });

      const [, res] = await Promise.all([stagePromise, fetchPromise]);

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
    }
  }, []);

  const reset = useCallback(() => {
    setState({ stage: "idle", brands: [], error: null });
  }, []);

  return { state, analyze, reset };
}
