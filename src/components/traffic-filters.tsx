"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { trafficGenres, trafficSortOptions } from "@/lib/traffic";

export function TrafficFilters({
  currentGenre,
  currentSort,
}: {
  currentGenre?: string;
  currentSort?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (!value || value === "全ジャンル") {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    router.replace(`/?${next.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={currentGenre ?? "全ジャンル"}
        onChange={(event) => updateParam("genre", event.target.value)}
        className="h-9 rounded-md border border-[#cfd8e3] bg-white px-3 text-sm font-medium text-[#172033] outline-none focus:border-[#64748b]"
      >
        {trafficGenres.map((genre) => (
          <option key={genre} value={genre}>
            {genre}
          </option>
        ))}
      </select>
      <select
        value={currentSort ?? "impressions"}
        onChange={(event) => updateParam("trafficSort", event.target.value)}
        className="h-9 rounded-md border border-[#cfd8e3] bg-white px-3 text-sm font-medium text-[#172033] outline-none focus:border-[#64748b]"
      >
        {trafficSortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
