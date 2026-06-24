import { NARUTO_TERMS, CARD_TERMS, SAMPLE_TERMS } from './config.js';

const has = (text, terms) => terms.some((t) => text.includes(t.toLowerCase()));

/**
 * Classify a listing title.
 *   'match'  -> alert. Requires ALL THREE: Naruto + Card + Sample, any order.
 *   'reject' -> drop.
 *
 * Title is NFKC-normalized first so full-width latin (ＮＡＲＵＴＯ, ＳＡＭＰＬＥ)
 * and width variants match, then lowercased so SAMPLE/Sample/sample are equal.
 */
export function classify(title) {
  const t = (title || '').normalize('NFKC').toLowerCase();

  const naruto = has(t, NARUTO_TERMS);
  const card = has(t, CARD_TERMS);
  const sample = has(t, SAMPLE_TERMS);

  return naruto && card && sample ? 'match' : 'reject';
}
