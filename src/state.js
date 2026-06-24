import { readFile, writeFile, rename } from 'node:fs/promises';
import { STATE_FILE } from './config.js';

// seen.json shape: { "<platform>:<id>": <epoch ms first seen> }
let seen = null;

export async function loadState() {
  try {
    const raw = await readFile(STATE_FILE, 'utf8');
    seen = JSON.parse(raw);
  } catch (err) {
    if (err.code !== 'ENOENT') console.error('State read failed, starting fresh:', err.message);
    seen = {};
  }
  return seen;
}

export function isSeen(key) {
  return Object.prototype.hasOwnProperty.call(seen, key);
}

export function markSeen(key) {
  seen[key] = Date.now();
}

// Atomic write: temp file + rename, so a crash mid-write cannot corrupt state.
export async function saveState() {
  const tmp = `${STATE_FILE}.tmp`;
  await writeFile(tmp, JSON.stringify(seen, null, 2), 'utf8');
  await rename(tmp, STATE_FILE);
}
