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
  color: GameColor;
  result: GameResult;
  /** Rating delta for the watched user. null when unavailable (casual / missing). */
  ratingDiff: number | null;
  /** Watched user's rating in this game, if available. */
  ratingAfter: number | null;
  rated: boolean;
  /** Human-readable time control, e.g. "5+3" or "Correspondence". */
  timeControl: string;
  speed: string;
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
