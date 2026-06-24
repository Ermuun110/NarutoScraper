import axios from 'axios';
import * as cheerio from 'cheerio';
import { HTTP } from '../config.js';
import { isSold } from '../util.js';

const PLATFORM = 'YahooAuctions';

function extractId(href = '') {
  // /jp/auction/x1234567890
  const m = href.match(/\/auction\/([a-zA-Z0-9]+)/);
  return m ? m[1] : null;
}

function parsePrice(text = '') {
  const m = text.replace(/,/g, '').match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

export async function scrapeYahooAuctions(keyword) {
  // s1=new o1=d -> sort by newest first. Default search lists open auctions.
  const url =
    'https://auctions.yahoo.co.jp/search/search' +
    `?p=${encodeURIComponent(keyword)}&exflg=1&b=1&n=50&s1=new&o1=d`;

  const res = await axios.get(url, HTTP);
  const $ = cheerio.load(res.data);
  const out = [];

  $('.Product, li.Product, .Products__list .Product').each((_, el) => {
    const $el = $(el);
    const $link = $el.find('a.Product__titleLink, a[href*="/auction/"]').first();
    const href = $link.attr('href') || '';
    const id = extractId(href);
    if (!id) return;
    if (isSold($, $el)) return; // skip ended/closed listings

    const title =
      $el.find('.Product__title, .Product__titleLink').first().text().trim() ||
      $link.attr('title') ||
      $el.find('img').attr('alt') ||
      '';
    if (!title) return;

    const priceText = $el
      .find('.Product__priceValue, .Product__price')
      .first()
      .text();
    const img =
      $el.find('img.Product__imageData, img').attr('src') ||
      $el.find('img').attr('data-src');

    out.push({
      platform: PLATFORM,
      id,
      title: title.trim(),
      price: parsePrice(priceText),
      url: href.startsWith('http') ? href : `https://page.auctions.yahoo.co.jp/jp/auction/${id}`,
      imageUrl: img && img.startsWith('//') ? `https:${img}` : img,
    });
  });

  const seen = new Set();
  return out.filter((x) => (seen.has(x.id) ? false : seen.add(x.id)));
}
