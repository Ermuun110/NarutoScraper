import axios from 'axios';
import * as cheerio from 'cheerio';
import { HTTP } from '../config.js';
import { isSold } from '../util.js';

const PLATFORM = 'Rakuma';

function extractId(href = '') {
  // Current Rakuma item URLs: https://item.fril.jp/{hash}
  const m = href.match(/item\.fril\.jp\/([0-9a-zA-Z]+)/) || href.match(/\/items\/([^/?#]+)/);
  return m ? m[1] : null;
}

function parsePrice(text = '') {
  const m = text.replace(/,/g, '').match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

export async function scrapeRakuma(keyword) {
  const url =
    'https://fril.jp/s' +
    `?query=${encodeURIComponent(keyword)}&sort=created_at&order=desc`;

  const res = await axios.get(url, HTTP);
  const $ = cheerio.load(res.data);
  const out = [];

  $('.item-box').each((_, el) => {
    const $el = $(el);
    const $link = $el.find('a.link_search_image, a[href*="item.fril.jp"]').first();
    const href = $link.attr('href') || '';
    const id = extractId(href);
    if (!id) return;
    if (isSold($, $el)) return; // 7-ish of 40 cards are SOLD-marked

    const title =
      $el.find('.item-box__item-name').first().text().trim() ||
      $link.attr('title') ||
      $el.find('img').attr('alt') ||
      '';
    if (!title) return;

    // Thumbnails are lazy-loaded: src is a dummy, real URL in data-original.
    const $img = $el.find('img').first();
    const img = $img.attr('data-original') || $img.attr('src');

    out.push({
      platform: PLATFORM,
      id,
      title: title.trim(),
      price: parsePrice(
        $el.find('.item-box__item-price, .price-status__price').first().text(),
      ),
      url: href.startsWith('http') ? href : `https://item.fril.jp/${id}`,
      imageUrl: img && img.startsWith('//') ? `https:${img}` : img,
    });
  });

  const seen = new Set();
  return out.filter((x) => (seen.has(x.id) ? false : seen.add(x.id)));
}
