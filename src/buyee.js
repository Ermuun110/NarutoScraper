// Maps a native listing to its Buyee proxy URL.
// Buyee proxies Mercari, Rakuma, and PayPay Fleamarket. It does NOT proxy
// Mandarake (Mandarake ships internationally directly), so that one keeps its
// native link.
const BUYEE = {
  Mercari: (id) => `https://buyee.jp/mercari/item/${id}`,
  Rakuma: (id) => `https://buyee.jp/rakuma/item/${id}`,
  PayPayFleamarket: (id) => `https://buyee.jp/paypayfleamarket/item/${id}`,
  YahooAuctions: (id) => `https://buyee.jp/item/yahoo/auction/${id}`,
};

/**
 * Returns { buyeeUrl, nativeUrl }. buyeeUrl is null for platforms Buyee
 * doesn't cover (Mandarake) — caller falls back to nativeUrl.
 */
export function toBuyee(platform, id, nativeUrl) {
  const fn = BUYEE[platform];
  return {
    buyeeUrl: fn ? fn(id) : null,
    nativeUrl,
  };
}
