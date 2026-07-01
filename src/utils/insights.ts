import type { GameRecord, GameResult } from '../types';

export interface ColorRecord {
  wins: number;
  losses: number;
  draws: number;
}

export interface Insights {
  white: ColorRecord;
  black: ColorRecord;
  /** Streak from the most recent games (games must be newest first). */
  currentStreak: { type: GameResult | null; count: number };
  bestWinStreak: number;
  bestLossStreak: number;
}

const emptyRecord = (): ColorRecord => ({ wins: 0, losses: 0, draws: 0 });

/** Compute color split and win/loss streaks. Expects games newest-first. */
export function computeInsights(games: GameRecord[]): Insights {
  const white = emptyRecord();
  const black = emptyRecord();

  for (const g of games) {
    const bucket = g.color === 'white' ? white : black;
    if (g.result === 'win') bucket.wins++;
    else if (g.result === 'loss') bucket.losses++;
    else bucket.draws++;
  }

  // Current streak: run of identical results starting from the newest game.
  let currentType: GameResult | null = null;
  let currentCount = 0;
  for (const g of games) {
    if (currentCount === 0) {
      currentType = g.result;
      currentCount = 1;
    } else if (g.result === currentType) {
      currentCount++;
    } else {
      break;
    }
  }

  // Best win / loss runs across the whole list.
  let bestWin = 0;
  let bestLoss = 0;
  let runWin = 0;
  let runLoss = 0;
  for (const g of games) {
    if (g.result === 'win') {
      runWin++;
      runLoss = 0;
      if (runWin > bestWin) bestWin = runWin;
    } else if (g.result === 'loss') {
      runLoss++;
      runWin = 0;
      if (runLoss > bestLoss) bestLoss = runLoss;
    } else {
      runWin = 0;
      runLoss = 0;
    }
  }

  return {
    white,
    black,
    currentStreak: { type: currentType, count: currentCount },
    bestWinStreak: bestWin,
    bestLossStreak: bestLoss,
  };
}

/** Win rate as a 0-100 percentage (draws count as half). null if no games. */
export function winRate(rec: ColorRecord): number | null {
  const total = rec.wins + rec.losses + rec.draws;
  if (total === 0) return null;
  return Math.round(((rec.wins + rec.draws * 0.5) / total) * 100);
}

/** Keep only games of a given Lichess speed. `'all'` returns everything. */
export function filterBySpeed(games: GameRecord[], speed: string): GameRecord[] {
  if (speed === 'all') return games;
  return games.filter((g) => g.speed === speed);
}

/** Aggregate performance in a single opening. */
export interface OpeningRecord {
  name: string;
  wins: number;
  losses: number;
  draws: number;
  total: number;
  /** Win rate 0-100, draws counted as half. */
  winRate: number;
}

/** A single game highlighted for a rating swing. */
export interface RatingHighlight {
  opponent: string;
  ratingDiff: number;
}

export interface OpeningTableRow extends OpeningRecord {
  white: ColorRecord;
  black: ColorRecord;
  opponentWins: number;
  avgOpponent: number | null;
  lastPlayed: number;
}

export interface DetailedInsights {
  total: number;
  wins: number;
  losses: number;
  draws: number;
  /** Overall win rate 0-100 (draws as half). null when no games. */
  winRate: number | null;
  /** Net rated Elo change across the games (null when none carry a delta). */
  netElo: number | null;
  /** Average opponent rating (null when unknown). */
  avgOpponent: number | null;
  /** How many of the games were rated. */
  ratedCount: number;
  /** Best single rating gain and worst single loss, if any rated data exists. */
  bestGame: RatingHighlight | null;
  worstGame: RatingHighlight | null;
  /** Most frequently played time control label, if any. */
  topTimeControl: { label: string; count: number } | null;
  /** Most-played opening (by game count). */
  topOpening: OpeningRecord | null;
  /** Best / worst opening by win rate (min 2 games to qualify). */
  bestOpening: OpeningRecord | null;
  worstOpening: OpeningRecord | null;
}

function rateOf(wins: number, draws: number, total: number): number {
  return total === 0 ? 0 : Math.round(((wins + draws * 0.5) / total) * 100);
}

/**
 * Richer, single-scope insights: overall record, rating swings, favourite time
 * control, and per-opening performance. Expects games newest-first.
 */
