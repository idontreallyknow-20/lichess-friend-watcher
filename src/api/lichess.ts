import type { GameRecord, Profile, UserStatus } from '../types';
import { parseGame } from '../utils/games';

const BASE = 'https://lichess.org';

/** Error type that carries an HTTP-ish status for friendlier messages. */
export class LichessError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'LichessError';
    this.status = status;
  }
}

/**
 * Check whether a Lichess username exists.
 * Returns the canonical username on success, throws LichessError on a real
 * error, and returns null when the user does not exist (404).
 */
export async function validateUser(username: string): Promise<string | null> {
  const res = await fetch(`${BASE}/api/user/${encodeURIComponent(username)}`);
  if (res.status === 404) return null;
  if (res.status === 429) {
    throw new LichessError('Rate limited by Lichess. Please wait a moment.', 429);
  }
  if (!res.ok) {
    throw new LichessError(`Lichess API error (${res.status}).`, res.status);
  }
  const data = await res.json();
  return data?.username ?? username;
}

/**
 * Fetch the parts of a user's profile this app uses: canonical username and
 * the per-speed performance ratings. Returns null when the user is not found.
 */
export async function fetchProfile(username: string): Promise<Profile | null> {
  const res = await fetch(`${BASE}/api/user/${encodeURIComponent(username)}`);
  if (res.status === 404) return null;
  if (res.status === 429) {
    throw new LichessError('Rate limited by Lichess. Please wait a moment.', 429);
  }
  if (!res.ok) {
    throw new LichessError(`Lichess API error (${res.status}).`, res.status);
  }
  const data = await res.json();
  return {
    username: data?.username ?? username,
    perfs: (data?.perfs ?? {}) as Profile['perfs'],
  };
}

/** Fetch the live status of a single user. */
export async function fetchStatus(username: string): Promise<UserStatus | null> {
  const url = `${BASE}/api/users/status?ids=${encodeURIComponent(username)}&withGameIds=true`;
  const res = await fetch(url);
  if (res.status === 429) {
    throw new LichessError('Rate limited by Lichess. Slowing down.', 429);
  }
  if (!res.ok) {
    throw new LichessError(`Status request failed (${res.status}).`, res.status);
  }
  const data = await res.json();
  const entry = Array.isArray(data) ? data[0] : null;
  if (!entry) return null;
  return {
    id: entry.id,
    name: entry.name,
    online: !!entry.online,
    playing: !!entry.playing,
    playingId: entry.playingId ?? null,
  };
}

/**
 * Fetch recent finished games for a user via the NDJSON export endpoint.
 * Intentionally requests no moves / evals / opening data, since this app only
 * tracks results and stats, never positions or analysis.
 */
export async function fetchRecentGames(
  username: string,
  max = 100,
): Promise<GameRecord[]> {
  const params = new URLSearchParams({
    max: String(max),
    moves: 'false',
    pgnInJson: 'false',
    clocks: 'false',
    evals: 'false',
    opening: 'false',
    sort: 'dateDesc',
  });
  const res = await fetch(`${BASE}/api/games/user/${encodeURIComponent(username)}?${params}`, {
    headers: { Accept: 'application/x-ndjson' },
  });
  if (res.status === 429) {
    throw new LichessError('Rate limited by Lichess. Please wait a moment.', 429);
  }
  if (!res.ok) {
    throw new LichessError(`Games request failed (${res.status}).`, res.status);
  }

  const text = await res.text();
  const games: GameRecord[] = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let raw: unknown;
    try {
      raw = JSON.parse(trimmed);
    } catch {
      continue; // skip malformed line
    }
    const record = parseGame(raw, username);
    if (record) games.push(record);
  }
  return games;
}
