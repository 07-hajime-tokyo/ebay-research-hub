import { BadgeDollarSign, ExternalLink, Search } from "lucide-react";
import { ebaySearchUrl } from "@/lib/ebay-links";
import { formatNumber } from "@/lib/format";
import type { TrafficItem } from "@/lib/types";

function formatRate(value: number) {
  return `${(value * 100).toFixed(value > 0 && value < 0.01 ? 2 : 1)}%`;
}

function getRecommendation(item: TrafficItem) {
  if (item.views >= 100) {
    return {
      label: "価格確認",
      reason: "閲覧されていますが購入につながっていません。",
      action: "Sold相場と送料込みの競合価格を確認",
    };
  }

  if (item.totalImpressions >= 1000 && item.ctr < 0.01) {
    return {
      label: "見え方改善",
      reason: "検索面には出ていますがクリックされにくい状態です。",
      action: "タイトル、1枚目画像、価格表示を確認",
    };
  }

  if (item.ctr >= 0.01 && item.sales === 0) {
    return {
      label: "購入導線",
      reason: "クリックは取れているため商品ページ内で止まっています。",
      action: "価格、送料、説明、返品条件を確認",
    };
  }

  return {
    label: "要確認",
    reason: "販売につながっていないため優先度を確認します。",
    action: "相場と競合価格を比較",
  };
}

function attentionScore(item: TrafficItem) {
  return item.views * 100 + item.totalImpressions;
}

export function getImprovementCandidates(items: TrafficItem[]) {
  return items
    .filter((item) => item.sales === 0 && (item.views > 0 || item.totalImpressions > 0))
    .sort((a, b) => attentionScore(b) - attentionScore(a))
    .slice(0, 20);
}

export function ImprovementCandidateList({ items }: { items: TrafficItem[] }) {
  if (!items.length) {
    return <div className="text-sm text-zinc-500">表示できる改善候補はまだありません。</div>;
  }

  return (
    <div className="max-h-[640px] space-y-3 overflow-y-auto pr-1">
      {items.map((item, index) => {
        const recommendation = getRecommendation(item);

        return (
          <article key={item.id} className="rounded-md border border-zinc-100 bg-white p-3 text-sm shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-zinc-950 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white">
                    #{index + 1}
                  </span>
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                    {recommendation.label}
                  </span>
                </div>
                <a
                  href={item.itemUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 line-clamp-2 font-semibold leading-snug text-zinc-900 hover:text-sky-700 hover:underline"
                >
                  {item.title}
                </a>
              </div>
              {item.imageUrl ? (
                <a
                  href={item.itemUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block size-12 shrink-0 overflow-hidden rounded-md border border-zinc-200 bg-zinc-100"
                  aria-label={`${item.title} の出品ページを開く`}
                >
                  <img src={item.imageUrl} alt="" className="size-full object-cover" loading="lazy" />
                </a>
              ) : null}
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 rounded-md bg-zinc-50 p-2 font-mono text-[11px] text-zinc-600">
              <div>
                <div className="text-zinc-400">imp</div>
                <div className="font-semibold text-zinc-800">{formatNumber(item.totalImpressions)}</div>
              </div>
              <div>
                <div className="text-zinc-400">views</div>
                <div className="font-semibold text-zinc-800">{formatNumber(item.views)}</div>
              </div>
              <div>
                <div className="text-zinc-400">CTR</div>
                <div className="font-semibold text-zinc-800">{formatRate(item.ctr)}</div>
              </div>
            </div>

            <div className="mt-3 rounded-md border border-zinc-100 bg-[#fbfaf6] p-2 text-xs leading-relaxed text-zinc-600">
              <div>
                <span className="font-semibold text-zinc-800">理由:</span> {recommendation.reason}
              </div>
              <div className="mt-1">
                <span className="font-semibold text-zinc-800">推奨:</span> {recommendation.action}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <a
                href={item.itemUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-zinc-200 bg-white px-2 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                出品
                <ExternalLink className="size-3" />
              </a>
              <a
                href={ebaySearchUrl(item.title, "sold")}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100"
              >
                Sold相場
                <BadgeDollarSign className="size-3" />
              </a>
              <a
                href={ebaySearchUrl(item.title, "active")}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-sky-200 bg-sky-50 px-2 text-[11px] font-semibold text-sky-700 hover:bg-sky-100"
              >
                競合価格
                <Search className="size-3" />
              </a>
            </div>
          </article>
        );
      })}
    </div>
  );
}
