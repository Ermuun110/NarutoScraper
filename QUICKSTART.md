# Quickstart — for the person setting up the server

You need: a fresh **Ubuntu** VM in a **Japan (Tokyo)** region (Oracle Always-Free
ARM is ideal), and its SSH login.

## Oracle account (read first)

- **Home region = Japan (Tokyo, `ap-northeast-1`)** — chosen at signup, **permanent**.
- **Turn OFF any VPN/proxy** during signup. Oracle blocks "masked location"
  signups. Use a normal home internet connection (a Japanese one is best — real
  JP IP + phone + card pass verification cleanly).
- Instance shape: **VM.Standard.A1.Flex (ARM, Always Free)**, image **Ubuntu**.
- Open an SSH key when creating the instance; note the **public IP**.

## Then: 3 steps on the VM

```bash
# 1. SSH in
ssh ubuntu@YOUR_VM_IP

# 2. Get the code
git clone <REPO_URL> naruto && cd naruto
#   (or: scp the project folder up if not using GitHub)

# 3. Run the installer — it does everything
bash setup.sh
```

`setup.sh` installs Node + Chromium + pm2, asks for the Telegram bot token and
chat id (paste them when prompted), tests Telegram, checks Mandarake, and starts
the bot 24/7. When it finishes, it's already running.

## Verify it's live

```bash
pm2 status            # should show "naruto" online
pm2 logs naruto       # watch it scan every 5 min
```

You should get a Telegram test message during setup, then real alerts as new
SAMPLE cards appear.

## Notes

- The Telegram **bot token + chat id** come from the owner — paste them when
  `setup.sh` asks. They are stored only in `.env` on this server, never in git.
- If `setup.sh` says Mandarake got a redirect (not HTTP 200), the other 4
  platforms still work; Mandarake can be fixed later with
  `npm run mandarake:login:vps`.
- Reboot-safe: run the `pm2 startup` line the script prints at the end.
