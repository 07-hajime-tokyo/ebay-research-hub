"use client";

import { useMemo, useState } from "react";
import { BadgeDollarSign, CalendarDays, CheckCircle2, ExternalLink, Search } from "lucide-react";
import { ebaySearchUrl } from "@/lib/ebay-links";
import { formatNumber } from "@/lib/format";
import type { EbayImprovement, TrafficItem } from "@/lib/types";

type TabMode = "pending" | "done";

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

async function saveImprovementRequest(item: TrafficItem, improvement: string) {
  const response = await fetch("/api/ebay/improvements", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      itemId: item.itemId,
      title: item.title,
      itemUrl: item.itemUrl,
      improvement,
    }),
  });
  if (!response.ok) throw new Error(await response.text());
  const data = await response.json();
  if (!data.improvement?.itemId) throw new Error("Improvement was not saved.");
  return data.improvement as EbayImprovement;
}

export function ImprovementCandidateList({
  items,
  initialImprovements = [],
}: {
  items: TrafficItem[];
  initialImprovements?: EbayImprovement[];
}) {
  const [tab, setTab] = useState<TabMode>("pending");
  const [improvements, setImprovements] = useState(initialImprovements);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState("");
  const [message, setMessage] = useState("");
  const improvedItemIds = useMemo(() => new Set(improvements.map((item) => item.itemId)), [improvements]);
  const pendingItems = useMemo(
    () => items.filter((item) => !improvedItemIds.has(item.itemId)),
    [items, improvedItemIds],
  );

  function updateDraft(itemId: string, value: string) {
    setDrafts((current) => ({ ...current, [itemId]: value }));
  }

  async function markImproved(item: TrafficItem) {
    const improvement = (drafts[item.itemId] ?? "").trim();
    if (!improvement) {
      setMessage("改善内容を入力してください。");
      return;
    }

    setSavingId(item.itemId);
    setMessage("");
    try {
      const saved = await saveImprovementRequest(item, improvement);
      setImprovements((current) => [saved, ...current.filter((entry) => entry.itemId !== saved.itemId)]);
      setDrafts((current) => ({ ...current, [item.itemId]: "" }));
      setTab("done");
      setMessage("改善済みに移動しました。");
    } catch {
      setMessage("改善済みの保存に失敗しました。ログイン状態やSupabase設定を確認してください。");
    } finally {
      setSavingId("");
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 rounded-md border border-zinc-200 bg-zinc-50 p-1 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setTab("pending")}
          className={`h-9 rounded-md ${tab === "pending" ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500"}`}
        >
          改善候補 {pendingItems.length}
        </button>
        <button
          type="button"
          onClick={() => setTab("done")}
          className={`h-9 rounded-md ${tab === "done" ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500"}`}
        >
          改善済み {improvements.length}
        </button>
      </div>

      {message ? (
        <div className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-600">{message}</div>
      ) : null}

      {tab === "pending" ? (
        <div className="max-h-[640px] space-y-3 overflow-y-auto pr-1">
          {pendingItems.map((item, index) => {
            const recommendation = getRecommendation(item);
            const draft = drafts[item.itemId] ?? "";
            const isSaving = savingId === item.itemId;

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

                <div className="mt-3 rounded-md border border-[#d7dee8] bg-[#f8fafc] p-2">
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold text-[#475569]">改善内容</span>
                    <textarea
                      value={draft}
                      onChange={(event) => updateDraft(item.itemId, event.target.value)}
                      placeholder="例: 価格を$10下げた / 送料を見直した / 1枚目画像を変更した"
                      rows={2}
                      className="w-full resize-none rounded-md border border-[#cfd8e3] bg-white px-2 py-2 text-xs leading-relaxed text-[#172033] outline-none focus:border-[#64748b]"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => void markImproved(item)}
                    disabled={isSaving || !draft.trim()}
                    className="mt-2 inline-flex h-8 w-full items-center justify-center gap-2 rounded-md bg-[#172033] px-3 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-300"
                  >
                    <CheckCircle2 className="size-3.5" />
                    {isSaving ? "保存中" : "改善済みにする"}
                  </button>
                </div>
              </article>
            );
          })}

          {!pendingItems.length ? (
            <div className="rounded-md border border-dashed border-zinc-200 bg-white p-4 text-sm text-zinc-500">
              表示できる改善候補はありません。
            </div>
          ) : null}
        </div>
      ) : (
        <div className="max-h-[640px] space-y-3 overflow-y-auto pr-1">
          {improvements.map((item) => (
            <article key={item.id} className="rounded-md border border-emerald-100 bg-white p-3 text-sm shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                    <CheckCircle2 className="size-3" />
                    改善済み
                  </div>
                  <a
                    href={item.itemUrl || ebaySearchUrl(item.title)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 line-clamp-2 font-semibold leading-snug text-zinc-900 hover:text-sky-700 hover:underline"
                  >
                    {item.title}
                  </a>
                </div>
                <div className="shrink-0 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-right text-[11px] text-zinc-500">
                  <div className="inline-flex items-center gap-1 font-semibold text-zinc-700">
                    <CalendarDays className="size-3" />
                    {item.at}
                  </div>
                  <div className="mt-0.5 max-w-24 truncate">{item.actor}</div>
                </div>
              </div>

              <div className="mt-3 rounded-md border border-emerald-100 bg-emerald-50/50 p-2 text-xs leading-relaxed text-zinc-700">
                <div className="font-semibold text-zinc-900">改善内容</div>
                <div className="mt-1 whitespace-pre-wrap">{item.improvement}</div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <a
                  href={item.itemUrl || ebaySearchUrl(item.title)}
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
          ))}

          {!improvements.length ? (
            <div className="rounded-md border border-dashed border-zinc-200 bg-white p-4 text-sm text-zinc-500">
              まだ改善済みの商品はありません。改善内容を入力して保存するとここに表示されます。
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
