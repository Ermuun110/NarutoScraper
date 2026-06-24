# Naruto Narutimate SAMPLE Scraper

Monitors 4 Japanese flea-market platforms every 5 minutes for **Naruto
Narutimate (ナルティメット) Data Carddas SAMPLE cards** and fires a Telegram
alert the moment a new listing appears.

Platforms: **Mercari JP**, **Mandarake**, **Rakuma (fril.jp)**, **PayPay Fleamarket**.

## How it works

1. Each cycle hits all 4 platforms in parallel for the keyword.
2. Every result title is run through a keyword filter (`src/filter.js`):
   - **match** → alert directly.
   - **ambiguous** (broad keyword hit) → download the thumbnail and ask Claude
     vision (`claude-haiku-4-5`) if it's really a Narutimate SAMPLE card.
   - **reject** → drop.
3. New listing IDs are tracked in `seen.json` so you never get a duplicate.
4. Alerts go out via the Telegram Bot API, with **both** a Buyee proxy link
   (one-click overseas order) and the original listing link.

## Active-only & Buyee links

- **Active only:** every source is filtered to on-sale items. Mercari uses
  `STATUS_ON_SALE` + a per-item status re-check; Rakuma uses `status=selling`;
  Mandarake uses `soldOut=0`; and all HTML sources additionally drop any card
  showing a sold marker (売り切れ / SOLD / 完売 etc.) via `src/util.js`.
- **Buyee links:** Mercari, Rakuma, and PayPay listings are converted to their
  `buyee.jp` proxy URL (`src/buyee.js`). Mandarake is **not** proxied by Buyee
  (it ships internationally directly), so Mandarake alerts use the native link.

The AI vision check **fails open** — if the API errors, the listing is alerted
rather than silently dropped.

## Setup

```bash
npm install
cp .env.example .env   # fill in your tokens
```

Required env: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.
Optional: `ANTHROPIC_API_KEY` (without it, ambiguous listings are alerted
without a vision check), `SEARCH_KEYWORD`, `CRON_SCHEDULE`.

Get a bot token from [@BotFather](https://t.me/BotFather). Get your chat ID by
messaging the bot then visiting
`https://api.telegram.org/bot<TOKEN>/getUpdates`.

## Run

```bash
npm start        # run on the cron schedule (default every 5 min)
npm run once     # single scan then exit (good for testing)
```

## Notes / caveats

- **Mercari** uses its internal JSON API (`api.mercari.jp`) — no headless
  browser needed. If Mercari adds token/DPoP enforcement, swap in Playwright.
- **Mandarake / Rakuma / PayPay** are HTML-scraped with cheerio. Their markup
  changes periodically; the selectors in `src/scrapers/*` are the only thing
  you'd need to adjust. Run `npm run once` and watch the per-platform result
  counts to spot a broken selector (count drops to 0).
- First run alerts nothing retroactively past the current live results — it
  seeds `seen.json` with whatever is already listed only after alerting on it,
  so the **very first run can be noisy**. Run it once, let it populate, done.
- Be polite: 5-minute interval is fine; don't crank it to seconds.

## Layout

```
src/
  index.js          cron orchestration + per-listing pipeline
  config.js         env, keyword, term lists, HTTP defaults
  filter.js         match / ambiguous / reject classifier
  vision.js         Claude vision check for ambiguous titles
  telegram.js       Telegram alert sender
  state.js          seen.json load/save (atomic)
  scrapers/
    mercari.js  mandarake.js  rakuma.js  paypay.js
```
