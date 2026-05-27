import trafficJson from "@/lib/generated/traffic-items.json";
import type { TrafficGenre, TrafficItem } from "@/lib/types";

export const trafficGenres: Array<"全ジャンル" | TrafficGenre> = [
  "全ジャンル",
  "釣具",
  "ゴルフ",
  "ゲーム",
  "カメラ",
  "時計",
  "ホビー",
  "家電",
  "その他",
];

export const trafficSortOptions = [
  { value: "impressions", label: "総インプレッション" },
  { value: "views", label: "閲覧数" },
  { value: "sales", label: "販売数" },
  { value: "ctr", label: "CTR" },
  { value: "conversion", label: "CVR" },
] as const;

export type TrafficSort = (typeof trafficSortOptions)[number]["value"];

export const trafficItems = trafficJson as TrafficItem[];

export function sortTrafficItems(items: TrafficItem[], sort: string | undefined) {
  const normalizedSort: TrafficSort = trafficSortOptions.some((option) => option.value === sort)
    ? (sort as TrafficSort)
    : "impressions";

  return [...items].sort((a, b) => {
    if (normalizedSort === "views") return b.views - a.views;
    if (normalizedSort === "sales") return b.sales - a.sales;
    if (normalizedSort === "ctr") return b.ctr - a.ctr;
    if (normalizedSort === "conversion") return b.conversionRate - a.conversionRate;
    return b.totalImpressions - a.totalImpressions;
  });
}

export function filterTrafficItems(items: TrafficItem[], genre: string | undefined) {
  if (!genre || genre === "全ジャンル") return items;
  return items.filter((item) => item.genre === genre);
}

export function summarizeTraffic(items: TrafficItem[]) {
  const totalImpressions = items.reduce((sum, item) => sum + item.totalImpressions, 0);
  const totalViews = items.reduce((sum, item) => sum + item.views, 0);
  const totalSales = items.reduce((sum, item) => sum + item.sales, 0);

  return {
    itemCount: items.length,
    totalImpressions,
    totalViews,
    totalSales,
    averageCtr: items.length ? items.reduce((sum, item) => sum + item.ctr, 0) / items.length : 0,
    averageConversionRate: items.length ? items.reduce((sum, item) => sum + item.conversionRate, 0) / items.length : 0,
  };
}

export function summarizeByGenre(items: TrafficItem[]) {
  return trafficGenres
    .filter((genre): genre is TrafficGenre => genre !== "全ジャンル")
    .map((genre) => {
      const group = items.filter((item) => item.genre === genre);
      return {
        genre,
        count: group.length,
        sales: group.reduce((sum, item) => sum + item.sales, 0),
        impressions: group.reduce((sum, item) => sum + item.totalImpressions, 0),
        views: group.reduce((sum, item) => sum + item.views, 0),
      };
    })
    .filter((summary) => summary.count > 0)
    .sort((a, b) => b.impressions - a.impressions);
}
