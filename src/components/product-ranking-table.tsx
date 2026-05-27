import { ExternalLink } from "lucide-react";
import { DecisionBadge } from "@/components/decision-badge";
import { formatCurrencyJpy, formatCurrencyUsd, formatNumber } from "@/lib/format";
import type { ResearchProduct } from "@/lib/types";

function fallbackThumbnail(product: ResearchProduct) {
  if (product.category.includes("カメラ")) {
    return "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=160&q=70";
  }
  if (product.category.includes("ルアー")) {
    return "https://images.unsplash.com/photo-1559827260-dc66d52bef19?auto=format&fit=crop&w=160&q=70";
  }
  return "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=160&q=70";
}

export function ProductRankingTable({ products }: { products: ResearchProduct[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] text-left text-sm">
        <thead className="border-y border-[#e5e7eb] bg-[#f3f4f6] text-xs font-semibold text-[#52525b]">
          <tr>
            <th className="px-4 py-3">商品</th>
            <th className="px-4 py-3 text-right">30日Sold</th>
            <th className="px-4 py-3 text-right">eBay総額</th>
            <th className="px-4 py-3 text-right">国内目安</th>
            <th className="px-4 py-3 text-right">価格乖離</th>
            <th className="px-4 py-3">判定</th>
            <th className="px-4 py-3">リンク</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#e7edf3]">
          {products.map((product) => (
            <tr key={product.id} className="align-middle transition hover:bg-[#f8fbff]">
              <td className="max-w-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <a
                    href={product.marketplaceLinks.ebayListing}
                    target="_blank"
                    rel="noreferrer"
                    className="block size-12 shrink-0 overflow-hidden rounded-md border border-[#d7dee8] bg-[#eef2f7]"
                    aria-label={`${product.title} の出品ページを開く`}
                  >
                    <img
                      src={product.thumbnailUrl || fallbackThumbnail(product)}
                      alt=""
                      className="size-full object-cover"
                      loading="lazy"
                    />
                  </a>
                  <div className="min-w-0">
                    <a
                      href={product.marketplaceLinks.ebayListing}
                      target="_blank"
                      rel="noreferrer"
                      className="line-clamp-2 font-semibold text-[#172033] hover:text-[#1d4ed8] hover:underline"
                    >
                      {product.title}
                    </a>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#667085]">
                      <span>{product.seller}</span>
                      <span>/</span>
                      <span>{product.category}</span>
                      <span>/</span>
                      <span>{product.condition}</span>
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-right font-mono">{formatNumber(product.sold30)}</td>
              <td className="px-4 py-3 text-right font-mono">{formatCurrencyUsd(product.totalUsd)}</td>
              <td className="px-4 py-3 text-right font-mono text-[#667085]">{formatCurrencyJpy(product.domesticPriceJpy)}</td>
              <td className="px-4 py-3 text-right">
                <span className="rounded-full bg-emerald-50 px-2 py-1 font-mono text-xs font-semibold text-emerald-700">
                  {formatCurrencyJpy(product.gapJpy)}
                </span>
              </td>
              <td className="px-4 py-3">
                <DecisionBadge decision={product.decision} />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2 text-xs">
                  <a href={product.marketplaceLinks.ebayListing} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1 rounded-md border border-[#cfd8e3] px-2 font-semibold text-[#334155] hover:bg-[#f5f8fc]">
                    出品
                    <ExternalLink className="size-3" />
                  </a>
                  <a href={product.marketplaceLinks.ebaySold} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1 rounded-md border border-[#cfd8e3] px-2 font-semibold text-[#334155] hover:bg-[#f5f8fc]">
                    Sold
                    <ExternalLink className="size-3" />
                  </a>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
