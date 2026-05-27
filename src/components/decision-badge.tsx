import type { ResearchDecision } from "@/lib/types";

const labelMap: Record<ResearchDecision, string> = {
  go: "候補",
  watch: "要確認",
  reject: "除外",
};

const toneMap: Record<ResearchDecision, string> = {
  go: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  watch: "bg-amber-50 text-amber-700 ring-amber-100",
  reject: "bg-zinc-100 text-zinc-600 ring-zinc-200",
};

export function DecisionBadge({ decision }: { decision: ResearchDecision }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ring-1 ${toneMap[decision]}`}>
      {labelMap[decision]}
    </span>
  );
}
