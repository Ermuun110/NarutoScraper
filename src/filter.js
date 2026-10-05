import { NARUTO_TERMS, SAMPLE_TERMS, CARD_TERMS } from './config.js';

// Non-Naruto franchises + ナルト/サンプル false friends (narutomaki fish cake
// jewelry, 食品サンプル plastic food replicas, etc).
const NON_CARD_TERMS = [
  'ドラゴンボール', 'dragon ball', 'ワンピース', 'one piece',
  '食品サンプル', 'ピアス', 'イヤリング', 'ネックレス', '寿司', 'ラーメン', 'なると巻', '鳴門巻',
];

const has = (text, terms) => terms.some((t) => text.includes(t.toLowerCase()));

/**
 * Classify a listing title. All three concepts are required, any order:
 * Naruto + Card + Sample.
 *   'match'  -> alert.
 *   'maybe'  -> title has Naruto and exactly one of Card/Sample; the other may
 *               be in the description (caller fetches it once and re-checks).
 *   'reject' -> drop with no further work (no Naruto, or Naruto with neither
 *               card nor sample — figures, CDs, manga...).
 *
 * Title is NFKC-normalized first so full-width latin (ＮＡＲＵＴＯ, ＳＡＭＰＬＥ)
 * and width variants match, then lowercased so SAMPLE/Sample/sample are equal.
 * 任務完遂証明書 (mission cert) is itself a card, so Naruto + cert alone matches.
 */
export function classify(title) {
  const t = (title || '').normalize('NFKC').toLowerCase();

  if (has(t, NON_CARD_TERMS)) return 'reject';
  if (!has(t, NARUTO_TERMS)) return 'reject';

  const sample = has(t, SAMPLE_TERMS);
  const card = has(t, CARD_TERMS);

  if (t.includes('任務完遂証明書')) return 'match';
  if (sample && card) return 'match';
  if (sample || card) return 'maybe';
  return 'reject';
}

/**
 * Second-look check for 'maybe' titles: title + description
 * together must contain all three — Naruto, Sample and Card. Stricter than classify() because descriptions are long and
 * noisy (a lone "sample" mention in a figure listing must not alert).
 */
export function classifyDescription(title, description) {
  const t = `${title || ''} ${description || ''}`.normalize('NFKC').toLowerCase();
  if (has(t, NON_CARD_TERMS)) return 'reject';
  return has(t, NARUTO_TERMS) && has(t, SAMPLE_TERMS) && has(t, CARD_TERMS) ? 'match' : 'reject';
}
