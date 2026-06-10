import type { TrafficItem } from "@/lib/types";

function attentionScore(item: TrafficItem) {
  return item.views * 100 + item.totalImpressions;
}

export function getImprovementCandidates(items: TrafficItem[]) {
  return items
    .filter((item) => item.sales === 0 && (item.views > 0 || item.totalImpressions > 0))
    .sort((a, b) => attentionScore(b) - attentionScore(a))
    .slice(0, 20);
}