export function computeDetailedInsights(games: GameRecord[]): DetailedInsights {
  let wins = 0;
  let losses = 0;
  let draws = 0;
  let netElo = 0;
  let eloAvailable = false;
  let ratedCount = 0;
  let oppSum = 0;
  let oppCount = 0;

  let bestGame: RatingHighlight | null = null;
  let worstGame: RatingHighlight | null = null;

  const tcCounts = new Map<string, number>();
  const openings = new Map<string, OpeningRecord>();

  for (const g of games) {
    if (g.result === 'win') wins++;
    else if (g.result === 'loss') losses++;
    else draws++;

    if (g.rated) ratedCount++;
    if (g.rated && g.ratingDiff !== null) {
      netElo += g.ratingDiff;
      eloAvailable = true;
      if (g.ratingDiff > 0 && (!bestGame || g.ratingDiff > bestGame.ratingDiff)) {
        bestGame = { opponent: g.opponent, ratingDiff: g.ratingDiff };
      }
      if (g.ratingDiff < 0 && (!worstGame || g.ratingDiff < worstGame.ratingDiff)) {
        worstGame = { opponent: g.opponent, ratingDiff: g.ratingDiff };
      }
    }

    if (g.opponentRating !== null) {
      oppSum += g.opponentRating;
      oppCount++;
    }

    tcCounts.set(g.timeControl, (tcCounts.get(g.timeControl) ?? 0) + 1);

    if (g.opening) {
      const rec =
        openings.get(g.opening) ??
        { name: g.opening, wins: 0, losses: 0, draws: 0, total: 0, winRate: 0 };
      if (g.result === 'win') rec.wins++;
      else if (g.result === 'loss') rec.losses++;
      else rec.draws++;
      rec.total++;
      openings.set(g.opening, rec);
    }
  }

  for (const rec of openings.values()) {
    rec.winRate = rateOf(rec.wins, rec.draws, rec.total);
  }

  let topTimeControl: DetailedInsights['topTimeControl'] = null;
  for (const [label, count] of tcCounts) {
    if (!topTimeControl || count > topTimeControl.count) topTimeControl = { label, count };
  }

  const openingList = [...openings.values()];
  const topOpening =
    openingList.reduce<OpeningRecord | null>(
      (best, o) => (!best || o.total > best.total ? o : best),
      null,
    ) ?? null;

  // Best / worst by win rate need a small sample to be meaningful.
  const qualified = openingList.filter((o) => o.total >= 2);
  const bestOpening =
    qualified.reduce<OpeningRecord | null>(
      (best, o) => (!best || o.winRate > best.winRate ? o : best),
      null,
    ) ?? null;
  const worstOpening =
    qualified.reduce<OpeningRecord | null>(
      (worst, o) => (!worst || o.winRate < worst.winRate ? o : worst),
      null,
    ) ?? null;

  const total = games.length;
  return {
    total,
    wins,
    losses,
    draws,
    winRate: total === 0 ? null : rateOf(wins, draws, total),
    netElo: eloAvailable ? netElo : null,
    avgOpponent: oppCount === 0 ? null : Math.round(oppSum / oppCount),
    ratedCount,
    bestGame,
    worstGame,
    topTimeControl,
    topOpening,
    bestOpening,
    worstOpening,
  };
}

/** Full opening table for a larger openings view. Expects newest-first games. */
export function computeOpeningTable(games: GameRecord[]): OpeningTableRow[] {
  const openings = new Map<
    string,
    OpeningTableRow & { opponentTotal: number; opponentCount: number }
  >();

  for (const game of games) {
    if (!game.opening) continue;
    const rec =
      openings.get(game.opening) ??
      {
        name: game.opening,
        wins: 0,
        losses: 0,
        draws: 0,
        total: 0,
        winRate: 0,
        white: emptyRecord(),
        black: emptyRecord(),
        opponentWins: 0,
        avgOpponent: null,
        opponentTotal: 0,
        opponentCount: 0,
        lastPlayed: 0,
      };

    if (game.result === 'win') rec.wins++;
    else if (game.result === 'loss') {
      rec.losses++;
      rec.opponentWins++;
    } else rec.draws++;

    const colorRec = game.color === 'white' ? rec.white : rec.black;
    if (game.result === 'win') colorRec.wins++;
    else if (game.result === 'loss') colorRec.losses++;
    else colorRec.draws++;

    if (game.opponentRating !== null) {
      rec.opponentTotal += game.opponentRating;
      rec.opponentCount++;
      rec.avgOpponent = Math.round(rec.opponentTotal / rec.opponentCount);
    }

    rec.total++;
    rec.lastPlayed = Math.max(rec.lastPlayed, game.endTime);
    rec.winRate = rateOf(rec.wins, rec.draws, rec.total);
    openings.set(game.opening, rec);
  }

  return [...openings.values()]
    .map(({ opponentTotal, opponentCount, ...row }) => row)
    .sort((a, b) => b.total - a.total || b.winRate - a.winRate || b.lastPlayed - a.lastPlayed);
}
