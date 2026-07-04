import * as cheerio from 'cheerio';
import { fetchRendered } from '../browser.js';
import { isSold } from '../util.js';

const PLATFORM = 'PayPayFleamarket';

function extractId(href = '') {
  const m = href.match(/\/item\/([^/?#]+)/);
  return m ? m[1] : null;
}

function parsePrice(text = '') {
  const m = text.replace(/,/g, '').match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

export async function scrapePayPay(keyword) {
  // PayPay's search is path-based (/search/{keyword}); the old ?q= form 404s.
  const url =
    'https://paypayfleamarket.yahoo.co.jp/search/' +
    `${encodeURIComponent(keyword)}?sort=-created&open=1`;

  const { html } = await fetchRendered(url);
  const $ = cheerio.load(html);
  const out = [];

  // PayPay markup changes often; target any anchor that points at an item.
  $('a[href*="/item/"]').each((_, el) => {
    const $el = $(el);
    const href = $el.attr('href') || '';
    const id = extractId(href);
    if (!id) return;
    if (isSold($, $el)) return; // drop SOLD-badged cards

    const title =
      $el.attr('aria-label') ||
      $el.find('[class*="title"], [class*="Title"]').first().text().trim() ||
      $el.find('img').attr('alt') ||
      '';
    if (!title) return;

    const priceText =
      $el.find('[class*="price"], [class*="Price"]').first().text() || $el.text();
    const img = $el.find('img').attr('src') || $el.find('img').attr('data-src');

    out.push({
      platform: PLATFORM,
      id,
      title: title.trim(),
      price: parsePrice(priceText),
      url: href.startsWith('http') ? href : `https://paypayfleamarket.yahoo.co.jp/item/${id}`,
      imageUrl: img && img.startsWith('//') ? `https:${img}` : img,
    });
  });

  // De-dup: the same item may appear in multiple nested anchors.
  const seen = new Set();
  return out.filter((x) => (seen.has(x.id) ? false : seen.add(x.id)));
}
