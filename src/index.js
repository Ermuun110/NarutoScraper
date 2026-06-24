import cron from 'node-cron';
import { KEYWORDS, CRON_SCHEDULE } from './config.js';
import { loadState, isSeen, markSeen, saveState } from './state.js';
import { classify } from './filter.js';
import { isNarutimateSample } from './vision.js';
import { sendAlert } from './telegram.js';
import { toBuyee } from './buyee.js';
import { closeBrowser } from './browser.js';

import { scrapeMercari } from './scrapers/mercari.js';
import { scrapeMandarake, closeMandarake } from './scrapers/mandarake.js';
import { scrapeRakuma } from './scrapers/rakuma.js';
import { scrapePayPay } from './scrapers/paypay.js';
import { scrapeYahooAuctions } from './scrapers/yahooauctions.js';

const SCRAPERS = [
  ['Mercari', scrapeMercari],
  ['Mandarake', scrapeMandarake],
  ['Rakuma', scrapeRakuma],
  ['PayPay', scrapePayPay],
  ['YahooAuctions', scrapeYahooAuctions],
];

let running = false;

// Run one scraper across all keywords, merging + de-duping its own results.
async function runScraper(fn) {
  const settled = await Promise.allSettled(KEYWORDS.map((kw) => fn(kw)));
  const byId = new Map();
  let firstError = null;
  for (const r of settled) {
    if (r.status === 'fulfilled') {
      for (const item of r.value) if (item.id && !byId.has(item.id)) byId.set(item.id, item);
    } else if (!firstError) {
      firstError = r.reason;
    }
  }
  // Only surface an error if every keyword failed (total platform outage).
  if (byId.size === 0 && firstError) throw firstError;
  return [...byId.values()];
}

async function collect() {
  const settled = await Promise.allSettled(
    SCRAPERS.map(([name, fn]) => runScraper(fn).then((items) => ({ name, items }))),
  );

  const all = [];
  for (let i = 0; i < settled.length; i++) {
    const r = settled[i];
    const name = SCRAPERS[i][0];
    if (r.status === 'fulfilled') {
      console.log(`  ${name}: ${r.value.items.length} results`);
      all.push(...r.value.items);
    } else {
      console.error(`  ${name}: FAILED — ${r.reason?.message || r.reason}`);
    }
  }
  return all;
}

async function runCycle() {
  if (running) {
    console.log('Previous cycle still running, skipping.');
    return;
  }
  running = true;
  const started = new Date().toISOString();
  console.log(`\n[${started}] Scanning for [${KEYWORDS.join(' | ')}]...`);

  try {
    const listings = await collect();
    let alerted = 0;

    for (const item of listings) {
      const key = `${item.platform}:${item.id}`;
      if (!item.id || isSeen(key)) continue;

      // Collapse the newline/space runs that HTML scrapers pick up.
      item.title = (item.title || '').replace(/\s+/g, ' ').trim();

      const verdict = classify(item.title);
      if (verdict === 'reject') continue;

      // Ambiguous keyword match -> confirm with AI vision check.
      if (verdict === 'ambiguous') {
        const ok = await isNarutimateSample(item);
        if (!ok) {
          markSeen(key); // remember rejection so we don't re-check every cycle
          continue;
        }
      }

      const { buyeeUrl } = toBuyee(item.platform, item.id, item.url);
      const sent = await sendAlert({ ...item, buyeeUrl });
      if (sent) {
        markSeen(key);
        alerted++;
        console.log(`  ALERT [${item.platform}] ${item.title}`);
      }
    }

    await saveState();
    console.log(`Cycle done. ${listings.length} scanned, ${alerted} new alert(s).`);
  } catch (err) {
    console.error('Cycle error:', err);
  } finally {
    // Free Chromium between cycles so idle RAM ~0 (cookies persist on disk, so
    // the next cycle just re-warms in ~2s). Big win on free/small VPS tiers.
    await closeMandarake().catch(() => {});
    running = false;
  }
}

async function main() {
  await loadState();
  console.log('Naruto SAMPLE scraper started.');
  console.log(`Schedule: ${CRON_SCHEDULE} | Keywords: ${KEYWORDS.join(', ')}`);

  // Run immediately on boot, then on schedule.
  await runCycle();

  if (process.env.RUN_ONCE) {
    console.log('RUN_ONCE set — exiting.');
    await closeBrowser();
    await closeMandarake();
    return;
  }

  cron.schedule(CRON_SCHEDULE, runCycle);
}

// Clean up browsers on shutdown.
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, async () => {
    await closeBrowser();
    await closeMandarake();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
