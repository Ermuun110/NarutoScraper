# Cloud Deployment — Naruto Scraper (state of record)

Where and how this scraper runs in the cloud. Read this first next session before touching infra.

Last updated: 2026-07-04.

## TL;DR
- Runs 24/7 on a **Google Cloud VM in Tokyo**, pm2-managed, independent of the laptop.
- **4 of 5 platforms live:** Mercari, Rakuma, PayPay, YahooAuctions (~207 listings/cycle, every 5 min).
- **Mandarake** = not set up (needs one-time interactive login). Deliberately left for later.
- Cost covered by the **$300 free-trial credit until ~October 2026**. ~$7/mo after that.

## The VM
| Field | Value |
|---|---|
| GCP Project ID | `naruto-501315` |
| Project number | 195115937221 |
| Instance name | `naruto` |
| Zone | `asia-northeast1-a` (Tokyo) |
| Machine | e2-micro, 30GB standard disk, Debian 12 |
| External IP | 35.200.26.215 (ephemeral) |
| Process mgr | pm2, app name `naruto`, boot-persist via systemd (`pm2-ermuun.service`) |
| Swap | 2GB swapfile added (Chromium headroom) |
| Auth account | ermuunh@gmail.com |

(An earlier US VM named `crypto-bot` in us-central1-a was created then DELETED — ignore it.)

## Everyday control (never need the code editor for this)
```bash
gcloud compute ssh naruto --zone=asia-northeast1-a --project=naruto-501315
#   pm2 logs naruto      # watch live
#   pm2 restart naruto   # restart
#   pm2 stop naruto      # pause
#   pm2 list             # status
# stop the whole VM to save money:
gcloud compute instances stop naruto --zone=asia-northeast1-a --project=naruto-501315
gcloud compute instances start naruto --zone=asia-northeast1-a --project=naruto-501315
```

## How it was deployed (repeatable)
1. Create VM (above spec).
2. Enable Compute API: `gcloud services enable compute.googleapis.com`.
3. `scp` the repo tarball (exclude node_modules/.git) + `.env` to the VM.
4. On VM: install Node 20 (`deb.nodesource.com/setup_20.x`), `git`, `xvfb`; `npm install`; `npx playwright install --with-deps chromium`; `npm i -g pm2`.
5. Add 2GB swap (`fallocate /swapfile` + fstab).
6. `pm2 start ecosystem.config.cjs && pm2 save && pm2 startup systemd`.
7. `.env` lives ONLY on the VM (gitignored) — carries Telegram token/chat id + Anthropic key.

## The PayPay / YahooAuctions fix (important — don't regress)
Symptom: `page.goto` timed out (30s AND 60s, in US AND Tokyo) → not geo, a headless problem.
Cause: Yahoo-JP SPAs keep long-lived connections; `domcontentloaded`/`load` never fire under headless.
Fix (in `src/browser.js`, committed `e670b1e`):
- `waitUntil: 'commit'` (resolves on server response, before sub-resources) + fixed client-render wait (`waitMs`).
- Stealth: hide `navigator.webdriver`, JP locale + `Asia/Tokyo` timezone, realistic UA/viewport, `--disable-blink-features=AutomationControlled`.
- Abort image/font/media requests so a stalled asset can't hold the page.
Result: PayPay 0→111, Yahoo 0→7; per-cycle scanned 88→207.

## Why Tokyo and not free
- Scraper needs a **Japan IP** (PayPay/Yahoo/Mandarake block/stall non-JP).
- Google's **always-free tier is US-only** (Iowa/Oregon/S.Carolina) — no free Tokyo.
- So on Google: Japan + free are mutually exclusive → paying ~$7/mo for Tokyo.
- The **$300 90-day trial credit** currently absorbs that cost (until ~Oct 2026).

## Billing / free-tier timeline — ACTION NEEDED ~late September 2026
- Now → ~Oct: $300 trial credit covers the VM. $0 out of pocket. (~$7/mo burn, well under $300.)
- Trial end (~Oct): Google STOPS the VM if not upgraded, or CHARGES ~$7/mo if upgraded.
- Decision to make before then (pick one):
  1. Upgrade to paid, keep Google Tokyo (~$7/mo real money).
  2. **Migrate to Oracle Cloud Free Tier (Tokyo/Osaka) = $0 forever.** Always-free ARM Ampere (up to 4 cores/24GB). Signup needs a card for ID check (not charged); Tokyo capacity can be "out of stock" — retry over days. Same deploy steps as above.
- Recommend a **$5 budget alert**: Cloud Console → Billing → Budgets & alerts (not yet set).

## Remaining work
- **Mandarake (5th platform):** needs a one-time interactive login to get a session cookie
  (`npm run mandarake:login:vps` via xvfb on the VM). Fiddly on a headless server. Left for later by user choice.

## Unrelated leftover
- `crypto-bot-strategy-handoff.md` on the Desktop project is from an earlier crypto-bot tangent, NOT part of this scraper. Safe to ignore/delete.
