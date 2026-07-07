import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
dotenv.config();

// Keywords searched on every platform each cycle; results merged + de-duped.
// Pattern from real listings: サンプルカード (compound, no space) appears in
// most titles. Data Carddas series uses latin "sample" alongside the series
// name. Four sweeps cover compound-word, split-word, and both series lines.
const DEFAULT_KEYWORDS = [
  'ナルト サンプルカード',
  'ナルト データカードダス サンプル',
  'ナルト データカードダス sample',
  'ナルティメット サンプルカード',
  '任務完遂証明書',
];

export const KEYWORDS = (process.env.SEARCH_KEYWORDS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
if (KEYWORDS.length === 0) KEYWORDS.push(...DEFAULT_KEYWORDS);

// Back-compat single keyword (first of the list).
export const KEYWORD = KEYWORDS[0];

export const CRON_SCHEDULE = process.env.CRON_SCHEDULE || '*/5 * * * *';

export const TELEGRAM = {
  token: process.env.TELEGRAM_BOT_TOKEN,
  chatId: process.env.TELEGRAM_CHAT_ID,
};

export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

export const HEARTBEAT = /^(1|true|yes)$/i.test(process.env.HEARTBEAT || '');

// TEST flag: when set, sold-out listings are NOT filtered (alerts fire for sold
// items too). Use to verify a platform's pipeline end-to-end, then unset.
export const INCLUDE_SOLD = /^(1|true|yes)$/i.test(process.env.INCLUDE_SOLD || '');

// A listing must contain ALL THREE concepts to alert: Naruto + Card + Sample
// (in any order). プロモ / 非売品 are NOT "sample" — they were the source of
// the false positives.

// Naruto / Narutimate franchise.
export const NARUTO_TERMS = ['naruto', 'ナルト', 'ナルティメット', 'narutimate'];

// Card (and special Naruto cards like 任務完遂証明書).
export const CARD_TERMS = ['カード', 'card', 'カードダス', 'data carddas', 'トレカ', '任務完遂証明書', 'データカードダス'];

// Sample — strictly sample wording, nothing else.
export const SAMPLE_TERMS = ['sample', 'サンプル', '見本'];

// Shared HTTP defaults. A real browser UA reduces bot-blocking on HTML sites.
export const HTTP = {
  timeout: 15000,
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept-Language': 'ja-JP,ja;q=0.9,en;q=0.8',
  },
};

// fileURLToPath (not .pathname) so paths with spaces decode correctly
// (.pathname leaves "%20" literal -> ENOENT).
export const STATE_FILE = fileURLToPath(new URL('../seen.json', import.meta.url));

function assertEnv() {
  const missing = [];
  if (!TELEGRAM.token) missing.push('TELEGRAM_BOT_TOKEN');
  if (!TELEGRAM.chatId) missing.push('TELEGRAM_CHAT_ID');
  if (missing.length) {
    throw new Error(`Missing env vars: ${missing.join(', ')}. Copy .env.example to .env.`);
  }
}
assertEnv();
