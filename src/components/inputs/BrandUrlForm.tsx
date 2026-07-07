"use client";

import { useState } from "react";
import type { BrandInput } from "@/lib/types";

const COUNTRIES = [
  { code: "TW", label: "Taiwan (TW)" },
  { code: "US", label: "United States (US)" },
  { code: "GB", label: "United Kingdom (GB)" },
  { code: "JP", label: "Japan (JP)" },
  { code: "SG", label: "Singapore (SG)" },
  { code: "DE", label: "Germany (DE)" },
  { code: "FR", label: "France (FR)" },
  { code: "AU", label: "Australia (AU)" },
] as const;

interface Props {
  onAnalyze: (brands: BrandInput[], countryCode: string) => void;
  isLoading: boolean;
}

interface Row {
  facebookPageUrl: string;
  brandName: string;
}

function isValidFacebookInput(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  // Raw numeric ID
  if (/^\d+$/.test(trimmed)) return true;
  // Raw handle (letters, numbers, dots, hyphens)
  if (/^[\w.-]+$/.test(trimmed)) return true;
  // Facebook URL
  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    return url.hostname === "facebook.com" || url.hostname === "www.facebook.com";
  } catch {
    return false;
  }
}

export default function BrandUrlForm({ onAnalyze, isLoading }: Props) {
  const [rows, setRows] = useState<Row[]>([
    { facebookPageUrl: "", brandName: "" },
    { facebookPageUrl: "", brandName: "" },
  ]);
  const [countryCode, setCountryCode] = useState("TW");

  const addRow = () => {
    if (rows.length < 5) setRows([...rows, { facebookPageUrl: "", brandName: "" }]);
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
      .filter((r) => isValidFacebookInput(r.facebookPageUrl))
      .map((r) => ({
        facebookPageUrl: r.facebookPageUrl.trim(),
        brandName: r.brandName.trim() || undefined,
      }));
    if (brands.length > 0) onAnalyze(brands, countryCode);
  };

  const validRows = rows.filter((r) => isValidFacebookInput(r.facebookPageUrl));
  const canSubmit = validRows.length > 0 && !isLoading;

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Column headers */}
      <div className="flex gap-2 px-0.5">
        <span className="flex-1 text-[10px] text-gray-400 font-medium uppercase tracking-wide">
          Facebook Page URL
          <span className="normal-case ml-1 text-red-400">*</span>
        </span>
        <span className="w-36 text-[10px] text-gray-400 font-medium uppercase tracking-wide">
          Brand Name
          <span className="normal-case ml-1 text-gray-300">(optional)</span>
        </span>
        {rows.length > 1 && <span className="w-9" />}
      </div>

      <div className="space-y-2">
        {rows.map((row, i) => {
          const isValid = isValidFacebookInput(row.facebookPageUrl);
          const hasInput = row.facebookPageUrl.trim().length > 0;
          const hasError = hasInput && !isValid;

          return (
            <div key={i} className="flex gap-2">
              {/* Facebook Page URL — primary */}
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={row.facebookPageUrl}
                  onChange={(e) => updateRow(i, "facebookPageUrl", e.target.value)}
                  placeholder="https://www.facebook.com/LancomeTW/"
                  disabled={isLoading}
                  className={`w-full px-3 py-2.5 rounded-lg border text-sm bg-white text-gray-900 placeholder-gray-400 outline-none transition focus:ring-1
                    ${hasError
                      ? "border-red-300 focus:ring-red-300"
                      : isValid
                        ? "border-indigo-300 focus:border-indigo-400 focus:ring-indigo-300"
                        : "border-gray-200 focus:border-indigo-400 focus:ring-indigo-300"
                    }
                    disabled:opacity-50`}
                />
                {isValid && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-500 text-xs">✓</span>
                )}
                {hasError && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400 text-xs">!</span>
                )}
              </div>

              {/* Brand name — optional override */}
              <div className="w-36">
                <input
                  type="text"
                  value={row.brandName}
                  onChange={(e) => updateRow(i, "brandName", e.target.value)}
                  placeholder="Auto-detected"
                  disabled={isLoading}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-white text-gray-900 placeholder-gray-400 outline-none transition focus:border-gray-300 focus:ring-1 focus:ring-gray-200 disabled:opacity-50"
                />
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

      {/* Hint */}
      <p className="text-[10px] text-gray-400 px-0.5">
        Paste any Facebook page URL — e.g.{" "}
        <span className="font-mono text-gray-500">facebook.com/esteelaudertw</span>.
        Brand name and logo are detected automatically.
      </p>

      {/* Country filter */}
      <div className="flex items-center gap-2">
        <label className="text-[10px] text-gray-400 font-medium uppercase tracking-wide shrink-0">
          Ad Country
        </label>
        <select
          value={countryCode}
          onChange={(e) => setCountryCode(e.target.value)}
          disabled={isLoading}
          className="px-2 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-700 bg-white outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-300 disabled:opacity-50"
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>{c.label}</option>
          ))}
        </select>
        <span className="text-[10px] text-gray-300">Filters Ads Library sample by country</span>
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
            `Analyze ${validRows.length > 0 ? `${validRows.length} Brand${validRows.length > 1 ? "s" : ""}` : ""}`
          )}
        </button>
      </div>
    </form>
  );
}
