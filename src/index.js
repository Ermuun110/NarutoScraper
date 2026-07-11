import cron from 'node-cron';
import { CHANNELS, CRON_SCHEDULE, HEARTBEAT } from './config.js';
import { loadState, isSeen, markSeen, saveState } from './state.js';
import { classify } from './filter.js';
import { isNarutimateSample } from './vision.js';
import { sendAlert, sendRaw } from './telegram.js';
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

// Run one scraper across a keyword set, merging + de-duping its own results.
async function runScraper(fn, keywords) {
  const settled = await Promise.allSettled(keywords.map((kw) => fn(kw)));
  const byId = new Map();
  let firstError = null;
  for (let i = 0; i < settled.length; i++) {
    const r = settled[i];
    const kw = keywords[i];
    if (r.status === 'fulfilled') {
      for (const item of r.value) if (item.id && !byId.has(item.id)) byId.set(item.id, { ...item, keyword: kw });
    } else if (!firstError) {
      firstError = r.reason;
    }
  }
  // Only surface an error if every keyword failed (total platform outage).
  if (byId.size === 0 && firstError) throw firstError;
  return [...byId.values()];
}

async function collect(keywords) {
  const settled = await Promise.allSettled(
    SCRAPERS.map(([name, fn]) => runScraper(fn, keywords).then((items) => ({ name, items }))),
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

  try {
    let totalScanned = 0;
    let totalAlerted = 0;

    // Each channel has its own keyword set, filter, and destination chat. A
    // listing is tracked per-channel (key prefixed with channel name) so the
    // same item can legitimately alert to two chats.
    for (const channel of CHANNELS) {
      console.log(`\n[${started}] [${channel.name}] Scanning for [${channel.keywords.join(' | ')}]...`);
      const listings = await collect(channel.keywords);
      totalScanned += listings.length;

      for (const item of listings) {
        const key = `${channel.name}:${item.platform}:${item.id}`;
        if (!item.id || isSeen(key)) continue;

        // Collapse the newline/space runs that HTML scrapers pick up.
        item.title = (item.title || '').replace(/\s+/g, ' ').trim();

        // 'all' channels alert on everything; 'naruto-sample' runs classify().
        if (channel.filter !== 'all') {
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
        }

        const { buyeeUrl } = toBuyee(item.platform, item.id, item.url);
        const sent = await sendAlert({ ...item, buyeeUrl }, channel.chatId);
        if (sent) {
          markSeen(key);
          totalAlerted++;
          console.log(`  ALERT [${channel.name}][${item.platform}] ${item.title}`);
          // Stay under Telegram's ~20 msg/min per-chat limit. Without this a
          // burst of new matches 429s, sends fail, listings never get marked
          // seen, and every cycle re-floods the same wall — starving genuinely
          // new listings. 3.2s/msg ~= 18/min.
          await new Promise((r) => setTimeout(r, 3200));
        }
      }
    }

    await saveState();
    console.log(`Cycle done. ${totalScanned} scanned, ${totalAlerted} new alert(s).`);
  } catch (err) {
    console.error('Cycle error:', err);
  } finally {
    // Free Chromium between cycles so idle RAM ~0 (cookies persist on disk, so
    // the next cycle just re-warms in ~2s). Big win on free/small VPS tiers.
    await closeMandarake().catch(() => { });
    running = false;
  }
}

async function main() {
  await loadState();
  console.log('Naruto SAMPLE scraper started.');
  console.log(`Schedule: ${CRON_SCHEDULE}`);
  for (const c of CHANNELS) {
    console.log(`  Channel [${c.name}] -> chat ${c.chatId} | filter ${c.filter} | keywords: ${c.keywords.join(', ')}`);
  }

  // Run immediately on boot, then on schedule.
  await runCycle();

  if (process.env.RUN_ONCE) {
    console.log('RUN_ONCE set — exiting.');
    await closeBrowser();
    await closeMandarake();
    return;
  }

  cron.schedule(CRON_SCHEDULE, runCycle);

  if (HEARTBEAT) {
    // Rude-but-not-slur ribbing so you know the bot's still alive. First one
    // fires 10 min after boot (so you can verify), then every 5 hours.
    const HEARTBEAT_MSGS = [
      'What are you brokies up to',
      'People are making money while you two fucking losers are jacking off',
      'Still grinding while you do nothing',
      'Broke ass losers',
      'Bot working. You two? Doubt it.',
      'Another 5 hours, still smarter than you',
      'What did you two fuckers do today? Probably nothing productive',
      'You two still pretending to work or is this just another circlejerk session?',
      'Real ones are building while you two sit there with your thumbs up your asses',
      'Another day of zero progress. Proud of yourselves?',
      'Keep coping while I actually ship shit',
      'You two are allergic to productivity',
      'Bot’s live. You two still in bed?',
      'How many more days you gonna waste before you do something?',
      'Grinding my ass off while you two master the art of doing fuck all',
      'You two are the reason “working on it” became a meme',
      'Broke, lazy, and delusional. The holy trinity.',
      'Another 6 hours and still nothing to show. Legendary work ethic.',
      'You two make watching paint dry look productive',
      'Keep telling yourselves you’re “planning”. I’m actually executing.',
      'You two are so unproductive it’s actually impressive',
      'Bot working 24/7. You two working on your next excuse.',
      'Another day, another nothing from the dynamic duo of doing fuck all',
      'Keep jacking off to the idea of working. I’ll keep actually working.',
      'You two are allergic to shipping anything',
      'Progress report from you two: still nothing. Noted.'
    ];
    const beat = () =>
      sendRaw(HEARTBEAT_MSGS[Math.floor(Math.random() * HEARTBEAT_MSGS.length)]);
    const FIVE_HOURS = 5 * 60 * 60 * 1000;
    setTimeout(() => {
      beat();
      setInterval(beat, FIVE_HOURS);
    }, 10 * 60 * 1000);
    console.log('Heartbeat ON — first in 10 min, then every 5h.');
  }
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
