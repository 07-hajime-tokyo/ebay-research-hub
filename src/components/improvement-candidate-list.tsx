"use client";

import { useMemo, useState } from "react";
import {
  BadgeDollarSign,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  Search,
  Trash2,
} from "lucide-react";
import { ebaySearchUrl } from "@/lib/ebay-links";
import { formatNumber } from "@/lib/format";
import type { EbayImprovement, TrafficItem } from "@/lib/types";

const REVIEW_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

type TabMode = "pending" | "done" | "revisit";
type Draft = { improvement: string; memo: string };
type ImprovementTarget = {
  itemId: string;
  title: string;
  itemUrl: string;
  imageUrl: string;
};
type ImprovementView = EbayImprovement & {
  itemUrl: string;
  imageUrl: string;
  trafficItem?: TrafficItem;
};

function formatRate(value: number) {
  return `${(value * 100).toFixed(value > 0 && value < 0.01 ? 2 : 1)}%`;
}

function getTime(value: string) {
  const time = Date.parse(value);
  return Number.isNaN(time) ? 0 : time;
}

function isRevisitDue(item: EbayImprovement) {
  const improvedAt = getTime(item.createdAt);
  return improvedAt > 0 && Date.now() - improvedAt >= REVIEW_INTERVAL_MS;
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

function getLatestImprovements(items: EbayImprovement[]) {
  const byItem = new Map<string, EbayImprovement>();

  for (const item of items) {
    const key = item.itemId || item.id;
    const current = byItem.get(key);
    if (!current || getTime(item.createdAt) > getTime(current.createdAt)) {
      byItem.set(key, item);
    }
  }

  return Array.from(byItem.values()).sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt));
}

function targetFromTrafficItem(item: TrafficItem): ImprovementTarget {
  return {
    itemId: item.itemId,
    title: item.title,
    itemUrl: item.itemUrl,
    imageUrl: item.imageUrl,
  };
}

function targetFromImprovement(item: ImprovementView): ImprovementTarget {
  return {
    itemId: item.itemId,
    title: item.title,
    itemUrl: item.itemUrl,
    imageUrl: item.imageUrl,
  };
}

async function saveImprovementRequest(target: ImprovementTarget, draft: Draft) {
  const response = await fetch("/api/ebay/improvements", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      itemId: target.itemId,
      title: target.title,
      itemUrl: target.itemUrl,
      imageUrl: target.imageUrl,
      improvement: draft.improvement,
      memo: draft.memo,
    }),
  });
  if (!response.ok) throw new Error(await response.text());
  const data = await response.json();
  if (!data.improvement?.itemId) throw new Error("Improvement was not saved.");
  return data.improvement as EbayImprovement;
}

async function saveImprovementEditRequest(id: string, draft: Draft) {
  const response = await fetch("/api/ebay/improvements", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id, improvement: draft.improvement, memo: draft.memo }),
  });
  if (!response.ok) throw new Error(await response.text());
  const data = await response.json();
  if (!data.improvement?.id) throw new Error("Improvement edit was not saved.");
  return data.improvement as EbayImprovement;
}

