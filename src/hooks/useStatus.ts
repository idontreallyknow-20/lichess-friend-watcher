import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchStatus, LichessError } from '../api/lichess';
import type { UserStatus } from '../types';

/** Poll interval. Kept well above 5s to respect Lichess rate limits. */
export const POLL_INTERVAL_MS = 7000;
/** Extra wait after Lichess answers 429, per their API guidelines. */
const RATE_LIMIT_BACKOFF_MS = 60_000;

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
 * Polls a user's live status every ~7s. Tracks when the current game was first
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
  // The user being watched right now, so a slow response for a previous
  // player can't overwrite the current one's status.
  const activeUser = useRef<string | null>(null);
  // Skip polls until this time after a 429.
  const pausedUntil = useRef(0);

  const poll = useCallback(async () => {
    if (!username || Date.now() < pausedUntil.current) return;
    setLoading(true);
    try {
      const s = await fetchStatus(username);
      if (activeUser.current !== username) return;
      setStatus(s);
      setLastChecked(Date.now());
      setError(null);

      const gameId = s?.playing ? s.playingId : null;
      if (gameId !== currentGameRef.current) {
        currentGameRef.current = gameId;
        setGameDetectedAt(gameId ? Date.now() : null);
      }
    } catch (e) {
      if (activeUser.current !== username) return;
      if (e instanceof LichessError && e.status === 429) {
        pausedUntil.current = Date.now() + RATE_LIMIT_BACKOFF_MS;
      }
      setError(e instanceof Error ? e.message : 'Failed to fetch status.');
    } finally {
      if (activeUser.current === username) setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    // Reset state whenever the watched user changes.
    activeUser.current = username;
    currentGameRef.current = null;
    setStatus(null);
    setGameDetectedAt(null);
    setLastChecked(null);
    setError(null);
    setLoading(false);

    if (!username) return;
    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [username, poll]);

  return { status, lastChecked, gameDetectedAt, loading, error, refresh: poll };
}
