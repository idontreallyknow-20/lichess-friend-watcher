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
 *   RECAP_EVERY_GAMES     (optional)  send recap every N finished games (default 2)
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
const RECAP_EVERY_GAMES = Math.max(1, Number(process.env.RECAP_EVERY_GAMES) || 2);

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
  return 1 + Math.floor(Math.random() * 2);
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
  const last = games[games.length - 1];
  if (!last) return { result: null, count: 0 };
  let count = 0;
  for (let i = games.length - 1; i >= 0; i -= 1) {
    if (games[i].result !== last.result) break;
    count += 1;
  }
  return { result: last.result, count };
}

function ratingInfo(games) {
  const latestRated = [...games].reverse().find((game) => typeof game.ratingAfter === 'number');
  const diffs = games
    .map((game) => game.ratingDiff)
    .filter((diff) => typeof diff === 'number');

  if (!latestRated && diffs.length === 0) {
    return { text: 'rating chaos unknown', delta: null, rating: null };
  }

  const delta = diffs.length ? diffs.reduce((sum, diff) => sum + diff, 0) : null;
  const rating = latestRated?.ratingAfter ?? null;
  const deltaText =
    delta === null
      ? 'with the rating change hiding from us'
      : delta > 0
        ? `gaining ${delta} Elo`
        : delta < 0
          ? `losing ${Math.abs(delta)} Elo`
          : 'gaining absolutely 0 Elo somehow';
  const ratingText = rating === null ? '' : `, now ${rating}`;
  return {
    text: `${deltaText}${ratingText}`,
    delta,
    rating,
  };
}

function recapMessage(name, games) {
  const stats = profileGames(games);
  const rating = ratingInfo(games);
  const resultLine =
    stats.wins === stats.total
      ? `${stats.wins} straight wins`
      : stats.losses === stats.total
        ? `${stats.losses} straight losses`
        : `${stats.wins} wins, ${stats.losses} losses${stats.draws ? `, ${stats.draws} draws` : ''}`;
  const intro =
    stats.wins === stats.total
      ? pick([
          `${name} is going CRAZY right now`,
          `${name} is playing like the board owes him money`,
          `${name} is on demon time`,
          `${name} is absolutely farming these people`,
          `${name} has entered menace mode`,
          `${name} is making the lobby look fake`,
          `${name} is cooking so hard the pieces need insurance`,
          `${name} is playing like he found a hidden difficulty slider`,
        ])
      : stats.wins > stats.losses
        ? pick([
            `${name} is going CRAZY`,
            `${name} is kind of nasty right now`,
            `${name} is winning like he has somewhere to be`,
            `${name} is cooking, no notes`,
            `${name} is putting up villain numbers`,
            `${name} is making this look disrespectfully easy`,
            `${name} is bullying the scoreboard`,
            `${name} is locked in and annoying with it`,
          ])
        : stats.losses === stats.total
          ? pick([
              `${name} is playing like GARBAGE right now`,
              `${name} is getting absolutely fried`,
              `${name} is donating rating like it is a charity stream`,
              `${name} is speedrunning the collapse`,
              `${name} is in full disaster cinema`,
              `${name} is getting cooked alive on the board`,
              `${name} is making the resign button look employed`,
              `${name} is having a generationally unserious stretch`,
            ])
          : stats.losses > stats.wins
            ? pick([
                `${name} is playing like GARBAGE`,
                `${name} is getting packed up right now`,
                `${name} is losing the plot and possibly the furniture`,
                `${name} is in the trenches doing trench activities`,
                `${name} is bleeding Elo with confidence`,
                `${name} is making every game look like a jump scare`,
                `${name} is getting worked by the chess universe`,
                `${name} is one more loss away from needing a wellness check`,
              ])
            : pick([
                `${name} is in coin-flip chaos mode`,
                `${name} is playing confusing chess for confusing times`,
                `${name} is neither cooking nor cooked, just aggressively simmering`,
                `${name} is making the scoreboard do paperwork`,
                `${name} is producing premium nonsense`,
                `${name} is balanced in the most stressful way possible`,
              ]);

  return `${intro}: ${resultLine}, ${rating.text}.`;
}

function specialMessage(name, games) {
  const streak = currentStreak(games);
  if (streak.result === 'loss' && streak.count >= 3) {
    const rating = ratingInfo(games.slice(-streak.count));
    return pick([
      `${name} is playing like GARBAGE with ${streak.count} straight losses, ${rating.text}.`,
      `Nah ${name} is TILTING: ${streak.count} losses in a row, ${rating.text}.`,
      `${name} is getting cooked with ${streak.count} straight losses, ${rating.text}.`,
      `${name} is in full collapse mode: ${streak.count} straight losses, ${rating.text}.`,
      `${name} is beefing with the board and losing: ${streak.count} straight losses, ${rating.text}.`,
      `${name} is speedrunning pain with ${streak.count} straight losses, ${rating.text}.`,
    ]);
  }
  if (streak.result === 'win' && streak.count >= 3) {
    const rating = ratingInfo(games.slice(-streak.count));
    return pick([
      `${name} is going CRAZY with ${streak.count} straight wins, ${rating.text}.`,
      `${name} is on a heater with ${streak.count} wins in a row, ${rating.text}.`,
      `${name} found the turbo button: ${streak.count} straight wins, ${rating.text}.`,
      `${name} is becoming a PROBLEM with ${streak.count} straight wins, ${rating.text}.`,
      `${name} is farming humans right now: ${streak.count} straight wins, ${rating.text}.`,
      `${name} is playing like a final boss with ${streak.count} straight wins, ${rating.text}.`,
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
      const rating = ratingInfo(lastFive);
      return pick([
        `${name} just went nuclear: five straight wins, ${rating.text}.`,
        `${name} is going CRAZY with a clean five-game sweep, ${rating.text}.`,
        `${name} went full final boss for five games, ${rating.text}.`,
      ]);
    }
    if (stats.losses === 5) {
      const rating = ratingInfo(lastFive);
      return pick([
        `${name} is playing like GARBAGE: five straight losses, ${rating.text}.`,
        `${name} just got folded for five games, ${rating.text}.`,
        `${name} is in disaster mode after five losses, ${rating.text}.`,
      ]);
    }
    if (stats.wins === 4 && stats.losses <= 1) {
      const rating = ratingInfo(lastFive);
      return pick([
        `${name} is going CRAZY with four wins in five, ${rating.text}.`,
        `${name} is bullying the queue with four wins in five, ${rating.text}.`,
        `${name} is locked in with four wins and one little speed bump, ${rating.text}.`,
      ]);
    }
    if (stats.losses === 4 && stats.wins <= 1) {
      const rating = ratingInfo(lastFive);
      return pick([
        `${name} is playing like GARBAGE with four losses in five, ${rating.text}.`,
        `${name} is getting packed up with four losses in five, ${rating.text}.`,
        `${name} is bleeding out over the last five, ${rating.text}.`,
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
      }
      nextSpecialAfter = finishedGames.length + randomSpecialInterval();
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
log(`Sending an extreme recap every ${RECAP_EVERY_GAMES} finished games.`);
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
