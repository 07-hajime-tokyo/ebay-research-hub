"use client";

import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { formatNumber } from "@/lib/format";
import type { TrafficItem } from "@/lib/types";

function formatRate(value: number) {
  return `${(value * 100).toFixed(value > 0 && value < 0.01 ? 2 : 1)}%`;
}

function HeaderHelp({ label, help, align = "left" }: { label: string; help: string; align?: "left" | "right" }) {
  return (
    <span className={`group relative inline-flex cursor-help items-center ${align === "right" ? "justify-end" : ""}`}>
      <span className="underline decoration-dotted underline-offset-4">{label}</span>
      <span
        className={`pointer-events-none absolute top-6 z-20 hidden w-44 rounded-md border border-[#d7dee8] bg-white px-3 py-2 text-left text-[11px] font-medium leading-relaxed text-[#334155] shadow-lg group-hover:block ${
          align === "right" ? "right-0" : "left-0"
        }`}
      >
        {help}
      </span>
    </span>
  );
}

export function TrafficRankingTable({ items }: { items: TrafficItem[] }) {
  const [visibleCount, setVisibleCount] = useState(20);
  const visibleItems = useMemo(() => items.slice(0, visibleCount), [items, visibleCount]);
  const hasMore = visibleCount < items.length;

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] table-fixed text-left text-sm">
          <colgroup>
            <col className="w-[38%]" />
            <col className="w-[82px]" />
            <col className="w-[72px]" />
            <col className="w-[88px]" />
            <col className="w-[72px]" />
            <col className="w-[64px]" />
            <col className="w-[64px]" />
            <col className="w-[64px]" />
          </colgroup>
          <thead className="border-y border-[#e5e7eb] bg-[#f3f4f6] text-xs font-semibold text-[#52525b]">
            <tr>
              <th className="px-3 py-3">商品</th>
              <th className="px-2 py-3">ジャンル</th>
              <th className="px-2 py-3 text-right">販売</th>
              <th className="px-2 py-3 text-right">
                <HeaderHelp label="見られた回数" help="検索結果や一覧などで、この商品が画面に表示された回数です。" align="right" />
              </th>
              <th className="px-2 py-3 text-right">
                <HeaderHelp label="開かれた数" help="商品ページを実際に開いて見た回数です。" align="right" />
              </th>
              <th className="px-2 py-3 text-right">
                <HeaderHelp label="クリック率" help="表示された回数のうち、商品ページが開かれた割合です。" align="right" />
              </th>
              <th className="px-2 py-3 text-right">
                <HeaderHelp label="購入率" help="商品ページを開いた人のうち、購入につながった割合です。" align="right" />
              </th>
              <th className="px-2 py-3">リンク</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e7edf3]">
            {visibleItems.map((item) => (
              <tr key={item.id} className="align-middle transition hover:bg-[#f8fbff]">
              <td className="px-3 py-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <a
                    href={item.itemUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block size-11 shrink-0 overflow-hidden rounded-md border border-[#d7dee8] bg-[#eef2f7]"
                    aria-label={`${item.title} の出品ページを開く`}
                  >
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt="" className="size-full object-cover" loading="lazy" />
                    ) : (
                      <div className="flex size-full items-center justify-center text-[10px] font-semibold text-[#94a3b8]">
                        no img
                      </div>
                    )}
                  </a>
                  <div className="min-w-0">
                    <a
                      href={item.itemUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="line-clamp-2 text-[13px] font-semibold leading-snug text-[#172033] hover:text-[#1d4ed8] hover:underline"
                      title={item.title}
                    >
                      {item.title}
                    </a>
                    <div className="mt-1 space-y-0.5 text-[11px] leading-tight text-[#667085]">
                      <div className="truncate font-mono">ID: {item.itemId}</div>
                      {item.acquiredAt ? <div className="truncate">{item.acquiredAt}</div> : null}
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-2 py-3">
                <span className="inline-flex max-w-full justify-center truncate rounded-full border border-[#d7dee8] bg-[#f5f8fc] px-2 py-1 text-xs font-semibold text-[#334155]">
                  {item.genre}
                </span>
              </td>
              <td className="px-2 py-3 text-right font-mono text-[13px] font-semibold text-[#172033]">{formatNumber(item.sales)}</td>
              <td className="px-2 py-3 text-right font-mono text-[13px]">{formatNumber(item.totalImpressions)}</td>
              <td className="px-2 py-3 text-right font-mono text-[13px]">{formatNumber(item.views)}</td>
              <td className="px-2 py-3 text-right font-mono text-[13px]">{formatRate(item.ctr)}</td>
              <td className="px-2 py-3 text-right font-mono text-[13px]">{formatRate(item.conversionRate)}</td>
              <td className="px-2 py-3">
                <a
                  href={item.itemUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-8 items-center gap-1 rounded-md border border-[#cfd8e3] px-2 text-xs font-semibold text-[#334155] hover:bg-[#f5f8fc]"
                >
                  <span className="hidden sm:inline">開く</span>
                  <ExternalLink className="size-3" />
                </a>
              </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-[#e7edf3] bg-white px-4 py-3 text-xs text-[#667085]">
        <span>
          {formatNumber(Math.min(visibleCount, items.length))} / {formatNumber(items.length)} 件表示
        </span>
        {hasMore ? (
          <button
            type="button"
            onClick={() => setVisibleCount((current) => Math.min(current + 10, items.length))}
            className="h-9 rounded-md border border-[#cfd8e3] bg-[#f8fbff] px-4 font-semibold text-[#334155] hover:bg-[#eef4fb]"
          >
            さらに10件表示
          </button>
        ) : null}
      </div>
    </div>
  );
}
