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
