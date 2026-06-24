import { chromium } from 'playwright';

// Lazily-launched shared browser so we don't spawn Chromium every cron tick.
let browserPromise = null;

function launch() {
  return chromium.launch({ headless: true });
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
export async function fetchRendered(url, { waitMs = 2500, locale = 'ja-JP' } = {}) {
  const browser = await getBrowser();
  const ctx = await browser.newContext({
    locale,
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });
  const page = await ctx.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(waitMs);
    return { html: await page.content(), finalUrl: page.url() };
  } finally {
    await ctx.close();
  }
}
