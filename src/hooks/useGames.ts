import { useCallback, useEffect, useState } from 'react';
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

  const load = useCallback(async () => {
    if (!username) return;
    setLoading(true);
    try {
      const result = await fetchRecentGames(username, MAX_GAMES);
      setGames(result);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch games.');
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    if (!username) {
      setGames([]);
      setError(null);
      return;
    }
    load();
    // Periodic refresh (games end times update less often than status).
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [username, refreshKey, load]);

  return { games, loading, error, refresh: load };
}
