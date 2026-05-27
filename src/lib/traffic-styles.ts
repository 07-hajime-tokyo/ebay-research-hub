import type { TrafficGenre } from "@/lib/types";

const genreTone: Record<TrafficGenre, string> = {
  "釣具": "border-emerald-200 bg-emerald-50 text-emerald-700",
  "ゴルフ": "border-lime-200 bg-lime-50 text-lime-700",
  "ゲーム": "border-violet-200 bg-violet-50 text-violet-700",
  "カメラ": "border-sky-200 bg-sky-50 text-sky-700",
  "時計": "border-amber-200 bg-amber-50 text-amber-700",
  "ホビー": "border-rose-200 bg-rose-50 text-rose-700",
  "家電": "border-cyan-200 bg-cyan-50 text-cyan-700",
  "その他": "border-slate-200 bg-slate-50 text-slate-700",
};

export function genreBadgeClass(genre: TrafficGenre) {
  return genreTone[genre] ?? genreTone["その他"];
}

export function rankBadgeClass(index: number) {
  if (index === 0) return "border-amber-200 bg-amber-50 text-amber-700 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.08)]";
  if (index === 1) return "border-slate-300 bg-slate-100 text-slate-700 shadow-[inset_0_0_0_1px_rgba(100,116,139,0.08)]";
  if (index === 2) return "border-orange-200 bg-orange-50 text-orange-700 shadow-[inset_0_0_0_1px_rgba(249,115,22,0.08)]";
  return "border-sky-100 bg-sky-50 text-sky-700";
}
