import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchStatus } from '../api/lichess';
import type { UserStatus } from '../types';

/** Poll interval. Kept >= 5s to respect Lichess rate limits. */
const POLL_INTERVAL_MS = 5000;

export interface StatusState {
  status: UserStatus | null;
  lastChecked: number | null;
  /** When this app first detected the current game id. null when not playing. */
  gameDetectedAt: number | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Polls a user's live status every 5s. Tracks when the current game was first
 * detected so the UI can show how long the game has been observed.
 */
export function useStatus(username: string | null): StatusState {
  const [status, setStatus] = useState<UserStatus | null>(null);
  const [lastChecked, setLastChecked] = useState<number | null>(null);
  const [gameDetectedAt, setGameDetectedAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The game id we currently consider "active", to detect changes.
  const currentGameRef = useRef<string | null>(null);

  const poll = useCallback(async () => {
    if (!username) return;
    setLoading(true);
    try {
      const s = await fetchStatus(username);
      setStatus(s);
      setLastChecked(Date.now());
      setError(null);

      const gameId = s?.playing ? s.playingId : null;
      if (gameId !== currentGameRef.current) {
        currentGameRef.current = gameId;
        setGameDetectedAt(gameId ? Date.now() : null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch status.');
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    // Reset state whenever the watched user changes.
    currentGameRef.current = null;
    setStatus(null);
    setGameDetectedAt(null);
    setLastChecked(null);
    setError(null);

    if (!username) return;
    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [username, poll]);

  return { status, lastChecked, gameDetectedAt, loading, error, refresh: poll };
}
