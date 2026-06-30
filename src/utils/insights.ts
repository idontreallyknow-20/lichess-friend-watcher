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