async function removeImprovementRequest(id: string) {
  const response = await fetch(`/api/ebay/improvements?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error(await response.text());
  const data = await response.json();
  if (!data.improvement?.id) throw new Error("Improvement was not removed.");
  return data.improvement as EbayImprovement;
}

function ProductImage({ title, itemUrl, imageUrl }: ImprovementTarget) {
  if (!imageUrl) return null;
  return (
    <a
      href={itemUrl || ebaySearchUrl(title)}
      target="_blank"
      rel="noreferrer"
      className="block size-12 shrink-0 overflow-hidden rounded-md border border-zinc-200 bg-zinc-100"
      aria-label={`${title} の出品ページを開く`}
    >
      <img src={imageUrl} alt="" className="size-full object-cover" loading="lazy" />
    </a>
  );
}

function MetricRow({ item }: { item: TrafficItem }) {
  return (
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
  );
}

function ActionLinks({ title, itemUrl }: { title: string; itemUrl: string }) {
  const listingUrl = itemUrl || ebaySearchUrl(title);
  return (
    <div className="mt-3 grid grid-cols-3 gap-2">
      <a
        href={listingUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-zinc-200 bg-white px-2 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50"
      >
        出品
        <ExternalLink className="size-3" />
      </a>
      <a
        href={ebaySearchUrl(title, "sold")}
        target="_blank"
        rel="noreferrer"
        className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100"
      >
        Sold相場
        <BadgeDollarSign className="size-3" />
      </a>
      <a
        href={ebaySearchUrl(title, "active")}
        target="_blank"
        rel="noreferrer"
        className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-sky-200 bg-sky-50 px-2 text-[11px] font-semibold text-sky-700 hover:bg-sky-100"
      >
        競合価格
        <Search className="size-3" />
      </a>
    </div>
  );
}

function DraftEditor({
  draft,
  isSaving,
  buttonLabel,
  onChange,
  onSave,
}: {
  draft: Draft;
  isSaving: boolean;
  buttonLabel: string;
  onChange: (draft: Draft) => void;
  onSave: () => void;
}) {
  return (
    <div className="mt-3 rounded-md border border-[#d7dee8] bg-[#f8fafc] p-2">
      <label className="block">
        <span className="mb-1 block text-[11px] font-semibold text-[#475569]">改善内容</span>
        <textarea
          value={draft.improvement}
          onChange={(event) => onChange({ ...draft, improvement: event.target.value })}
          placeholder="例: 価格を$10下げた / 送料を見直した / 1枚目画像を変更した"
          rows={2}
          className="w-full resize-none rounded-md border border-[#cfd8e3] bg-white px-2 py-2 text-xs leading-relaxed text-[#172033] outline-none focus:border-[#64748b]"
        />
      </label>
      <label className="mt-2 block">
        <span className="mb-1 block text-[11px] font-semibold text-[#475569]">メモ</span>
        <textarea
          value={draft.memo}
          onChange={(event) => onChange({ ...draft, memo: event.target.value })}
          placeholder="例: 1週間後にviewsと販売数を見る / 競合より送料が高かった"
          rows={2}
          className="w-full resize-none rounded-md border border-[#cfd8e3] bg-white px-2 py-2 text-xs leading-relaxed text-[#172033] outline-none focus:border-[#64748b]"
        />
      </label>
      <button
        type="button"
        onClick={onSave}
        disabled={isSaving || !draft.improvement.trim()}
        className="mt-2 inline-flex h-8 w-full items-center justify-center gap-2 rounded-md bg-[#172033] px-3 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-300"
      >
        <CheckCircle2 className="size-3.5" />
        {isSaving ? "保存中" : buttonLabel}
      </button>
    </div>
  );
}

function ExistingImprovementEditor({
  draft,
  isSaving,
  hasChanges,
  onChange,
  onSave,
}: {
  draft: Draft;
  isSaving: boolean;
  hasChanges: boolean;
  onChange: (draft: Draft) => void;
  onSave: () => void;
}) {
  return (
    <div className="mt-3 rounded-md border border-zinc-200 bg-white p-2">
      <label className="block">
        <span className="mb-1 block text-[11px] font-semibold text-zinc-600">改善内容</span>
        <textarea
          value={draft.improvement}
          onChange={(event) => onChange({ ...draft, improvement: event.target.value })}
          rows={2}
          className="w-full resize-none rounded-md border border-zinc-200 bg-zinc-50 px-2 py-2 text-xs leading-relaxed text-zinc-800 outline-none focus:border-zinc-400"
        />
      </label>
      <label className="mt-2 block">
        <span className="mb-1 block text-[11px] font-semibold text-zinc-600">メモ</span>
        <textarea
          value={draft.memo}
          onChange={(event) => onChange({ ...draft, memo: event.target.value })}
          placeholder="例: 売れたら削除 / 1週間後にCTRを見る"
          rows={2}
          className="w-full resize-none rounded-md border border-zinc-200 bg-zinc-50 px-2 py-2 text-xs leading-relaxed text-zinc-800 outline-none focus:border-zinc-400"
        />
      </label>
      <button
        type="button"
        onClick={onSave}
        disabled={isSaving || !hasChanges || !draft.improvement.trim()}
        className="mt-2 inline-flex h-8 w-full items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 disabled:cursor-not-allowed disabled:text-zinc-300"
      >
        {isSaving ? "保存中" : "編集を保存"}
      </button>
    </div>
  );
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
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [editDrafts, setEditDrafts] = useState<Record<string, Draft>>({});
  const [savingId, setSavingId] = useState("");
  const [savingEditId, setSavingEditId] = useState("");
  const [removingId, setRemovingId] = useState("");
  const [message, setMessage] = useState("");

  const trafficById = useMemo(() => new Map(items.map((item) => [item.itemId, item])), [items]);
  const latestImprovements = useMemo(() => getLatestImprovements(improvements), [improvements]);
  const trackedItemIds = useMemo(() => new Set(latestImprovements.map((item) => item.itemId)), [latestImprovements]);
  const pendingItems = useMemo(
    () => items.filter((item) => !trackedItemIds.has(item.itemId)),
    [items, trackedItemIds],
  );
  const improvementViews = useMemo(
    () =>
      latestImprovements.map((item): ImprovementView => {
        const trafficItem = trafficById.get(item.itemId);
        return {
          ...item,
          title: trafficItem?.title || item.title,
          itemUrl: trafficItem?.itemUrl || item.itemUrl,
          imageUrl: trafficItem?.imageUrl || item.imageUrl,
          trafficItem,
        };
      }),
    [latestImprovements, trafficById],
  );
  const activeImprovements = useMemo(() => improvementViews.filter((item) => !item.resolved), [improvementViews]);
  const doneItems = useMemo(() => activeImprovements.filter((item) => !isRevisitDue(item)), [activeImprovements]);
  const revisitItems = useMemo(() => activeImprovements.filter(isRevisitDue), [activeImprovements]);

  function getDraft(itemId: string) {
    return drafts[itemId] ?? { improvement: "", memo: "" };
  }

  function updateDraft(itemId: string, value: Draft) {
    setDrafts((current) => ({ ...current, [itemId]: value }));
  }

  function getEditDraft(item: EbayImprovement) {
    return editDrafts[item.id] ?? { improvement: item.improvement, memo: item.memo };
  }

  function updateEditDraft(id: string, value: Draft) {
    setEditDrafts((current) => ({ ...current, [id]: value }));
  }

  function hasEditChanges(item: EbayImprovement, draft: Draft) {
    return draft.improvement.trim() !== item.improvement || draft.memo.trim() !== item.memo;
  }

  function mergeImprovement(saved: EbayImprovement) {
    setImprovements((current) => [saved, ...current.filter((entry) => entry.id !== saved.id)]);
  }

  async function markImproved(target: ImprovementTarget, nextTab: TabMode) {
    const draft = getDraft(target.itemId);
    const improvement = draft.improvement.trim();
    if (!improvement) {
      setMessage("改善内容を入力してください。");
      return;
    }

    setSavingId(target.itemId);
    setMessage("");
    try {
      const saved = await saveImprovementRequest(target, {
        improvement,
        memo: draft.memo.trim(),
      });
      mergeImprovement(saved);
      setDrafts((current) => ({ ...current, [target.itemId]: { improvement: "", memo: "" } }));
      setTab(nextTab);
      setMessage(nextTab === "done" ? "改善済みに移動しました。" : "再改善を保存しました。");
    } catch {
      setMessage("保存に失敗しました。ログイン状態やSupabase設定を確認してください。");
    } finally {
      setSavingId("");
    }
  }

  async function saveEditedImprovement(item: EbayImprovement) {
    const draft = getEditDraft(item);
    const improvement = draft.improvement.trim();
    if (!improvement) {
      setMessage("改善内容を入力してください。");
      return;
    }

    setSavingEditId(item.id);
    setMessage("");
    try {
      const saved = await saveImprovementEditRequest(item.id, {
        improvement,
        memo: draft.memo.trim(),
      });
      mergeImprovement(saved);
      setEditDrafts((current) => ({
        ...current,
        [item.id]: { improvement: saved.improvement, memo: saved.memo },
      }));
      setMessage("編集を保存しました。");
    } catch {
      setMessage("編集の保存に失敗しました。");
    } finally {
      setSavingEditId("");
    }
  }

  async function removeImprovement(item: EbayImprovement) {
    setRemovingId(item.id);
    setMessage("");
    try {
      const saved = await removeImprovementRequest(item.id);
      mergeImprovement(saved);
      setMessage("商品を改善リストから削除しました。");
    } catch {
      setMessage("削除に失敗しました。");
    } finally {
      setRemovingId("");
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 rounded-md border border-zinc-200 bg-zinc-50 p-1 text-xs font-semibold">
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
          改善済み {doneItems.length}
        </button>
        <button
          type="button"
          onClick={() => setTab("revisit")}
          className={`h-9 rounded-md ${tab === "revisit" ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500"}`}
        >
          再改善 {revisitItems.length}
        </button>
      </div>

      {message ? (
        <div className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-600">{message}</div>
      ) : null}

      {tab === "pending" ? (
        <div className="max-h-[640px] space-y-3 overflow-y-auto pr-1">
          {pendingItems.map((item, index) => {
            const recommendation = getRecommendation(item);
            const target = targetFromTrafficItem(item);
            const draft = getDraft(item.itemId);
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
                  <ProductImage {...target} />
                </div>

                <MetricRow item={item} />

                <div className="mt-3 rounded-md border border-zinc-100 bg-[#fbfaf6] p-2 text-xs leading-relaxed text-zinc-600">
                  <div>
                    <span className="font-semibold text-zinc-800">理由:</span> {recommendation.reason}
                  </div>
                  <div className="mt-1">
                    <span className="font-semibold text-zinc-800">推奨:</span> {recommendation.action}
                  </div>
                </div>

                <ActionLinks title={item.title} itemUrl={item.itemUrl} />
                <DraftEditor
                  draft={draft}
                  isSaving={isSaving}
                  buttonLabel="改善済みにする"
                  onChange={(value) => updateDraft(item.itemId, value)}
                  onSave={() => void markImproved(target, "done")}
                />
              </article>
            );
          })}

          {!pendingItems.length ? (
            <div className="rounded-md border border-dashed border-zinc-200 bg-white p-4 text-sm text-zinc-500">
              表示できる改善候補はありません。
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === "done" ? (
        <div className="max-h-[640px] space-y-3 overflow-y-auto pr-1">
          {doneItems.map((item) => {
            const editDraft = getEditDraft(item);
            const editChanged = hasEditChanges(item, editDraft);

            return (
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
                  <ProductImage {...targetFromImprovement(item)} />
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-[11px] text-zinc-500">
                  <div className="inline-flex items-center gap-1 font-semibold text-zinc-700">
                    <CalendarDays className="size-3" />
                    {item.at}
                  </div>
                  <div className="min-w-0 truncate">{item.actor}</div>
                </div>

                <ExistingImprovementEditor
                  draft={editDraft}
                  isSaving={savingEditId === item.id}
                  hasChanges={editChanged}
                  onChange={(value) => updateEditDraft(item.id, value)}
                  onSave={() => void saveEditedImprovement(item)}
                />

                <ActionLinks title={item.title} itemUrl={item.itemUrl} />
                <button
                  type="button"
                  onClick={() => void removeImprovement(item)}
                  disabled={removingId === item.id}
                  className="mt-3 inline-flex h-8 w-full items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:text-zinc-300"
                >
                  <Trash2 className="size-3.5" />
                  {removingId === item.id ? "削除中" : "削除"}
                </button>
              </article>
            );
          })}

          {!doneItems.length ? (
            <div className="rounded-md border border-dashed border-zinc-200 bg-white p-4 text-sm text-zinc-500">
              まだ改善済みの商品はありません。改善内容を入力して保存するとここに表示されます。
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === "revisit" ? (
        <div className="max-h-[640px] space-y-3 overflow-y-auto pr-1">
          {revisitItems.map((item, index) => {
            const trafficItem = item.trafficItem;
            const draft = getDraft(item.itemId);
            const editDraft = getEditDraft(item);
            const editChanged = hasEditChanges(item, editDraft);
            const isSaving = savingId === item.itemId;
            const recommendation = trafficItem ? getRecommendation(trafficItem) : null;

            return (
              <article key={item.id} className="rounded-md border border-amber-100 bg-white p-3 text-sm shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-zinc-950 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white">
                        #{index + 1}
                      </span>
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                        再改善
                      </span>
                      {recommendation ? (
                        <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-semibold text-zinc-600">
                          {recommendation.label}
                        </span>
                      ) : null}
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
                  <ProductImage {...targetFromImprovement(item)} />
                </div>

                {trafficItem ? <MetricRow item={trafficItem} /> : null}

                {recommendation ? (
                  <div className="mt-3 rounded-md border border-zinc-100 bg-[#fbfaf6] p-2 text-xs leading-relaxed text-zinc-600">
                    <div>
                      <span className="font-semibold text-zinc-800">理由:</span> {recommendation.reason}
                    </div>
                    <div className="mt-1">
                      <span className="font-semibold text-zinc-800">推奨:</span> {recommendation.action}
                    </div>
                  </div>
                ) : null}

                <div className="mt-3 rounded-md border border-amber-100 bg-amber-50/70 p-2 text-xs leading-relaxed text-zinc-700">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-zinc-900">前回改善</span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500">
                      <CalendarDays className="size-3" />
                      {item.at}
                    </span>
                  </div>
                </div>

                <ExistingImprovementEditor
                  draft={editDraft}
                  isSaving={savingEditId === item.id}
                  hasChanges={editChanged}
                  onChange={(value) => updateEditDraft(item.id, value)}
                  onSave={() => void saveEditedImprovement(item)}
                />

                <ActionLinks title={item.title} itemUrl={item.itemUrl} />
                <DraftEditor
                  draft={draft}
                  isSaving={isSaving}
                  buttonLabel="再改善を保存"
                  onChange={(value) => updateDraft(item.itemId, value)}
                  onSave={() => void markImproved(targetFromImprovement(item), "done")}
                />
                <button
                  type="button"
                  onClick={() => void removeImprovement(item)}
                  disabled={removingId === item.id}
                  className="mt-3 inline-flex h-8 w-full items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:text-zinc-300"
                >
                  <Trash2 className="size-3.5" />
                  {removingId === item.id ? "削除中" : "削除"}
                </button>
              </article>
            );
          })}

          {!revisitItems.length ? (
            <div className="rounded-md border border-dashed border-zinc-200 bg-white p-4 text-sm text-zinc-500">
              再改善が必要な商品はまだありません。改善から7日経つとここに移動します。
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
