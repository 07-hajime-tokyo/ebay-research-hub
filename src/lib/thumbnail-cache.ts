import thumbnailCache from "@/lib/generated/research-thumbnail-cache.json";
import type { ResearchProduct } from "@/lib/types";

type ThumbnailCacheEntry = {
  thumbnailUrl?: string;
  listingUrl?: string;
};

type ThumbnailCache = Record<string, ThumbnailCacheEntry>;

const cache = thumbnailCache as ThumbnailCache;

export function applyThumbnailCache(products: ResearchProduct[]) {
  return products.map((product) => {
    const entry = cache[product.itemId] ?? cache[product.id];
    if (!entry?.thumbnailUrl && !entry?.listingUrl) return product;
    return {
      ...product,
      thumbnailUrl: entry.thumbnailUrl ?? product.thumbnailUrl,
      marketplaceLinks: {
        ...product.marketplaceLinks,
        ebayListing: entry.listingUrl ?? product.marketplaceLinks.ebayListing,
      },
    };
  });
}
