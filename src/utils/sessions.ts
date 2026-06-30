import type { GameRecord } from '../types';

export interface Session {
  start: number;
  end: number;
  games: GameRecord[];
}

/** Default idle gap that splits one play session from the next (30 minutes). */
export const DEFAULT_GAP_MS = 30 * 60 * 1000;

/**
 * Group games into play sessions. A new session begins when the gap between the
 * previous game's end and the next game's start exceeds `gapMs`. So a run of
 * back-to-back games (each within the gap of the last) is a single session, and
 * its duration is the span from the first game's start to the last game's end.
 */
export function computeSessions(games: GameRecord[], gapMs = DEFAULT_GAP_MS): Session[] {
  const sorted = [...games].sort((a, b) => a.startTime - b.startTime);
  const sessions: Session[] = [];

  for (const g of sorted) {
    const current = sessions[sessions.length - 1];
    if (current && g.startTime - current.end <= gapMs) {
      current.games.push(g);
      current.end = Math.max(current.end, g.endTime);
    } else {
      sessions.push({ start: g.startTime, end: g.endTime, games: [g] });
    }
  }

  return sessions;
}

/** The most recent session (the one still in progress, or the last one played). */
export function currentSession(sessions: Session[]): Session | null {
  return sessions.length ? sessions[sessions.length - 1] : null;
}

/** Count of sessions whose most recent game ended today (local time). */
export function sessionsToday(sessions: Session[]): number {
  const now = new Date();
  return sessions.filter((s) => {
    const d = new Date(s.end);
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  }).length;
}
