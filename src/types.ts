// Shared types for the Lichess Friend Watcher app.

/** Normalized live status of a watched user. */
export interface UserStatus {
  id: string;
  name: string;
  online: boolean;
  playing: boolean;
  /** Game id of the game currently being played, if any. */
  playingId: string | null;
}

export type GameColor = 'white' | 'black';
export type GameResult = 'win' | 'loss' | 'draw';

/** A finished (counted) game, normalized from the Lichess games export. */
export interface GameRecord {
  id: string;
  opponent: string;
  /** Opponent's rating in this game, if available. */
  opponentRating: number | null;
  color: GameColor;
  result: GameResult;
  /** Rating delta for the watched user. null when unavailable (casual / missing). */
  ratingDiff: number | null;
  /** Watched user's rating in this game, if available. */
  ratingAfter: number | null;
  /** Opening name (e.g. "Sicilian Defense"), if the export provided one. */
  opening: string | null;
  rated: boolean;
  /** Human-readable time control, e.g. "5+3" or "Correspondence". */
  timeControl: string;
  speed: string;
  /** Epoch ms the game started (createdAt). */
  startTime: number;
  /** Epoch ms the game ended (lastMoveAt). */
  endTime: number;
}

/** Aggregated win/loss/draw stats over a set of games. */
export interface StatBlock {
  wins: number;
  losses: number;
  draws: number;
  total: number;
  /** Net Elo change. null means "N/A" (no rated games with rating data). */
  eloChange: number | null;
}

/** One performance category (bullet, blitz, rapid, ...) from a user's profile. */
export interface Perf {
  games: number;
  rating: number;
  rd?: number;
  /** Recent rating progression over the last ~12 games. */
  prog: number;
  /** Provisional rating flag. */
  prov?: boolean;
}

/** Subset of a Lichess user profile this app uses. */
export interface Profile {
  username: string;
  perfs: Record<string, Perf>;
}
