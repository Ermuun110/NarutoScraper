import { NARUTO_TERMS, CARD_TERMS, SAMPLE_TERMS } from './config.js';

const has = (text, terms) => terms.some((t) => text.includes(t.toLowerCase()));

/**
 * Classify a listing title.
 *   'match'  -> alert.
 *   'reject' -> drop.
 *
 * Title is NFKC-normalized first so full-width latin (ＮＡＲＵＴＯ, ＳＡＭＰＬＥ)
 * and width variants match, then lowercased so SAMPLE/Sample/sample are equal.
 *
 * Rules:
 *   1. Standard: Naruto + Card + Sample (all three required)
 *   2. 任務完遂証明書 cert: Naruto + 任務完遂証明書 (no sample needed, it's inherently a cert card)
 *   3. Exclude: Dragon Ball, One Piece (non-Naruto franchises)
 */
export function classify(title) {
  const t = (title || '').normalize('NFKC').toLowerCase();

  // Exclude non-Naruto franchises
  if (has(t, ['ドラゴンボール', 'dragon ball', 'ワンピース', 'one piece'])) {
    return 'reject';
  }

  const naruto = has(t, NARUTO_TERMS);
  const card = has(t, CARD_TERMS);
  const sample = has(t, SAMPLE_TERMS);
  const isMissionCert = t.includes('任務完遂証明書');

  // Standard rule: need all three
  if (naruto && card && sample) return 'match';

  // Mission Completion Cert: just needs Naruto + the cert term
  if (naruto && isMissionCert) return 'match';

  return 'reject';
}
