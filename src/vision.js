import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';
import { ANTHROPIC_API_KEY, HTTP } from './config.js';

const client = ANTHROPIC_API_KEY ? new Anthropic({ apiKey: ANTHROPIC_API_KEY }) : null;

const MEDIA = {
  '/9j/': 'image/jpeg',
  iVBOR: 'image/png',
  R0lGOD: 'image/gif',
  UklGR: 'image/webp',
};

function detectMedia(b64) {
  for (const [sig, type] of Object.entries(MEDIA)) {
    if (b64.startsWith(sig)) return type;
  }
  return 'image/jpeg';
}

async function fetchImageB64(url) {
  const res = await axios.get(url, { ...HTTP, responseType: 'arraybuffer' });
  return Buffer.from(res.data).toString('base64');
}

/**
 * Vision check for ambiguous listings: download the thumbnail and ask Claude
 * whether it is a Naruto Narutimate Data Carddas SAMPLE / promo card.
 * Returns true (alert), false (drop). Fails OPEN (true) so we never silently
 * miss a real card if the API hiccups.
 */
export async function isNarutimateSample({ title, imageUrl }) {
  if (!client || !imageUrl) return true;

  try {
    const b64 = await fetchImageB64(imageUrl);
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 10,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: detectMedia(b64), data: b64 },
            },
            {
              type: 'text',
              text:
                `Listing title: "${title}".\n` +
                'Is this image a Naruto "Narutimate" (ナルティメット) Data Carddas ' +
                'trading card that is a SAMPLE / promo / 見本 (often marked "SAMPLE")? ' +
                'Answer with exactly one word: YES or NO.',
            },
          ],
        },
      ],
    });
    const answer = (msg.content[0]?.text || '').trim().toUpperCase();
    return answer.startsWith('Y');
  } catch (err) {
    console.error('Vision check failed, alerting to be safe:', err.message);
    return true;
  }
}
