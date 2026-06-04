"use client";

import { useState } from "react";
import type { BrandInput } from "@/lib/types";

interface Props {
  onAnalyze: (brands: BrandInput[]) => void;
  isLoading: boolean;
}

interface Row {
  pageId: string;
  domain: string;
}

function cleanPageId(value: string): string {
  return value.trim().replace(/\D/g, "");
}

function cleanDomain(value: string): string {
  return value.trim().toLowerCase().replace(/^https?:\/\/(www\.)?/, "").split("/")[0];
}

function isValidDomain(value: string): boolean {
  return /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z]{2,})+$/i.test(value);
}

export default function DomainInputForm({ onAnalyze, isLoading }: Props) {
  const [rows, setRows] = useState<Row[]>([
    { pageId: "", domain: "" },
    { pageId: "", domain: "" },
  ]);

  const addRow = () => {
    if (rows.length < 5) setRows([...rows, { pageId: "", domain: "" }]);
  };

  const removeRow = (i: number) => {
    if (rows.length > 1) setRows(rows.filter((_, idx) => idx !== i));
  };

  const updateRow = (i: number, field: keyof Row, val: string) => {
    const next = [...rows];
    next[i] = { ...next[i], [field]: val };
    setRows(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const brands: BrandInput[] = rows
      .map((r) => {
        const pageId = cleanPageId(r.pageId);
        const domain = cleanDomain(r.domain);
        return {
          pageId,
          domain: domain && isValidDomain(domain) ? domain : null,
        };
      })
      .filter((b) => b.pageId.length > 0);
    if (brands.length > 0) onAnalyze(brands);
  };

  const validCount = rows.filter((r) => cleanPageId(r.pageId).length > 0).length;
  const canSubmit = validCount > 0 && !isLoading;

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Column headers */}
      <div className="flex gap-2 px-0.5">
        <span className="flex-1 text-[10px] text-gray-400 font-medium uppercase tracking-wide">
          Facebook Page ID
          <span className="normal-case ml-1 text-red-400">*</span>
        </span>
        <span className="w-44 text-[10px] text-gray-400 font-medium uppercase tracking-wide">
          Domain
          <span className="normal-case ml-1 text-gray-300">(logo only, optional)</span>
        </span>
        {rows.length > 1 && <span className="w-9" />}
      </div>

      <div className="space-y-2">
        {rows.map((row, i) => {
          const pid = cleanPageId(row.pageId);
          const dom = cleanDomain(row.domain);
          const domHasError = dom.length > 0 && !isValidDomain(dom);

          return (
            <div key={i} className="flex gap-2">
              {/* Page ID — primary */}
              <div className="flex-1 relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={row.pageId}
                  onChange={(e) => updateRow(i, "pageId", e.target.value)}
                  placeholder="e.g. 15087023444"
                  disabled={isLoading}
                  className={`w-full px-3 py-2.5 rounded-lg border text-sm bg-white text-gray-900 placeholder-gray-400 outline-none transition focus:ring-1
                    ${pid.length > 0
                      ? "border-indigo-300 focus:border-indigo-400 focus:ring-indigo-300"
                      : "border-gray-200 focus:border-indigo-400 focus:ring-indigo-300"
                    }
                    disabled:opacity-50`}
                />
                {pid.length > 0 && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-500 text-xs">✓</span>
                )}
              </div>

              {/* Domain — secondary */}
              <div className="w-44 relative">
                <input
                  type="text"
                  value={row.domain}
                  onChange={(e) => updateRow(i, "domain", e.target.value)}
                  placeholder="brand.com"
                  disabled={isLoading}
                  className={`w-full px-3 py-2.5 rounded-lg border text-sm bg-white text-gray-900 placeholder-gray-400 outline-none transition focus:ring-1
                    ${domHasError
                      ? "border-red-300 focus:ring-red-300"
                      : "border-gray-200 focus:border-gray-300 focus:ring-gray-200"
                    }
                    disabled:opacity-50`}
                />
                {dom && !domHasError && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 text-xs">✓</span>
                )}
              </div>

              {/* Remove */}
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  disabled={isLoading}
                  className="w-9 h-10 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:text-red-400 hover:border-red-200 transition disabled:opacity-40"
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex gap-2">
        {rows.length < 5 && (
          <button
            type="button"
            onClick={addRow}
            disabled={isLoading}
            className="px-3 py-2 text-xs text-gray-500 border border-gray-200 rounded-lg hover:border-gray-300 hover:text-gray-700 transition disabled:opacity-40"
          >
            + Add Brand
          </button>
        )}
        <button
          type="submit"
          disabled={!canSubmit}
          className="flex-1 py-2.5 px-6 rounded-lg font-semibold text-sm transition
            bg-indigo-600 text-white hover:bg-indigo-500
            disabled:opacity-40 disabled:cursor-not-allowed
            focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Analyzing…
            </span>
          ) : (
            `Analyze ${validCount > 0 ? `${validCount} Brand${validCount > 1 ? "s" : ""}` : ""}`
          )}
        </button>
      </div>
    </form>
  );
}
