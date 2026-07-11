import axios from 'axios';
import { TELEGRAM } from './config.js';

const API = `https://api.telegram.org/bot${TELEGRAM.token}/sendMessage`;

const esc = (s = '') =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// POST to Telegram, honoring 429 `retry_after`. One retry after the wait so a
// burst of alerts survives the ~20 msg/min per-chat limit instead of silently
// dropping (which previously left listings un-marked and re-flooding forever).
async function post(payload, tries = 2) {
  for (let i = 0; i < tries; i++) {
    try {
      await axios.post(API, payload);
      return true;
    } catch (err) {
      const data = err.response?.data;
      const retry = data?.parameters?.retry_after;
      if (retry && i < tries - 1) {
        await sleep((retry + 1) * 1000);
        continue;
      }
      console.error('Telegram send failed:', data?.description || err.message);
      return false;
    }
  }
  return false;
}

export async function sendRaw(text) {
  await post({ chat_id: TELEGRAM.chatId, text });
}

export async function sendAlert(listing) {
  const { platform, title, price, url, buyeeUrl, keyword } = listing;
  const priceStr = price != null ? `¥${Number(price).toLocaleString('ja-JP')}` : '—';

  // Prefer the Buyee proxy link (one-click order for overseas buyers). Keep
  // the native link as a secondary reference. Mandarake has no Buyee proxy, so
  // buyeeUrl is null there and only the native link shows.
  const links = buyeeUrl
    ? `🛒 Buyee: ${esc(buyeeUrl)}\n🔗 Original: ${esc(url)}`
    : `🔗 ${esc(url)}`;

  const KEYWORD_EN = {
    'ナルト サンプルカード': 'Naruto Sample Card',
    'ナルト データカードダス サンプル': 'Naruto Data Carddas Sample',
    'ナルト データカードダス sample': 'Naruto Data Carddas Sample',
    'ナルティメット サンプルカード': 'Narutimate Sample Card',
    '任務完遂証明書': 'Mission Completion Certificate',
  };
  const en = keyword && KEYWORD_EN[keyword] ? ` (${KEYWORD_EN[keyword]})` : '';
  const label = keyword ? `${esc(keyword)}${en}` : 'New listing';
  const text =
    `🔥 <b>${label}</b> [${esc(platform)}]\n\n` +
    `${esc(title)}\n` +
    `💴 ${priceStr}\n` +
    links;

  return post({
    chat_id: TELEGRAM.chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: false,
  });
}
