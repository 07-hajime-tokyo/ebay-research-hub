import type { TrafficGenre } from "@/lib/types";

const genreTone: Record<TrafficGenre, string> = {
  "釣具": "border-emerald-600 bg-emerald-600 text-white",
  "ゴルフ": "border-lime-500 bg-lime-500 text-[#1f2937]",
  "ゲーム": "border-violet-600 bg-violet-600 text-white",
  "カメラ": "border-blue-600 bg-blue-600 text-white",
  "時計": "border-amber-500 bg-amber-500 text-[#1f2937]",
  "ホビー": "border-pink-600 bg-pink-600 text-white",
  "家電": "border-cyan-600 bg-cyan-600 text-white",
  "その他": "border-slate-600 bg-slate-600 text-white",
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
