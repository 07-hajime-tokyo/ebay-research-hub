export function ebaySearchUrl(title: string, mode: "active" | "sold" = "active") {
  const params = new URLSearchParams({
    _nkw: title,
  });

  if (mode === "sold") {
    params.set("LH_Sold", "1");
    params.set("LH_Complete", "1");
  }

  return `https://www.ebay.com/sch/i.html?${params.toString()}`;
}

export function ebayProductResearchUrl(title: string) {
  const params = new URLSearchParams({
    marketplace: "EBAY-US",
    keywords: title,
    tabName: "SOLD",
  });

  return `https://www.ebay.com/sh/research?${params.toString()}`;
}
