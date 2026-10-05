import axios from 'axios';
import * as cheerio from 'cheerio';
import { HTTP } from './config.js';
import { fetchMercariDescription } from './scrapers/mercari.js';

// Search APIs return titles only, but every platform's keyword search also
// matches descriptions — so a real hit can have "sample" only in the
// description. These fetch that text so classify() can see it.

const page = async (url) => (await axios.get(url, HTTP)).data;
const og = ($) => $('meta[property="og:description"]').attr('content') || '';

async function fetchRakuma(id) {
  const $ = cheerio.load(await page(`https://item.fril.jp/${id}`));
  return $('.item__description').first().text() || og($);
}

async function fetchPayPay(id) {
  const $ = cheerio.load(await page(`https://paypayfleamarket.yahoo.co.jp/item/${id}`));
  return og($);
}

async function fetchYahooAuctions(id) {
  const html = await page(`https://page.auctions.yahoo.co.jp/jp/auction/${id}`);
  const $ = cheerio.load(html);
  // Full text is in __NEXT_DATA__ (descriptionHtml); og:description is a fallback.
  const m = html.match(/"descriptionHtml":"((?:[^"\\]|\\.)*)"/);
  if (m) {
    try {
      return cheerio.load(JSON.parse(`"${m[1]}"`)).text();
    } catch {}
  }
  return og($);
}

const FETCHERS = {
  Mercari: fetchMercariDescription,
  Rakuma: fetchRakuma,
  PayPayFleamarket: fetchPayPay,
  YahooAuctions: fetchYahooAuctions,
};

// Boilerplate that says "sample" but means "the photo is just an example"
// (very common on Rakuma/PayPay) — not a sample card. Strip before matching.
const PHOTO_BOILERPLATE = [
  /(商品|画像|写真|イラスト|イメージ)[^。\n]{0,15}サンプル(です|となります|になります)/g,
  /サンプル(画像|写真|イメージ|イラスト)/g,
  /サンプル盤/g, // "we don't sell promo/sample discs" CD-shop boilerplate
];

// 見本 in a description almost always means "photo is just an example", so it
// is dropped entirely (titles still match 見本 normally via classify()).
export const sanitize = (text) =>
  PHOTO_BOILERPLATE.reduce((t, re) => t.replace(re, ' '), text).replace(/見本/g, ' ');

// Mercari Shops items (non-"m123..." ids) have no description endpoint.
export const canDescribe = (platform, id) =>
  platform in FETCHERS && (platform !== 'Mercari' || /^m\d+$/.test(id));

// Description text ready for classify(), or '' on failure/unsupported.
export async function fetchDescription(platform, id) {
  try {
    const text = await FETCHERS[platform]?.(id);
    return sanitize((text || '').replace(/\s+/g, ' ').trim());
  } catch {
    return '';
  }
}
