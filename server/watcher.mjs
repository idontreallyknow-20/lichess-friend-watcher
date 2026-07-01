/*
 * Standalone 24/7 Lichess watcher.
 *
 * Runs outside the browser (Node 18+), polls a user's live status, and pushes
 * notifications when they start playing. It also watches finished games, sends
 * funny recap messages every few games, and calls out streaks.
 *
 * Configure with environment variables:
 *   LICHESS_USER          (required)  username to watch
 *   NTFY_TOPIC            (optional)  ntfy.sh topic for phone push (see README)
 *   NTFY_SERVER           (optional)  ntfy base URL (default https://ntfy.sh)
 *   WEBHOOK_URL           (optional)  generic webhook; receives JSON { text, url }
 *   POLL_MS               (optional)  live poll interval in ms (default 8000, min 5000)
 *   GAMES_POLL_MS         (optional)  result poll interval in ms (default 30000, min 15000)
 *   PLAYING_COOLDOWN_MS   (optional)  quiet time before another "is playing" push (default 420000)
 *   RECAP_EVERY_GAMES     (optional)  send recap every N finished games (default 5)
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
const GAMES_POLL_MS = Math.max(15000, Number(process.env.GAMES_POLL_MS) || 30000);
const PLAYING_COOLDOWN_MS = Math.max(
  60000,
  Number(process.env.PLAYING_COOLDOWN_MS) || 7 * 60 * 1000,
);
const RECAP_EVERY_GAMES = Math.max(1, Number(process.env.RECAP_EVERY_GAMES) || 5);

if (!USER) {
  console.error('Error: set LICHESS_USER (the username to watch).');
  process.exit(1);
}

const STATUS_URL = `https://lichess.org/api/users/status?ids=${encodeURIComponent(USER)}&withGameIds=true`;
const GAMES_URL = `https://lichess.org/api/games/user/${encodeURIComponent(USER)}?${new URLSearchParams({
  max: '20',
  moves: 'false',
  pgnInJson: 'false',
  clocks: 'false',
  evals: 'false',
  opening: 'false',
  sort: 'dateDesc',
})}`;
const TEST = process.argv.includes('--test') || process.env.TEST === '1';

let activeGameId = null;
let lastSeenPlayingAt = 0;
let lastPlayingPushAt = 0;
let gamesInitialized = false;
let lastGamesPollAt = 0;
let nextSpecialAfter = randomSpecialInterval();
const seenFinishedGameIds = new Set();
const finishedGames = [];

function log(...args) {
  console.log(new Date().toISOString(), ...args);
}

function pick(lines) {
  return lines[Math.floor(Math.random() * lines.length)];
}

function randomSpecialInterval() {
  return 3 + Math.floor(Math.random() * 3);
}

function profileGames(games) {
  return games.reduce(
    (stats, game) => {
      if (game.result === 'win') stats.wins += 1;
      else if (game.result === 'loss') stats.losses += 1;
      else stats.draws += 1;
      stats.total += 1;
      return stats;
    },
    { wins: 0, losses: 0, draws: 0, total: 0 },
  );
}

function currentStreak(games) {
  const last = games.at(-1);
  if (!last) return { result: null, count: 0 };
  let count = 0;
  for (let i = games.length - 1; i >= 0; i -= 1) {
    if (games[i].result !== last.result) break;
    count += 1;
  }
  return { result: last.result, count };
}

function signed(value) {
  return value > 0 ? `+${value}` : String(value);
}

function ratingSummary(games) {
  const latestRated = [...games].reverse().find((game) => typeof game.ratingAfter === 'number');
  const diffs = games
    .map((game) => game.ratingDiff)
    .filter((diff) => typeof diff === 'number');

  if (!latestRated && diffs.length === 0) return '';

  const delta = diffs.length ? diffs.reduce((sum, diff) => sum + diff, 0) : null;
  if (latestRated && delta !== null) return ` Rating: ${latestRated.ratingAfter} (${signed(delta)}).`;
  if (latestRated) return ` Rating: ${latestRated.ratingAfter}.`;
  return ` Rating change: ${signed(delta)}.`;
}

function recapMessage(name, games) {
  const stats = profileGames(games);
  const rating = ratingSummary(games);
  const intro =
    stats.wins === 5
      ? pick([
          `${name} just swept the whole batch. Absurd behavior`,
          `${name} is fully in raid boss mode right now`,
          `${name} turned the last five games into a highlight reel`,
          `${name} is playing like the board personally apologized`,
          `${name} is on fire and the smoke detector is tired`,
          `${name} just made winning look like a setting you toggle on`,
        ])
      : stats.wins === 4
        ? pick([
            `${name} is doing crazy work right now`,
            `${name} is mostly bullying the scoreboard at this point`,
            `${name} is looking dangerous, like genuinely annoying to play`,
            `${name} just put together a nasty little run`,
            `${name} is stacking wins like the lobby forgot to resist`,
            `${name} is giving confident, slightly illegal momentum`,
          ])
        : stats.wins === 3 && stats.losses <= 2
          ? pick([
              `${name} is edging ahead and the vibes are positive`,
              `${name} is doing pretty well, not flawless but definitely cooking`,
              `${name} is winning the argument with variance right now`,
              `${name} has the scoreboard leaning in the right direction`,
              `${name} is having a solid stretch with just enough chaos`,
              `${name} is up overall, which is all the drama we need`,
            ])
          : stats.losses === 5
            ? pick([
                `${name} just ate five rough ones. That is a reset-button situation`,
                `${name} is in the pain cave right now`,
                `${name} is taking a historic amount of emotional damage`,
                `${name} needs water, posture, and maybe a totally different queue`,
                `${name} is speedrunning the villain origin story`,
                `${name} is getting cooked so hard the kitchen filed paperwork`,
              ])
            : stats.losses === 4
              ? pick([
                  `${name} is having a rough stretch, not gonna lie`,
                  `${name} might be entering tilt country`,
                  `${name} is donating rating with concerning generosity`,
                  `${name} is getting tested by the chess universe`,
                  `${name} needs a breather before the board starts charging rent`,
                  `${name} is in a slump, but the comeback arc is available`,
                ])
              : stats.losses === 3 && stats.wins <= 2
                ? pick([
                    `${name} is a little underwater right now`,
                    `${name} is not doomed, but the vibes are sweating`,
                    `${name} is losing the small sample size argument`,
                    `${name} took a few hits, nothing fatal but definitely spicy`,
                    `${name} is wobbling a bit, the next batch matters`,
                    `${name} is learning loudly right now`,
                  ])
                : pick([
                    `${name} is keeping it basically even and very annoying to predict`,
                    `${name} is living in maximum suspense mode`,
                    `${name} is balanced right now, somehow both fine and stressful`,
                    `${name} is giving coin flip cinema`,
                    `${name} and the scoreboard are currently negotiating`,
                    `${name} is neither cooking nor cooked, just simmering`,
                  ]);

  return `${intro}.${rating}`;
}

function specialMessage(name, games) {
  const streak = currentStreak(games);
  if (streak.result === 'loss' && streak.count >= 3) {
    return pick([
      `Nah ${name} is tilting right now, ${streak.count} losses in a row.`,
      `${name} just lost ${streak.count} straight. The pause button is begging to be noticed.`,
      `Tilt alarm for ${name}: ${streak.count} losses in a row.`,
      `${name} is in the danger zone with ${streak.count} straight losses.`,
      `${name} might be beefing with the board: ${streak.count} losses straight.`,
    ]);
  }
  if (streak.result === 'win' && streak.count >= 3) {
    return pick([
      `${name} is on a heater: ${streak.count} wins in a row.`,
      `Hold up, ${name} has ${streak.count} straight wins. That is actual cooking.`,
      `${name} found the turbo button: ${streak.count} wins straight.`,
      `${name} is farming momentum with ${streak.count} wins in a row.`,
      `${name} is becoming a problem: ${streak.count} straight wins.`,
    ]);
  }
  if (streak.result === 'draw' && streak.count >= 3) {
    return pick([
      `${name} has drawn ${streak.count} in a row. Peace treaty era.`,
      `${name} is collecting draws like rare coins: ${streak.count} straight.`,
      `${name} and decisive results are currently taking space from each other.`,
    ]);
  }

  const lastFive = games.slice(-5);
  if (lastFive.length >= 5) {
    const stats = profileGames(lastFive);
    if (stats.wins === 5) {
      return pick([
        `${name} just swept five straight. Completely unreasonable behavior.`,
        `Five wins in five games for ${name}. Somebody frame the scoresheet.`,
        `${name} went 5-0. That is not a run, that is a weather event.`,
      ]);
    }
    if (stats.losses === 5) {
      return pick([
        `${name} just went 0-5. Deep breaths, big reset, maybe snacks.`,
        `Five rough ones for ${name}. The comeback is going to need a soundtrack.`,
        `${name} is down bad over the last five, but the lore is getting rich.`,
      ]);
    }
    if (stats.wins === 4 && stats.losses <= 1) {
      return pick([
        `${name} is 4-1 over the last five. Pretty nasty little run.`,
        `Four wins in five for ${name}. The confidence is getting loud.`,
        `${name} went 4-1 recently, which is what scientists call being annoying to play.`,
      ]);
    }
    if (stats.losses === 4 && stats.wins <= 1) {
      return pick([
        `${name} is 1-4 over the last five. The rating graph has seen better weather.`,
        `Four losses in five for ${name}. This is officially a reset-window moment.`,
        `${name} is taking some hits lately: 1-4 in the last five.`,
      ]);
    }
  }

  return null;
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

async function notifyPlaying(name, gameId) {
  await push(`${name} is playing`, `https://lichess.org/${gameId}`);
}

function isCounted(status) {
  return (
    status !== 'created' &&
    status !== 'started' &&
    status !== 'aborted' &&
    status !== 'noStart'
  );
}

function parseGame(raw) {
  const status = raw?.status ?? '';
  if (!raw?.id || !isCounted(status)) return null;

  const lname = USER.toLowerCase();
  const white = raw?.players?.white;
  const black = raw?.players?.black;
  const whiteName = white?.user?.name?.toLowerCase();
  const blackName = black?.user?.name?.toLowerCase();

  let color;
  if (whiteName === lname) color = 'white';
  else if (blackName === lname) color = 'black';
  else return null;

  const me = color === 'white' ? white : black;

  let result;
  if (raw.winner === 'white' || raw.winner === 'black') {
    result = raw.winner === color ? 'win' : 'loss';
  } else {
    result = 'draw';
  }

  return {
    id: raw.id,
    result,
    ratingAfter: typeof me?.rating === 'number' ? me.rating : null,
    ratingDiff: typeof me?.ratingDiff === 'number' ? me.ratingDiff : null,
    endTime: raw.lastMoveAt ?? raw.createdAt ?? 0,
  };
}

async function fetchRecentFinishedGames() {
  const res = await fetch(GAMES_URL, {
    headers: { Accept: 'application/x-ndjson' },
  });
  if (!res.ok) {
    log(`games request failed (${res.status})`);
    return [];
  }

  const text = await res.text();
  const games = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const game = parseGame(JSON.parse(trimmed));
      if (game) games.push(game);
    } catch {
      // Skip malformed NDJSON lines.
    }
  }
  return games.sort((a, b) => a.endTime - b.endTime);
}

async function pollFinishedGames(name, force = false) {
  const now = Date.now();
  if (!force && now - lastGamesPollAt < GAMES_POLL_MS) return;
  lastGamesPollAt = now;

  const recentGames = await fetchRecentFinishedGames();
  if (!gamesInitialized) {
    for (const game of recentGames) seenFinishedGameIds.add(game.id);
    gamesInitialized = true;
    log(`Result watcher initialized with ${seenFinishedGameIds.size} recent finished games.`);
    return;
  }

  for (const game of recentGames) {
    if (seenFinishedGameIds.has(game.id)) continue;
    seenFinishedGameIds.add(game.id);
    finishedGames.push(game);
    log(`${name} finished ${game.id}: ${game.result}`);

    if (finishedGames.length % RECAP_EVERY_GAMES === 0) {
      await push(recapMessage(name, finishedGames.slice(-RECAP_EVERY_GAMES)), `https://lichess.org/@/${encodeURIComponent(USER)}`);
    }

    if (finishedGames.length >= nextSpecialAfter) {
      const message = specialMessage(name, finishedGames);
      if (message) {
        await push(message, `https://lichess.org/@/${encodeURIComponent(USER)}`);
        nextSpecialAfter = finishedGames.length + randomSpecialInterval();
      }
    }
  }
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
    const now = Date.now();
    const gameId = entry.playing ? entry.playingId || null : null;

    if (!gameId) {
      if (activeGameId !== null) log(`${name} stopped playing`);
      activeGameId = null;
      const quietLongEnough = lastSeenPlayingAt && now - lastSeenPlayingAt >= PLAYING_COOLDOWN_MS;
      if (quietLongEnough) lastPlayingPushAt = 0;
      await pollFinishedGames(name, true);
      return;
    }

    lastSeenPlayingAt = now;
    const isNewActiveGame = gameId !== activeGameId;
    const canSendPlayingPush = !lastPlayingPushAt;
    activeGameId = gameId;

    if (canSendPlayingPush) {
      lastPlayingPushAt = now;
      await notifyPlaying(name, gameId);
    } else if (isNewActiveGame) {
      log(`${name} started another game (${gameId}); playing push suppressed until quiet cooldown.`);
    }

    await pollFinishedGames(name);
  } catch (e) {
    log('poll error:', e.message);
  }
}

log(`Watching "${USER}" every ${POLL_MS}ms.`);
log(`Polling finished games every ${GAMES_POLL_MS}ms.`);
log(`Plain playing alerts reset after ${Math.round(PLAYING_COOLDOWN_MS / 60000)} quiet minutes.`);
log(`Sending a funny recap every ${RECAP_EVERY_GAMES} finished games.`);
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
