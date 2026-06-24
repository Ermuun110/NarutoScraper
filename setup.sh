#!/usr/bin/env bash
# One-shot setup for a fresh Ubuntu VM (Oracle Tokyo / any JP VPS).
# Run from inside the cloned repo:  bash setup.sh
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$REPO_DIR"

echo "==> Naruto Scraper setup  (dir: $REPO_DIR)"

# 1. System packages: Node 20, git, and the libs Playwright Chromium needs.
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | cut -dv -f2 | cut -d. -f1)" -lt 18 ]; then
  echo "==> Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
sudo apt-get install -y git xvfb

# 2. App deps + Chromium (with system deps).
echo "==> Installing npm packages..."
npm install
echo "==> Installing Chromium for Playwright..."
npx playwright install --with-deps chromium

# 3. .env — prompt for secrets if not present.
if [ ! -f .env ]; then
  echo "==> No .env found. Let's create one."
  read -rp "Telegram bot token: " TG_TOKEN
  read -rp "Telegram chat id:   " TG_CHAT
  read -rp "Anthropic API key (optional, press Enter to skip): " ANTHRO
  {
    echo "TELEGRAM_BOT_TOKEN=$TG_TOKEN"
    echo "TELEGRAM_CHAT_ID=$TG_CHAT"
    [ -n "$ANTHRO" ] && echo "ANTHROPIC_API_KEY=$ANTHRO"
  } > .env
  echo "==> .env written."
else
  echo "==> .env already exists, leaving it."
fi

# 4. Mandarake IP check (the go/no-go for that platform).
echo "==> Checking Mandarake reachability from this IP..."
CODE=$(curl -s -o /dev/null -w '%{http_code}' \
  'https://order.mandarake.co.jp/order/listPage/list?keyword=test&lang=ja' || echo 000)
if [ "$CODE" = "200" ]; then
  echo "    OK ($CODE) — Mandarake works on this IP. ✅"
else
  echo "    Got HTTP $CODE (redirect = gated). Mandarake may not work here."
  echo "    The other 4 platforms are fine. To try fixing Mandarake later:"
  echo "      npm run mandarake:login:vps   (or scp a working .mandarake-profile up)"
fi

# 5. Telegram smoke test.
echo "==> Sending a Telegram test message..."
npm run test:telegram || echo "    (Telegram test failed — check token/chat id in .env)"

# 6. pm2 — install, start, persist across reboots.
if ! command -v pm2 >/dev/null 2>&1; then
  echo "==> Installing pm2..."
  sudo npm install -g pm2
fi
echo "==> Starting under pm2..."
pm2 start ecosystem.config.cjs || pm2 restart naruto
pm2 save
echo ""
echo "==> To auto-start on reboot, run the command pm2 prints next:"
pm2 startup || true

echo ""
echo "============================================================"
echo " DONE. The bot is live, scanning every 5 minutes."
echo "   pm2 logs naruto     # watch output"
echo "   pm2 status          # is it running?"
echo "   pm2 restart naruto  # after code changes"
echo "============================================================"
