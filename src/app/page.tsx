import {
  BarChart3,
  Boxes,
  CalendarDays,
  Clock3,
  Eye,
  History,
  MousePointerClick,
  Search,
  ShoppingBag,
  Tags,
  TrendingUp,
} from "lucide-react";
import { signOut } from "@/app/actions";
import { ChangeHistoryList } from "@/components/change-history-list";
import { ResearchScheduleWorkspace } from "@/components/research-schedule-workspace";
import { TrafficFilters } from "@/components/traffic-filters";
import { TrafficRankingTable } from "@/components/traffic-ranking-table";
import { requireAppUser } from "@/lib/auth";
import { getEbayChangeLogs, getEbayTasks, getEbayTrafficItems } from "@/lib/ebay-supabase";
import { formatNumber } from "@/lib/format";
import { genreBadgeClass, rankBadgeClass } from "@/lib/traffic-styles";
import {
  filterTrafficItems,
  sortTrafficItems,
  summarizeByGenre,
  summarizeTraffic,
  trafficItems,
} from "@/lib/traffic";

function formatRate(value: number) {
  return `${(value * 100).toFixed(value > 0 && value < 0.01 ? 2 : 1)}%`;
}

function getJstNow() {
  const now = new Date();
  const dateParts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const timeParts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
  return { todayKey: dateParts, nowLabel: timeParts };
}

