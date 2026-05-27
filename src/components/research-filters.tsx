"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function ResearchFilters({
  sellers,
  categories = [],
  currentSeller,
  currentCategory,
  currentSort,
}: {
  sellers: string[];
  categories: string[];
  currentSeller?: string;
  currentCategory?: string;
  currentSort?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function update(next: { seller?: string; category?: string; sort?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.seller !== undefined) next.seller ? params.set("seller", next.seller) : params.delete("seller");
    if (next.category !== undefined) next.category ? params.set("category", next.category) : params.delete("category");
    if (next.sort !== undefined) next.sort ? params.set("sort", next.sort) : params.delete("sort");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={currentSeller ?? ""}
        onChange={(event) => update({ seller: event.target.value })}
        className="h-9 min-w-44 rounded-md border border-[#cfd8e3] bg-white px-2 text-xs text-[#172033]"
      >
        <option value="">全出品者</option>
        {sellers.map((seller) => (
          <option key={seller} value={seller}>
            {seller}
          </option>
        ))}
      </select>

      <select
        value={currentCategory ?? ""}
        onChange={(event) => update({ category: event.target.value })}
        className="h-9 min-w-36 rounded-md border border-[#cfd8e3] bg-white px-2 text-xs text-[#172033]"
      >
        <option value="">全種類</option>
        {categories.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>

      <select
        value={currentSort ?? "sold"}
        onChange={(event) => update({ sort: event.target.value })}
        className="h-9 rounded-md border border-[#cfd8e3] bg-white px-2 text-xs text-[#172033]"
      >
        <option value="sold">Sold数順</option>
        <option value="gap">価格乖離順</option>
        <option value="price">eBay総額順</option>
      </select>

    </div>
  );
}
