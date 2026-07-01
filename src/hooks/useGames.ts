import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchRecentGames } from '../api/lichess';
import type { GameRecord } from '../types';

export interface GamesState {
  games: GameRecord[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/** Number of recent games fetched to compute today's / session stats. */
const MAX_GAMES = 100;

/**
 * Loads the most recent finished games for a user. Re-fetched on a slow timer
 * and whenever `refreshKey` changes (e.g. a new game was detected).
 */
export function useGames(username: string | null, refreshKey: number): GamesState {
  const [games, setGames] = useState<GameRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The user a fetch was started for, so a slow response for a previous player
  // can't overwrite the stats of the one now being watched.
  const activeUser = useRef<string | null>(null);

  const load = useCallback(async () => {
    if (!username) return;
    setLoading(true);
    try {
      const result = await fetchRecentGames(username, MAX_GAMES);
      if (activeUser.current !== username) return;
      setGames(result);
      setError(null);
    } catch (e) {
      if (activeUser.current !== username) return;
      setError(e instanceof Error ? e.message : 'Failed to fetch games.');
    } finally {
      if (activeUser.current === username) setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    // Clear the previous player's games right away when the watched user
    // changes, so switching names never shows stale stats while the new
    // player's games are still loading. (A same-user refresh keeps them.)
    if (activeUser.current !== username) {
      activeUser.current = username;
      setGames([]);
      setError(null);
    }

    if (!username) return;
    load();
    // Periodic refresh (games end times update less often than status).
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [username, refreshKey, load]);

  return { games, loading, error, refresh: load };
}
