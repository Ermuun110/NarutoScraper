# Deploying to a Japan VPS

Why Japan: Mandarake 302-redirects non-Japan / datacenter IPs to its corporate
site. A Tokyo VPS (Vultr / ConoHa / Sakura) gets a JP IP, so Mandarake works
like the other platforms. The other 4 platforms work from anywhere.

## The workflow (after first-time setup)

```
# ON YOUR MAC — edit + test
vim src/...            # make changes
npm run once           # test locally
git add -A && git commit -m "tweak X"
git push

# DEPLOY — one command from your Mac
npm run deploy         # ssh into VPS, git pull, npm install, pm2 restart
```

`npm run deploy` is just the line in package.json — edit the host there once
(see below). Code moves over git. `.env` and `.mandarake-profile/` never leave
the VPS (they're gitignored).

---

## First-time setup

### 1. Push this repo to GitHub (from your Mac)

```bash
git add -A && git commit -m "initial"
gh repo create naruto-scraper --private --source=. --push
# or: create a repo on github.com, then:
# git remote add origin git@github.com:YOU/naruto-scraper.git && git push -u origin main
```

### 2. Provision the VPS

Pick a Tokyo region instance (1GB RAM is plenty). Then SSH in and:

```bash
# Node 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git

# Playwright needs system libs for Chromium; xvfb only for the one-time login
sudo apt-get install -y xvfb

# clone + install
git clone git@github.com:YOU/naruto-scraper.git ~/naruto
cd ~/naruto
npm install
npx playwright install --with-deps chromium

# pm2 process manager
sudo npm install -g pm2
```

### 3. Secrets on the VPS (once)

```bash
cd ~/naruto
cp .env.example .env
nano .env          # paste TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, (optional) ANTHROPIC_API_KEY
```

### 4. Mandarake session on the VPS (once)

The VPS has no display, so run the login under a virtual one:

```bash
npm run mandarake:login:vps
```

If the JP IP isn't gated, Mandarake may not even need this — test with
`npm run once` first; only do the login if you see the redirect error.
(Alternative: copy your Mac's working `.mandarake-profile/` up with
`scp -r .mandarake-profile vps:~/naruto/`.)

### 5. Start it under pm2

```bash
pm2 start ecosystem.config.cjs
pm2 save                 # remember across reboots
pm2 startup              # run the line it prints (enables boot autostart)
```

Check it:

```bash
pm2 logs naruto          # live output
pm2 status               # running?
```

---

## Day-to-day

- **Change code:** edit on Mac → `npm run once` → commit/push → `npm run deploy`.
- **See logs:** `ssh vps 'pm2 logs naruto --lines 50'`.
- **Restart:** `ssh vps 'pm2 restart naruto'`.
- **Mandarake session expired (months):** `ssh vps` then `cd ~/naruto && npm run mandarake:login:vps`.

## Set your host

In `package.json`, edit the `deploy` script's `VPS` to your `user@host`.
