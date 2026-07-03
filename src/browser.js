import { chromium } from 'playwright';

// Lazily-launched shared browser so we don't spawn Chromium every cron tick.
let browserPromise = null;

function launch() {
  return chromium.launch({
    headless: true,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-dev-shm-usage',
    ],
  });
}

export async function getBrowser() {
  if (!browserPromise) browserPromise = launch();
  let browser = await browserPromise;
  if (!browser.isConnected()) {
    browserPromise = launch();
    browser = await browserPromise;
  }
  return browser;
}

export async function closeBrowser() {
  if (browserPromise) {
    const b = await browserPromise;
    await b.close();
    browserPromise = null;
  }
}

// Fetch fully-rendered HTML for a URL. Returns { html, finalUrl }.
//
// PayPay Flea Market and Yahoo Auctions are Yahoo-JP SPAs that keep long-lived
// connections open, so `domcontentloaded` / `load` never fire and page.goto
// times out even at 60s. Fix: waitUntil 'commit' (resolves the moment the
// server responds, before sub-resources), then give the SPA a fixed window to
// render client-side before reading content. Plus stealth hardening + blocking
// heavy resources so the render window is enough.
export async function fetchRendered(url, { waitMs = 4500, locale = 'ja-JP' } = {}) {
  const browser = await getBrowser();
  const ctx = await browser.newContext({
    locale,
    timezoneId: 'Asia/Tokyo',
    viewport: { width: 1280, height: 800 },
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    extraHTTPHeaders: {
      'Accept-Language': 'ja-JP,ja;q=0.9,en;q=0.8',
    },
  });

  // Hide the headless/automation tells that Yahoo-JP checks for.
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'languages', { get: () => ['ja-JP', 'ja', 'en'] });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    window.chrome = { runtime: {} };
  });

  // Drop images / fonts / media so a stalled asset can't hold the page.
  await ctx.route('**/*', (route) => {
    const type = route.request().resourceType();
    if (type === 'image' || type === 'font' || type === 'media') return route.abort();
    return route.continue();
  });

  const page = await ctx.newPage();
  try {
    await page.goto(url, { waitUntil: 'commit', timeout: 60000 });
    // SPA renders client-side after commit; let it paint, then read.
    await page.waitForTimeout(waitMs);
    return { html: await page.content(), finalUrl: page.url() };
  } finally {
    await ctx.close();
  }
}
