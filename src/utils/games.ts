import type { GameRecord, GameColor, GameResult } from '../types';

/**
 * Game statuses returned by the Lichess API.
 * - "created" / "started": still ongoing -> not counted
 * - "aborted" / "noStart": never really played -> not counted
 * - everything else: finished -> counted
 */
function isCounted(status: string): boolean {
  return (
    status !== 'created' &&
    status !== 'started' &&
    status !== 'aborted' &&
    status !== 'noStart'
  );
}

/** Build a readable time-control label from a raw game object. */
export function formatTimeControl(raw: any): string {
  if (raw.clock && typeof raw.clock.initial === 'number') {
    const minutes = raw.clock.initial / 60;
    const minStr = Number.isInteger(minutes) ? String(minutes) : String(+minutes.toFixed(2));
    return `${minStr}+${raw.clock.increment ?? 0}`;
  }
  if (raw.daysPerTurn) {
    return `${raw.daysPerTurn} day${raw.daysPerTurn > 1 ? 's' : ''}/turn`;
  }
  if (raw.speed === 'correspondence') return 'Correspondence';
  if (typeof raw.speed === 'string') {
    return raw.speed.charAt(0).toUpperCase() + raw.speed.slice(1);
  }
  return 'Unknown';
}

/**
 * Normalize one raw game (as returned by the games export) for a given user.
 * Returns null for games that should not be counted (ongoing, aborted, or
 * games that don't actually involve the user).
 */
export function parseGame(raw: any, username: string): GameRecord | null {
  const status: string = raw?.status ?? '';
  if (!isCounted(status)) return null;

  const lname = username.toLowerCase();
  const white = raw?.players?.white;
  const black = raw?.players?.black;
  const whiteName: string | undefined = white?.user?.name?.toLowerCase();
  const blackName: string | undefined = black?.user?.name?.toLowerCase();

  let color: GameColor;
  if (whiteName === lname) color = 'white';
  else if (blackName === lname) color = 'black';
  else return null; // user not found in this game

  const me = color === 'white' ? white : black;
  const them = color === 'white' ? black : white;

  const opponent =
    them?.user?.name ??
    (typeof them?.aiLevel === 'number' ? `Stockfish level ${them.aiLevel}` : 'Anonymous');

  // Result logic:
  //  - winner present -> win/loss based on our color
  //  - winner absent on a counted (finished, non-aborted) game -> draw
  //    (covers draw, stalemate, repetition, insufficient material, timeout draw, etc.)
  let result: GameResult;
  if (raw.winner === 'white' || raw.winner === 'black') {
    result = raw.winner === color ? 'win' : 'loss';
  } else {
    result = 'draw';
  }

  const rated = !!raw.rated;
  const ratingDiff =
    rated && typeof me?.ratingDiff === 'number' ? me.ratingDiff : null;
  const ratingAfter = typeof me?.rating === 'number' ? me.rating : null;

  return {
    id: raw.id,
    opponent,
    color,
    result,
    ratingDiff,
    ratingAfter,
    rated,
    timeControl: formatTimeControl(raw),
    speed: typeof raw.speed === 'string' ? raw.speed : 'unknown',
    startTime: raw.createdAt ?? raw.lastMoveAt ?? 0,
    endTime: raw.lastMoveAt ?? raw.createdAt ?? 0,
  };
}
