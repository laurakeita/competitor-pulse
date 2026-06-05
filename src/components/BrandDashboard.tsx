"use client";

import { useState } from "react";
import Image from "next/image";
import type { BrandData } from "@/lib/types";
import BrandPulseTab from "@/components/tabs/BrandPulseTab";
import CreativeMomentumTab from "@/components/tabs/CreativeMomentumTab";

const TABS = [
  { id: "pulse", label: "Brand Pulse" },
  { id: "momentum", label: "Creative Momentum" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function BrandChip({
  brand,
  active,
  onClick,
}: {
  brand: BrandData;
  active: boolean;
  onClick: () => void;
}) {
  const [logoError, setLogoError] = useState(false);
  const initials = brand.brandName.slice(0, 2).toUpperCase();

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border text-xs font-medium transition shrink-0 ${
        active
          ? "border-indigo-300 bg-indigo-50 text-indigo-700"
          : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700"
      }`}
    >
      <span className="w-6 h-6 rounded-full border border-gray-200 overflow-hidden bg-gray-50 relative flex items-center justify-center shrink-0">
        {logoError || !brand.logoUrl ? (
          <span className="text-[9px] font-bold text-gray-400">{initials}</span>
        ) : (
          <Image
            src={brand.logoUrl}
            alt={brand.brandName}
            fill
            className="object-contain p-0.5"
            unoptimized
            onError={() => setLogoError(true)}
          />
        )}
      </span>
      {brand.brandName}
    </button>
  );
}

interface Props {
  brands: BrandData[];
}

export default function BrandDashboard({ brands }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("momentum");
  const [activeBrandId, setActiveBrandId] = useState<string>(brands[0]?.id ?? "");

  const brand = brands.find((b) => b.id === activeBrandId) ?? brands[0];
  if (!brand) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      {/* Tab bar */}
      <div className="flex border-b border-gray-100 bg-gray-50/50">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 text-xs font-medium transition ${
              activeTab === tab.id
                ? "text-indigo-600 border-b-2 border-indigo-500 bg-white"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Brand selector */}
      <div className="flex gap-2 px-4 py-3 border-b border-gray-100 overflow-x-auto">
        {brands.map((b) => (
          <BrandChip
            key={b.id}
            brand={b}
            active={b.id === brand.id}
            onClick={() => setActiveBrandId(b.id)}
          />
        ))}
      </div>

      {/* Tab content for selected brand */}
      <div className="p-4">
        {activeTab === "pulse" && <BrandPulseTab brand={brand} />}
        {activeTab === "momentum" && <CreativeMomentumTab brand={brand} />}
      </div>
    </div>
  );
}
