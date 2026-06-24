import * as cheerio from 'cheerio';
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { isSold } from '../util.js';

const PLATFORM = 'Mandarake';
const TOP = 'https://order.mandarake.co.jp/order/top/index?lang=ja';
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Persistent profile dir — cookies (region/session) survive between runs, so
// the one-time `npm run mandarake:login` warm-up keeps working headless.
export const PROFILE_DIR = fileURLToPath(new URL('../../.mandarake-profile', import.meta.url));

export function mandarakeContextOptions(headless = true) {
  return {
    headless,
    locale: 'ja-JP',
    userAgent: UA,
    viewport: { width: 1280, height: 900 },
    args: ['--disable-blink-features=AutomationControlled'],
  };
}

let ctxPromise = null;
let warmed = false;

// Mandarake drives ONE shared page through a persistent session, so concurrent
// keyword calls must not navigate it at the same time (causes ERR_ABORTED).
// Serialize every scrape through this promise chain.
let lock = Promise.resolve();
function withLock(fn) {
  const run = lock.then(fn, fn);
  lock = run.then(
    () => {},
    () => {},
  );
  return run;
}

async function getContext() {
  if (!ctxPromise) {
    ctxPromise = chromium.launchPersistentContext(PROFILE_DIR, mandarakeContextOptions(true));
  }
  return ctxPromise;
}

export async function closeMandarake() {
  if (ctxPromise) {
    const c = await ctxPromise;
    await c.close();
    ctxPromise = null;
    warmed = false;
  }
}

// Visit the order-site top once per process so the region/session cookie is
// present before we hit the search endpoint (a cold hit 302s to the corp site).
async function warmUp(page) {
  if (warmed) return;
  await page.goto(TOP, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);
  for (const sel of ['#modal_close', '.modal-close', 'button:has-text("閉じる")', 'a:has-text("閉じる")']) {
    try {
      const el = await page.$(sel);
      if (el) await el.click({ timeout: 1000 });
    } catch {
      /* no modal — fine */
    }
  }
  await page.waitForTimeout(500);
  warmed = true;
}

function extractId(href = '') {
  const m = href.match(/(?:itemCode|no)=([^&]+)/);
  return m ? m[1] : null;
}

function parsePrice(text = '') {
  const m = text.replace(/,/g, '').match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

export function scrapeMandarake(keyword) {
  return withLock(() => scrapeMandarakeImpl(keyword));
}

async function scrapeMandarakeImpl(keyword) {
  const ctx = await getContext();
  const page = ctx.pages()[0] || (await ctx.newPage());
  await warmUp(page);

  // soldOut=0 -> in-stock only.
  const url =
    'https://order.mandarake.co.jp/order/listPage/list' +
    `?keyword=${encodeURIComponent(keyword)}&lang=ja&soldOut=0`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000, referer: TOP });
  await page.waitForTimeout(2500);

  const finalUrl = page.url();
  if (!/order\.mandarake\.co\.jp/.test(finalUrl)) {
    throw new Error(
      `redirected to ${finalUrl} — no Mandarake session cookie. Run \`npm run mandarake:login\` once.`,
    );
  }

  const $ = cheerio.load(await page.content());
  const out = [];
  let soldSkipped = 0;

  // Item DOM (verified):
  //   .block > .basic > .itemno "nitem-XX;(0330314761)"
  //          > .pic .thum a[href="/order/detailPage/item?itemCode=1108053842&..."]
  //          > .title p a "<name>"
  //          > .price
  // Recommendations use `.mdk-recommend-*` so iterating `.title` skips them.
  $('.title').each((_, tEl) => {
    const $t = $(tEl);
    const $root = $t.closest('.block').length ? $t.closest('.block') : $t.parent();

    const $a = ($t.find('a[href]').first().length ? $t.find('a[href]') : $root.find('a[href]')).first();
    const href = $a.attr('href') || '';

    let id = extractId(href); // itemCode=1108053842
    if (!id) {
      const no = $root.find('.itemno').text().replace(/[^0-9]/g, '');
      if (no) id = no;
    }
    if (!id) return;

    if (isSold($, $root)) {
      soldSkipped++;
      return;
    }

    const title = $t.text().trim() || $a.text().trim();
    if (!title) return;

    const link = href.startsWith('http') ? href : `https://order.mandarake.co.jp${href}`;
    const $img = $root.find('img').first();
    const img = $img.attr('src') || $img.attr('data-src');

    out.push({
      platform: PLATFORM,
      id,
      title,
      price: parsePrice($root.find('.price').first().text()),
      url: link,
      imageUrl: img && img.startsWith('//') ? `https:${img}` : img,
    });
  });

  const deduped = out.filter(
    (() => {
      const seen = new Set();
      return (x) => (seen.has(x.id) ? false : seen.add(x.id));
    })(),
  );

  if (deduped.length === 0 && soldSkipped > 0) {
    console.log(`  Mandarake: ${soldSkipped} match(es) but all sold out — 0 in-stock.`);
  }

  return deduped;
}
