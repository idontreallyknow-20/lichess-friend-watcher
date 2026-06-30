/*
 * Standalone 24/7 Lichess watcher.
 *
 * Runs outside the browser (Node 18+), polls a user's live status, and pushes a
 * notification when they start a new game. Because it runs on a host (a small
 * VPS, a Raspberry Pi, Railway/Render/Fly, etc.) it keeps watching even when no
 * browser is open.
 *
 * Configure with environment variables:
 *   LICHESS_USER   (required)  username to watch
 *   NTFY_TOPIC     (optional)  ntfy.sh topic for phone push (see README)
 *   NTFY_SERVER    (optional)  ntfy base URL (default https://ntfy.sh)
 *   WEBHOOK_URL    (optional)  generic webhook; receives JSON { text, url }
 *   POLL_MS        (optional)  poll interval in ms (default 8000, min 5000)
 *
 * If neither NTFY_TOPIC nor WEBHOOK_URL is set, it just logs to the console.
 *
 * Run:  LICHESS_USER=thibault NTFY_TOPIC=my-secret-topic node server/watcher.mjs
 */

const USER = process.env.LICHESS_USER;
const NTFY_TOPIC = process.env.NTFY_TOPIC;
const NTFY_SERVER = process.env.NTFY_SERVER || 'https://ntfy.sh';
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const POLL_MS = Math.max(5000, Number(process.env.POLL_MS) || 8000);

if (!USER) {
  console.error('Error: set LICHESS_USER (the username to watch).');
  process.exit(1);
}

const STATUS_URL = `https://lichess.org/api/users/status?ids=${encodeURIComponent(USER)}&withGameIds=true`;
const TEST = process.argv.includes('--test') || process.env.TEST === '1';

let lastNotifiedGameId = null;

function log(...args) {
  console.log(new Date().toISOString(), ...args);
}

/** Send one push to every configured channel. */
async function push(text, url) {
  log(`PUSH: ${text} -> ${url}`);

  if (NTFY_TOPIC) {
    try {
      await fetch(`${NTFY_SERVER}/${encodeURIComponent(NTFY_TOPIC)}`, {
        method: 'POST',
        body: text,
        headers: {
          Title: 'Lichess Friend Watcher',
          Click: url,
          Tags: 'chess_pawn',
        },
      });
    } catch (e) {
      log('ntfy push failed:', e.message);
    }
  }

  if (WEBHOOK_URL) {
    try {
      await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // `content` covers Discord; `text` covers Slack and generic webhooks.
        body: JSON.stringify({ content: `${text}\n${url}`, text: `${text}\n${url}`, url }),
      });
    } catch (e) {
      log('webhook push failed:', e.message);
    }
  }
}

async function notify(name, gameId) {
  await push(`${name} is playing`, `https://lichess.org/${gameId}`);
}

async function poll() {
  try {
    const res = await fetch(STATUS_URL);
    if (!res.ok) {
      log(`status request failed (${res.status})`);
      return;
    }
    const data = await res.json();
    const entry = Array.isArray(data) ? data[0] : null;
    if (!entry) {
      log(`user "${USER}" not found in status response`);
      return;
    }

    const name = entry.name || USER;
    const gameId = entry.playing ? entry.playingId || null : null;

    if (!gameId) {
      // Not playing: reset so the next game notifies again.
      if (lastNotifiedGameId !== null) log(`${name} stopped playing`);
      lastNotifiedGameId = null;
      return;
    }

    if (gameId !== lastNotifiedGameId) {
      lastNotifiedGameId = gameId;
      await notify(name, gameId);
    }
  } catch (e) {
    log('poll error:', e.message);
  }
}

log(`Watching "${USER}" every ${POLL_MS}ms.`);
log(
  NTFY_TOPIC
    ? `Pushing to ntfy topic "${NTFY_TOPIC}".`
    : WEBHOOK_URL
      ? 'Pushing to configured webhook.'
      : 'No push channel configured; logging to console only.',
);

if (TEST) {
  log('Test mode: sending one push now so you can confirm your phone receives it.');
  await push(`Test push for ${USER}`, `https://lichess.org/@/${encodeURIComponent(USER)}`);
}

poll();
setInterval(poll, POLL_MS);
