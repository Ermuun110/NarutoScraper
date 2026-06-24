import { INCLUDE_SOLD } from './config.js';

// Markers that indicate a listing is already sold / unavailable. Used by the
// HTML scrapers to drop sold cards even if the search page includes them.
const SOLD_MARKERS = ['売り切れ', '売切', 'sold out', 'soldout', 'sold', '完売', '販売終了'];

/**
 * Returns true if a cheerio element ($el) looks sold.
 * Checks common "sold" badge classes plus visible text markers.
 * When INCLUDE_SOLD is set (test mode), always returns false so sold items pass.
 */
export function isSold($, $el) {
  if (INCLUDE_SOLD) return false;
  if ($el.find('.sold, .soldout, .sold-out, [class*="sold"], [class*="Sold"]').length) {
    return true;
  }
  const txt = $el.text().toLowerCase();
  return SOLD_MARKERS.some((m) => txt.includes(m.toLowerCase()));
}
