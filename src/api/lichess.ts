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

export interface LiveGamePlayer {
  name: string;
  rating: number | null;
}

export interface LiveGameSummary {
  id: string;
  white: LiveGamePlayer;
  black: LiveGamePlayer;
}

/** Check whether a Lichess username exists. */
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

/** Fetch the parts of a user's profile this app uses. */
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

function playerName(player: any) {
  return player?.user?.name ?? (typeof player?.aiLevel === 'number' ? `Stockfish ${player.aiLevel}` : 'Anonymous');
}

function playerRating(player: any) {
  return typeof player?.rating === 'number' ? player.rating : null;
}

/** Fetch just enough current-game metadata to show the matchup. */
export async function fetchLiveGameSummary(gameId: string): Promise<LiveGameSummary | null> {
  const params = new URLSearchParams({
    moves: 'false',
    pgnInJson: 'false',
    clocks: 'false',
    evals: 'false',
    opening: 'false',
  });
  const res = await fetch(`${BASE}/game/export/${encodeURIComponent(gameId)}?${params}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) return null;
  const raw = await res.json();
  return {
    id: raw.id ?? gameId,
    white: {
      name: playerName(raw?.players?.white),
      rating: playerRating(raw?.players?.white),
    },
    black: {
      name: playerName(raw?.players?.black),
      rating: playerRating(raw?.players?.black),
    },
  };
}

/** Fetch recent finished games for a user via the NDJSON export endpoint. */
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
      continue;
    }
    const record = parseGame(raw, username);
    if (record) games.push(record);
  }
  return games;
}
