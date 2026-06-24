// Sends a single test message to confirm TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID work.
import { sendAlert } from './telegram.js';

const ok = await sendAlert({
  platform: 'TEST',
  title: 'Telegram test — if you see this, the bot works ✅',
  price: 1234,
  url: 'https://jp.mercari.com/',
  buyeeUrl: 'https://buyee.jp/mercari/',
});

console.log(ok ? 'Sent. Check your Telegram.' : 'FAILED — check token/chat ID (see error above).');
process.exit(ok ? 0 : 1);
