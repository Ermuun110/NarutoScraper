// One-time Mandarake warm-up. Opens a VISIBLE browser using the same persistent
// profile the scraper uses. Accept any country/region/cookie prompt and do one
// search so the order-site session cookie is stored. Then press Enter here.
import { chromium } from 'playwright';
import { PROFILE_DIR, mandarakeContextOptions } from './scrapers/mandarake.js';

const ctx = await chromium.launchPersistentContext(PROFILE_DIR, mandarakeContextOptions(false));
const page = ctx.pages()[0] || (await ctx.newPage());

await page.goto('https://order.mandarake.co.jp/order/listPage/list?keyword=' + encodeURIComponent('ナルト カード サンプル') + '&lang=ja');

console.log('\n=== Mandarake login ===');
console.log('A browser window opened.');
console.log('1. Accept any country/region/cookie prompt.');
console.log('2. Make sure you can SEE search results (listings).');
console.log('3. Come back here and press Enter to save the session.\n');

process.stdin.resume();
await new Promise((resolve) => process.stdin.once('data', resolve));

await ctx.close();
console.log('Session saved to .mandarake-profile. Headless scraping will reuse it.');
process.exit(0);
