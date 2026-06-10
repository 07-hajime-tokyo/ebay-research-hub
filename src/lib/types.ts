export type ResearchDecision = "go" | "watch" | "reject";

export type ResearchProduct = {
  id: string;
  seller: string;
  sheetUrl: string;
  title: string;
  thumbnailUrl?: string;
  brand: string;
  category: string;
  sold30: number;
  productSoldCsv: number;
  ebayPriceUsd: number;
  shippingUsd: number;
  totalUsd: number;
  domesticPriceJpy: number;
  condition: string;
  gapJpy: number;
  decision: ResearchDecision;
  reason: string;
  itemId: string;
  transportClass: string;
  shippingEstimateJpy: number;
  marketplaceLinks: {
    ebayListing: string;
    ebaySold: string;
    mercari: string;
    yahooAuction: string;
    google: string;
  };
};

export type SellerSummary = {
  seller: string;
  productCount: number;
  goCount: number;
  watchCount: number;
  sold30Total: number;
  averageGapJpy: number;
  topBrand: string;
};

export type TrafficGenre =
  | "釣具"
  | "ゴルフ"
  | "ゲーム"
  | "カメラ"
  | "時計"
  | "ホビー"
  | "家電"
  | "その他";

export type TrafficItem = {
  id: string;
  title: string;
  itemId: string;
  sales: number;
  salesDelta?: number | null;
  totalImpressions: number;
  totalImpressionsDelta?: number | null;
  organicImpressions: number;
  searchImpressions: number;
  storeImpressions: number;
  views: number;
  viewsDelta?: number | null;
  ctr: number;
  conversionRate: number;
  itemUrl: string;
  acquiredAt: string;
  note: string;
  imageUrl: string;
  genre: TrafficGenre;
};

export type EbayImprovement = {
  id: string;
  itemId: string;
  title: string;
  itemUrl: string;
  imageUrl: string;
  improvement: string;
  memo: string;
  at: string;
  createdAt: string;
  actor: string;
  resolved: boolean;
};
