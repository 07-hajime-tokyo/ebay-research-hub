"use client";

import { useMemo, useState } from "react";
import type { ChangeLogItem } from "@/lib/ebay-supabase";

export function ChangeHistoryList({ items }: { items: ChangeLogItem[] }) {
  const [visibleCount, setVisibleCount] = useState(3);
  const visibleItems = useMemo(() => items.slice(0, visibleCount), [items, visibleCount]);
  const hasMore = visibleCount < items.length;

  if (!items.length) {
    return (
      <div className="rounded-md border border-dashed border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-500">
        変更履歴はまだありません。保存処理や同期処理とつなぐと、ここに記録されます。
      </div>
    );
  }

  return (
    <>
      {visibleItems.map((item) => (
        <div key={item.id} className="rounded-md border border-zinc-100 p-3 text-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="line-clamp-1 font-semibold text-zinc-800">{item.title}</div>
              <div className="mt-1 text-xs text-zinc-500">{item.detail}</div>
            </div>
            <div className="shrink-0 text-right text-[11px] text-zinc-500">
              <div>{item.at}</div>
              <div>{item.actor}</div>
            </div>
          </div>
        </div>
      ))}
      {hasMore ? (
        <button
          type="button"
          onClick={() => setVisibleCount((current) => Math.min(current + 3, items.length))}
          className="h-9 w-full rounded-md border border-[#cfd8e3] bg-[#f8fbff] text-xs font-semibold text-[#334155] hover:bg-[#eef4fb]"
        >
          さらに表示
        </button>
      ) : null}
    </>
  );
}
