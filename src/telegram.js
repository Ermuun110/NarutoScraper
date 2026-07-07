import axios from 'axios';
import { TELEGRAM } from './config.js';

const API = `https://api.telegram.org/bot${TELEGRAM.token}/sendMessage`;

const esc = (s = '') =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export async function sendRaw(text) {
  try {
    await axios.post(API, { chat_id: TELEGRAM.chatId, text });
  } catch (err) {
    console.error('Telegram sendRaw failed:', err.response?.data?.description || err.message);
  }
}

export async function sendAlert(listing) {
  const { platform, title, price, url, buyeeUrl } = listing;
  const priceStr = price != null ? `¥${Number(price).toLocaleString('ja-JP')}` : '—';

  // Prefer the Buyee proxy link (one-click order for overseas buyers). Keep
  // the native link as a secondary reference. Mandarake has no Buyee proxy, so
  // buyeeUrl is null there and only the native link shows.
  const links = buyeeUrl
    ? `🛒 Buyee: ${esc(buyeeUrl)}\n🔗 Original: ${esc(url)}`
    : `🔗 ${esc(url)}`;

  const text =
    `🔥 <b>New listing</b> [${esc(platform)}]\n\n` +
    `${esc(title)}\n` +
    `💴 ${priceStr}\n` +
    links;

  try {
    await axios.post(API, {
      chat_id: TELEGRAM.chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: false,
    });
    return true;
  } catch (err) {
    console.error('Telegram send failed:', err.response?.data?.description || err.message);
    return false;
  }
}