function formatTaskDateLabel(key: string) {
  const date = new Date(`${key}T00:00:00+09:00`);
  if (Number.isNaN(date.getTime())) return key;
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ genre?: string; trafficSort?: string }>;
}) {
  const params = await searchParams;
  const user = await requireAppUser();
  const supabaseTrafficItems = await getEbayTrafficItems();
  const sourceTrafficItems = supabaseTrafficItems?.length ? supabaseTrafficItems : trafficItems;
  const tasks = await getEbayTasks();
  const changeHistory = await getEbayChangeLogs();
  const { todayKey, nowLabel } = getJstNow();
  const filteredTraffic = sortTrafficItems(filterTrafficItems(sourceTrafficItems, params.genre), params.trafficSort);
  const summary = summarizeTraffic(filteredTraffic);
  const allSummary = summarizeTraffic(sourceTrafficItems);
  const genreSummaries = summarizeByGenre(filteredTraffic);
  const topViewed = sortTrafficItems(sourceTrafficItems, "views").slice(0, 4);
  const needsAttention = sourceTrafficItems
    .filter((item) => item.views >= 100 && item.sales === 0)
    .sort((a, b) => b.views - a.views)
    .slice(0, 4);

  const navItems = [
    { icon: BarChart3, label: "ダッシュボード" },
    { icon: ShoppingBag, label: "トラフィック" },
    { icon: Tags, label: "ジャンル分析" },
    { icon: Boxes, label: "出品管理" },
  ];

  const kpis = [
    { label: "出品数", value: formatNumber(summary.itemCount), sub: `全体 ${formatNumber(allSummary.itemCount)} items`, icon: ShoppingBag },
    { label: "総表示", value: formatNumber(summary.totalImpressions), sub: "impressions", icon: Eye },
    { label: "総閲覧", value: formatNumber(summary.totalViews), sub: "views", icon: MousePointerClick },
    { label: "販売数", value: formatNumber(summary.totalSales), sub: `平均CTR ${formatRate(summary.averageCtr)}`, icon: TrendingUp },
  ];

  const todayTasks = tasks
    .filter((task) => task.date === todayKey)
    .sort((a, b) => (a.due || "").localeCompare(b.due || ""))
    .slice(0, 4)
    .map((task) => ({
      title: task.title,
      stage: task.stage,
      owner: task.owner || "未設定",
      time: task.due || "--:--",
      minutes: task.minutes,
    }));
  const upcomingTasks = tasks
    .filter((task) => task.date && task.date > todayKey)
    .sort((a, b) => `${a.date}${a.due}`.localeCompare(`${b.date}${b.due}`))
    .slice(0, 5)
    .map((task) => ({
      title: task.title,
      date: formatTaskDateLabel(task.date),
      stage: task.stage,
      owner: task.owner || "未設定",
      time: task.due || "--:--",
      minutes: task.minutes,
    }));

  return (
    <main className="min-h-screen bg-[#f7f6f2]">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-zinc-200 bg-zinc-950 px-4 py-5 text-white">
          <div className="flex items-center gap-3 px-2">
            <div className="flex size-9 items-center justify-center rounded-md bg-[#f3d27b] text-lg font-black text-[#211e18]">
              M
            </div>
            <div>
              <div className="text-lg font-semibold">MarketKit</div>
              <div className="font-mono text-[11px] text-white/50">traffic hub</div>
            </div>
          </div>
          <nav className="mt-8 space-y-1">
            {navItems.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-white/70 first:bg-white/10 first:text-white"
              >
                <Icon className="size-4" />
                <span>{label}</span>
              </div>
            ))}
          </nav>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex min-h-16 flex-wrap items-center gap-3 border-b border-zinc-200 bg-white px-4 py-3 sm:px-6">
            <div>
              <div className="font-mono text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Dashboard
              </div>
              <h1 className="text-lg font-semibold text-zinc-950">eBay出品トラフィック管理</h1>
            </div>
            <form action="/" className="ml-0 flex flex-1 items-center gap-2 sm:ml-4 sm:max-w-md">
              <div className="relative min-w-0 flex-1">
                <Search className="absolute left-3 top-2.5 size-4 text-zinc-400" />
                <input
                  name="q"
                  placeholder="商品名・ジャンル・Item IDで検索"
                  className="h-9 w-full rounded-md border border-zinc-200 bg-zinc-50 pl-9 pr-3 text-sm outline-none focus:border-zinc-400"
                />
              </div>
              <button className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700">
                検索
              </button>
            </form>
            <div className="ml-auto flex items-center gap-2">
              {user ? (
                <form action={signOut}>
                  <button className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700">
                    ログアウト
                  </button>
                </form>
              ) : null}
            </div>
          </header>

          <div className="space-y-7 p-4 sm:p-6">
            <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-md border border-[#d8cbb8] bg-[#fbfaf6] p-4 text-[#241f17] shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center rounded-md bg-[#211e18] text-[#f3d27b]">
                      <CalendarDays className="size-4" />
                    </div>
                    <div>
                      <h2 className="font-semibold">本日のタスク</h2>
                      <div className="mt-1 text-xs text-[#7d6f59]">今日進める出品改善</div>
                    </div>
                  </div>
                  <span className="rounded-full border border-[#d8cbb8] bg-[#efe5d4] px-3 py-1 font-mono text-xs font-semibold">
                    {todayTasks.length} tasks
                  </span>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {todayTasks.map((task) => (
                    <div key={task.title} className="rounded-md border border-[#d8cbb8] bg-[#fffaf1] p-3 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="line-clamp-2 text-sm font-semibold">{task.title}</div>
                        <span className="rounded bg-[#211e18] px-2 py-1 font-mono text-[11px] text-white">{task.time}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-[#7d6f59]">
                        <span className="rounded border border-[#d8cbb8] bg-white px-2 py-0.5">{task.stage}</span>
                        <span>{task.owner}</span>
                        <span>{task.minutes}m</span>
                      </div>
                    </div>
                  ))}
                  {!todayTasks.length ? (
                    <div className="rounded-md border border-dashed border-[#d8cbb8] bg-[#fffaf1] p-4 text-sm text-[#7d6f59] md:col-span-2">
                      本日のタスクはまだありません。
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="rounded-md border border-[#d8cbb8] bg-[#fbfaf6] p-4 text-[#241f17] shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center rounded-md bg-[#211e18] text-[#f3d27b]">
                      <Clock3 className="size-4" />
                    </div>
                    <div>
                      <h2 className="font-semibold">これからのタスク</h2>
                      <div className="mt-1 text-xs text-[#7d6f59]">明日以降の確認予定</div>
                    </div>
                  </div>
                  <span className="rounded-full border border-[#d8cbb8] bg-[#efe5d4] px-3 py-1 font-mono text-xs font-semibold">
                    {upcomingTasks.length} tasks
                  </span>
                </div>

                <div className="mt-4 space-y-2">
                  {upcomingTasks.map((task) => (
                    <div key={task.title} className="grid grid-cols-[82px_1fr_auto] items-center gap-3 rounded-md border border-[#d8cbb8] bg-[#fffaf1] p-3 shadow-sm">
                      <div className="rounded border border-[#d8cbb8] bg-white px-2 py-1 text-center text-xs font-semibold text-[#7d6f59]">{task.date}</div>
                      <div className="min-w-0">
                        <div className="line-clamp-1 text-sm font-semibold">{task.title}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-[#7d6f59]">
                          <span className="rounded border border-[#d8cbb8] bg-white px-2 py-0.5">{task.stage}</span>
                          <span>{task.owner}</span>
                          <span>{task.minutes}m</span>
                        </div>
                      </div>
                      <span className="rounded bg-[#211e18] px-2 py-1 font-mono text-[11px] text-white">{task.time}</span>
                    </div>
                  ))}
                  {!upcomingTasks.length ? (
                    <div className="rounded-md border border-dashed border-[#d8cbb8] bg-[#fffaf1] p-4 text-sm text-[#7d6f59]">
                      これからのタスクはまだありません。
                    </div>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-4">
              {kpis.map(({ label, value, sub, icon: Icon }) => (
                <div key={label} className="rounded-md border border-zinc-200 bg-white p-4">
                  <div className="flex items-center justify-between text-xs font-semibold text-zinc-500">
                    <span>{label}</span>
                    <Icon className="size-4 text-zinc-400" />
                  </div>
                  <div className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950">{value}</div>
                  <div className="mt-1 text-xs text-zinc-500">{sub}</div>
                </div>
              ))}
            </section>

            <section className="grid gap-7 xl:grid-cols-[1.8fr_1fr]">
              <div className="overflow-hidden rounded-md border border-[#d7dee8] bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d7dee8] bg-[#f5f8fc] px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center rounded-md bg-[#1f2937] text-[#c7d2fe]">
                      <ShoppingBag className="size-4" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-[#172033]">出品トラフィックランキング</h2>
                      <p className="mt-1 text-xs text-[#667085]">Supabase同期データを元に、表示・閲覧・販売の強さを比較します。</p>
                    </div>
                  </div>
                  <TrafficFilters currentGenre={params.genre} currentSort={params.trafficSort} />
                </div>
                {filteredTraffic.length ? (
                  <TrafficRankingTable items={filteredTraffic.slice(0, 80)} />
                ) : (
                  <div className="m-4 rounded-md border border-dashed border-[#cfd8e3] bg-[#f8fafc] p-6 text-sm text-[#667085]">
                    出品トラフィックの同期データがまだありません。Google Sheets の共有後に `npm run sync:traffic` を実行すると表示されます。
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <section className="overflow-hidden rounded-md border border-[#d7dee8] bg-white shadow-sm">
                  <div className="flex items-center justify-between gap-3 border-b border-[#d7dee8] bg-[#f5f8fc] px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 items-center justify-center rounded-md bg-[#1f2937] text-[#c7d2fe]">
                        <BarChart3 className="size-4" />
                      </div>
                      <div>
                        <h2 className="font-semibold text-[#172033]">閲覧が多い商品</h2>
                        <p className="mt-1 text-xs text-[#667085]">商品ページまで見られている順です。</p>
                      </div>
                    </div>
                    <span className="rounded-full border border-[#d7dee8] bg-white px-3 py-1 font-mono text-xs font-semibold text-[#334155]">
                      top {topViewed.length}
                    </span>
                  </div>
                  <div className="space-y-2 p-4">
                    {topViewed.map((item, index) => (
                      <a key={item.id} href={item.itemUrl} target="_blank" rel="noreferrer" className="grid grid-cols-[34px_42px_1fr_auto] items-center gap-3 rounded-md border border-zinc-100 p-3 hover:bg-zinc-50">
                        <div className={`rounded border px-2 py-1 text-center text-xs font-semibold ${rankBadgeClass(index)}`}>{index + 1}</div>
                        <div className="size-10 overflow-hidden rounded-md border border-[#d7dee8] bg-[#eef2f7]">
                          {item.imageUrl ? <img src={item.imageUrl} alt="" className="size-full object-cover" loading="lazy" /> : null}
                        </div>
                        <div className="min-w-0">
                          <div className="line-clamp-1 text-sm font-semibold text-[#172033]">{item.title}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-[#667085]">
                            <span className={`rounded-full border px-1.5 py-0.5 font-semibold ${genreBadgeClass(item.genre)}`}>{item.genre}</span>
                            <span>CTR {formatRate(item.ctr)}</span>
                          </div>
                        </div>
                        <span className="rounded bg-[#1f2937] px-2 py-1 font-mono text-[11px] text-white">
                          {formatNumber(item.views)}
                        </span>
                      </a>
                    ))}
                  </div>
                </section>

                <section className="overflow-hidden rounded-md border border-[#d7dee8] bg-white shadow-sm">
                  <div className="flex items-center gap-3 border-b border-[#d7dee8] bg-[#f5f8fc] px-4 py-2.5">
                    <div className="flex size-7 items-center justify-center rounded-md bg-[#1f2937] text-[#c7d2fe]">
                      <Tags className="size-3.5" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-[#172033]">ジャンル別</h2>
                      <p className="mt-0.5 text-[11px] text-[#667085]">タイトルから自動分類</p>
                    </div>
                  </div>
                  <div className="divide-y divide-zinc-100 px-3 py-2">
                    {genreSummaries.map((genre) => (
                      <div key={genre.genre} className="grid grid-cols-[72px_1fr_auto] items-center gap-2 py-2 text-xs">
                        <div className="font-semibold text-[#172033]">{genre.genre}</div>
                        <div className="min-w-0 text-right font-mono text-[#667085]">
                          {formatNumber(genre.impressions)} 回
                        </div>
                        <div className="flex min-w-[92px] justify-end gap-1.5">
                          <span className="rounded bg-slate-100 px-2 py-1 font-mono text-[11px] text-slate-700">
                            {formatNumber(genre.count)}
                          </span>
                          <span className="rounded bg-emerald-50 px-2 py-1 font-mono text-[11px] text-emerald-700">
                            {formatNumber(genre.sales)}売
                          </span>
                        </div>
                      </div>
                    ))}
                    {!genreSummaries.length ? <div className="py-3 text-sm text-zinc-500">ジャンル別データはまだありません。</div> : null}
                  </div>
                </section>

                <section className="rounded-md border border-zinc-200 bg-white p-4">
                  <h2 className="font-semibold">改善候補</h2>
                  <div className="mt-3 space-y-2">
                    {needsAttention.map((item) => (
                      <a key={item.id} href={item.itemUrl} target="_blank" rel="noreferrer" className="block rounded-md border border-zinc-100 p-3 text-sm hover:bg-zinc-50">
                        <span className="line-clamp-1 font-semibold text-zinc-800">{item.title}</span>
                        <span className="mt-1 block text-xs text-zinc-500">
                          {formatNumber(item.views)} views / sales 0
                        </span>
                      </a>
                    ))}
                    {!needsAttention.length ? <div className="text-sm text-zinc-500">表示できる改善候補はまだありません。</div> : null}
                  </div>
                </section>

                <section className="overflow-hidden rounded-md border border-[#d7dee8] bg-white shadow-sm">
                  <div className="flex items-center gap-3 border-b border-[#d7dee8] bg-[#f5f8fc] px-4 py-3">
                    <div className="flex size-8 items-center justify-center rounded-md bg-[#1f2937] text-[#c7d2fe]">
                      <History className="size-4" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-[#172033]">変更履歴</h2>
                      <p className="mt-1 text-xs text-[#667085]">タスク追加やデータ更新の記録を残します。</p>
                    </div>
                  </div>
                  <div className="space-y-2 p-4">
                    <ChangeHistoryList items={changeHistory} />
                  </div>
                </section>
              </div>
            </section>

            <ResearchScheduleWorkspace initialTasks={tasks} todayKey={todayKey} nowLabel={nowLabel} />
          </div>
        </section>
      </div>
    </main>
  );
}
