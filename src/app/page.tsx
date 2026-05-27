import {
  BarChart3,
  Boxes,
  CalendarDays,
  Clock3,
  ExternalLink,
  Gem,
  Link2,
  Search,
  ShoppingBag,
  Sparkles,
  Tags,
} from "lucide-react";
import { ProductRankingTable } from "@/components/product-ranking-table";
import { ResearchFilters } from "@/components/research-filters";
import { ResearchScheduleWorkspace } from "@/components/research-schedule-workspace";
import { formatCurrencyJpy, formatCurrencyUsd, formatNumber, formatPercent } from "@/lib/format";
import { products } from "@/lib/mock-data";
import { applyThumbnailCache } from "@/lib/thumbnail-cache";
import type { ResearchProduct, SellerSummary } from "@/lib/types";

function summarizeSellers(items: ResearchProduct[]): SellerSummary[] {
  const sellers = [...new Set(items.map((item) => item.seller))];
  return sellers.map((seller) => {
    const sellerProducts = items.filter((item) => item.seller === seller);
    const brandCounts = sellerProducts.reduce<Record<string, number>>((acc, item) => {
      acc[item.brand] = (acc[item.brand] ?? 0) + 1;
      return acc;
    }, {});
    const topBrand = Object.entries(brandCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "-";
    return {
      seller,
      productCount: sellerProducts.length,
      goCount: sellerProducts.filter((item) => item.decision === "go").length,
      watchCount: sellerProducts.filter((item) => item.decision === "watch").length,
      sold30Total: sellerProducts.reduce((sum, item) => sum + item.sold30, 0),
      averageGapJpy: Math.round(sellerProducts.reduce((sum, item) => sum + item.gapJpy, 0) / sellerProducts.length),
      topBrand,
    };
  });
}

function summarizeBy(items: ResearchProduct[], key: "brand" | "category") {
  const groups = items.reduce<Record<string, ResearchProduct[]>>((acc, item) => {
    const value = item[key];
    acc[value] = [...(acc[value] ?? []), item];
    return acc;
  }, {});
  return Object.entries(groups)
    .map(([label, group]) => ({
      label,
      count: group.length,
      sold30: group.reduce((sum, item) => sum + item.sold30, 0),
      goCount: group.filter((item) => item.decision === "go").length,
      averageGapJpy: Math.round(group.reduce((sum, item) => sum + item.gapJpy, 0) / group.length),
    }))
    .sort((a, b) => b.sold30 - a.sold30 || b.averageGapJpy - a.averageGapJpy);
}

function sortProducts(items: ResearchProduct[], sort?: string) {
  return [...items].sort((a, b) => {
    if (sort === "gap") return b.gapJpy - a.gapJpy;
    if (sort === "price") return b.totalUsd - a.totalUsd;
    return b.sold30 - a.sold30 || b.gapJpy - a.gapJpy;
  });
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ seller?: string; category?: string; decision?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const researchProducts = applyThumbnailCache(products);
  const sellers = [...new Set(researchProducts.map((item) => item.seller))].sort();
  const categories = [...new Set(researchProducts.map((item) => item.category))].sort();
  const filteredProducts = sortProducts(
    researchProducts.filter((item) => {
      if (params.seller && item.seller !== params.seller) return false;
      if (params.category && item.category !== params.category) return false;
      if (params.decision && item.decision !== params.decision) return false;
      return true;
    }),
    params.sort,
  );

  const sellerSummaries = summarizeSellers(researchProducts).sort((a, b) => b.sold30Total - a.sold30Total);
  const brandSummaries = summarizeBy(filteredProducts, "brand").slice(0, 5);
  const categorySummaries = summarizeBy(filteredProducts, "category").slice(0, 5);
  const topProducts = sortProducts(researchProducts, "sold").slice(0, 4);
  const goCount = filteredProducts.filter((item) => item.decision === "go").length;
  const totalSold = filteredProducts.reduce((sum, item) => sum + item.sold30, 0);
  const averageGap = filteredProducts.length
    ? Math.round(filteredProducts.reduce((sum, item) => sum + item.gapJpy, 0) / filteredProducts.length)
    : 0;
  const averageTotalUsd = filteredProducts.length
    ? filteredProducts.reduce((sum, item) => sum + item.totalUsd, 0) / filteredProducts.length
    : 0;

  const navItems = [
    { icon: BarChart3, label: "ダッシュボード" },
    { icon: ShoppingBag, label: "商品ランキング" },
    { icon: Tags, label: "ブランド分析" },
    { icon: Boxes, label: "出品者分析" },
  ];

  const kpis = [
    { label: "商品候補", value: formatNumber(filteredProducts.length), sub: `${sellers.length} sellers`, icon: ShoppingBag },
    { label: "候補判定", value: formatNumber(goCount), sub: `${formatPercent((goCount / Math.max(filteredProducts.length, 1)) * 100)} of filtered`, icon: Sparkles },
    { label: "30日Sold", value: formatNumber(totalSold), sub: "filtered total", icon: BarChart3 },
    { label: "平均価格乖離", value: formatCurrencyJpy(averageGap), sub: `${formatCurrencyUsd(averageTotalUsd)} avg total`, icon: Gem },
  ];
  const todayTasks = [
    { title: "価格乖離8,000円以上の商品を目視確認", stage: "リサーチ", owner: "担当A", time: "10:00", minutes: 60 },
    { title: "Shimano / Daiwa の仕入れ候補を国内リンクで確認", stage: "仕入れ", owner: "担当B", time: "13:00", minutes: 45 },
  ];
  const upcomingTasks = [
    { title: "kawamura-camera のカメラ商品をカテゴリ別に整理", date: "5/28(木)", stage: "分析", owner: "担当A", time: "11:00", minutes: 60 },
    { title: "○判定商品の出品文テンプレートを作成", date: "5/29(金)", stage: "出品準備", owner: "担当C", time: "15:00", minutes: 90 },
    { title: "Sold数上位ブランドの週次レビュー", date: "5/30(土)", stage: "レビュー", owner: "担当A", time: "17:00", minutes: 45 },
  ];
  return (
    <main className="min-h-screen bg-[#f7f6f2]">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-zinc-200 bg-zinc-950 px-4 py-5 text-white lg:flex lg:flex-col">
          <div className="flex items-center gap-3 px-2">
            <div className="flex size-9 items-center justify-center rounded-md bg-[#f3d27b] text-lg font-black text-[#211e18]">
              M
            </div>
            <div>
              <div className="text-lg font-semibold">MarketKit</div>
              <div className="font-mono text-[11px] text-white/50">research hub</div>
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
              <h1 className="text-lg font-semibold text-zinc-950">eBayリサーチ分析</h1>
            </div>
            <form action="/" className="ml-0 flex flex-1 items-center gap-2 sm:ml-4 sm:max-w-md">
              <div className="relative min-w-0 flex-1">
                <Search className="absolute left-3 top-2.5 size-4 text-zinc-400" />
                <input
                  name="q"
                  placeholder="商品名・ブランド・出品者で検索"
                  className="h-9 w-full rounded-md border border-zinc-200 bg-zinc-50 pl-9 pr-3 text-sm outline-none focus:border-zinc-400"
                />
              </div>
              <button className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700">
                検索
              </button>
            </form>
          </header>

          <div className="space-y-5 p-4 sm:p-6">
            <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-md border border-[#d8cbb8] bg-[#fbfaf6] p-4 text-[#241f17] shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center rounded-md bg-[#211e18] text-[#f3d27b]">
                      <CalendarDays className="size-4" />
                    </div>
                    <div>
                      <h2 className="font-semibold">本日のタスク</h2>
                      <div className="mt-1 text-xs text-[#7d6f59]">今日進めるリサーチ運用</div>
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
                </div>
              </div>
            </section>

            <details className="group rounded-md border border-[#d8cbb8] bg-[#fbfaf6] p-4 text-[#241f17] shadow-sm">
              <summary className="flex w-full cursor-pointer list-none flex-wrap items-center justify-between gap-3 text-left">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-md bg-[#211e18] text-[#f3d27b]">
                    <Link2 className="size-4" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-[#241f17]">リサーチ元シート</h2>
                    <div className="mt-1 text-xs text-[#7d6f59]">Driveにある出品者別リサーチシートへすぐ戻れます。</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-[#d8cbb8] bg-[#efe5d4] px-3 py-1 font-mono text-xs font-semibold">
                    {sellers.length} sheets
                  </span>
                  <span className="rounded-md border border-[#cbb89b] bg-[#efe5d4] px-3 py-1 text-xs font-semibold text-[#5f4f3b]">
                    <span className="group-open:hidden">開く</span>
                    <span className="hidden group-open:inline">閉じる</span>
                  </span>
                </div>
              </summary>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {sellerSummaries.slice(0, 4).map((seller) => {
                  const source = products.find((item) => item.seller === seller.seller);
                  return (
                    <a key={seller.seller} href={source?.sheetUrl} target="_blank" rel="noreferrer" className="group rounded-md border border-[#d8cbb8] bg-[#fffaf1] p-3 transition hover:border-[#bba98f] hover:bg-white">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="line-clamp-1 text-sm font-semibold text-[#241f17]">{seller.seller}</div>
                          <div className="mt-2 line-clamp-2 text-xs text-[#7d6f59]">
                            {seller.productCount}件 / 候補{seller.goCount}件 / top {seller.topBrand}
                          </div>
                        </div>
                        <ExternalLink className="size-4 shrink-0 text-[#9d8b72] transition group-hover:text-[#211e18]" />
                      </div>
                    </a>
                  );
                })}
              </div>
            </details>

            <section className="hidden gap-3 md:grid-cols-4">
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

            <section className="grid gap-5 xl:grid-cols-[1.8fr_1fr]">
              <div className="overflow-hidden rounded-md border border-[#d7dee8] bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d7dee8] bg-[#f5f8fc] px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center rounded-md bg-[#1f2937] text-[#c7d2fe]">
                      <ShoppingBag className="size-4" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-[#172033]">商品ランキング / リサーチ判定</h2>
                      <p className="mt-1 text-xs text-[#667085]">Drive由来のリサーチシートを統合して、狙い目を比較します。</p>
                    </div>
                  </div>
                  <ResearchFilters
                    sellers={sellers}
                    categories={categories}
                    currentSeller={params.seller}
                    currentCategory={params.category}
                    currentSort={params.sort}
                  />
                </div>
                <ProductRankingTable products={filteredProducts} />
              </div>

              <div className="space-y-5">
                <section className="overflow-hidden rounded-md border border-[#d7dee8] bg-white shadow-sm">
                  <div className="flex items-center justify-between gap-3 border-b border-[#d7dee8] bg-[#f5f8fc] px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 items-center justify-center rounded-md bg-[#1f2937] text-[#c7d2fe]">
                        <BarChart3 className="size-4" />
                      </div>
                      <div>
                        <h2 className="font-semibold text-[#172033]">売れている商品</h2>
                        <p className="mt-1 text-xs text-[#667085]">Sold数が強い順に確認します。</p>
                      </div>
                    </div>
                    <span className="rounded-full border border-[#d7dee8] bg-white px-3 py-1 font-mono text-xs font-semibold text-[#334155]">
                      top {topProducts.length}
                    </span>
                  </div>
                  <div className="space-y-2 p-4">
                    {topProducts.map((item, index) => (
                      <div key={item.id} className="grid grid-cols-[34px_1fr_auto] items-center gap-3 rounded-md border border-zinc-100 p-3 hover:bg-zinc-50">
                        <div className="rounded border border-[#d7dee8] bg-[#f5f8fc] px-2 py-1 text-center text-xs font-semibold text-[#667085]">{index + 1}</div>
                        <div className="min-w-0">
                          <div className="line-clamp-1 text-sm font-semibold text-[#172033]">{item.title}</div>
                          <div className="mt-1 text-[11px] text-[#667085]">{item.seller} / {item.brand}</div>
                        </div>
                        <span className="rounded bg-[#1f2937] px-2 py-1 font-mono text-[11px] text-white">
                          {item.sold30} sold
                        </span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="overflow-hidden rounded-md border border-[#d7dee8] bg-white shadow-sm">
                  <div className="flex items-center gap-3 border-b border-[#d7dee8] bg-[#f5f8fc] px-4 py-3">
                    <div className="flex size-8 items-center justify-center rounded-md bg-[#1f2937] text-[#c7d2fe]">
                      <Tags className="size-4" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-[#172033]">有望ブランド</h2>
                      <p className="mt-1 text-xs text-[#667085]">Soldと価格乖離から優先候補を確認します。</p>
                    </div>
                  </div>
                  <div className="space-y-3 p-4">
                    {brandSummaries.map((brand) => (
                      <div key={brand.label} className="rounded-md border border-zinc-100 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-semibold">{brand.label}</div>
                          <span className="rounded-full bg-emerald-50 px-2 py-1 font-mono text-xs text-emerald-700">
                            {formatCurrencyJpy(brand.averageGapJpy)}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
                          <span>{brand.count} items / 候補{brand.goCount}</span>
                          <span>{brand.sold30} sold</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-md border border-zinc-200 bg-white p-4">
                  <h2 className="font-semibold">カテゴリ別</h2>
                  <div className="mt-3 space-y-2">
                    {categorySummaries.map((category) => (
                      <div key={category.label} className="flex items-center justify-between text-sm">
                        <span className="text-zinc-700">{category.label}</span>
                        <span className="font-mono text-zinc-600">{category.sold30} sold</span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </section>

            <ResearchScheduleWorkspace />
          </div>
        </section>
      </div>
    </main>
  );
}
