import type { GameRecord, StatBlock } from '../types';

/** Aggregate W/L/D and net Elo over a list of finished games. */
export function computeStats(games: GameRecord[]): StatBlock {
  let wins = 0;
  let losses = 0;
  let draws = 0;
  let elo = 0;
  let eloAvailable = false;

  for (const g of games) {
    if (g.result === 'win') wins++;
    else if (g.result === 'loss') losses++;
    else draws++;

    // Only finished rated games that actually carry a rating delta contribute.
    if (g.rated && g.ratingDiff !== null) {
      elo += g.ratingDiff;
      eloAvailable = true;
    }
  }

  return {
    wins,
    losses,
    draws,
    total: games.length,
    eloChange: eloAvailable ? elo : null,
  };
}

/** True if the epoch-ms timestamp falls on today's date in the local timezone. */
export function isToday(ts: number): boolean {
  const d = new Date(ts);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

/** Games that ended today (local time). */
export function filterToday(games: GameRecord[]): GameRecord[] {
  return games.filter((g) => isToday(g.endTime));
}

/** Games that ended in the last seven days. */
export function filterLastWeek(games: GameRecord[]): GameRecord[] {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return games.filter((g) => g.endTime >= cutoff);
}

/** Games that ended at or after the given session start time. */
export function filterSession(games: GameRecord[], sessionStart: number): GameRecord[] {
  return games.filter((g) => g.endTime >= sessionStart);
}
