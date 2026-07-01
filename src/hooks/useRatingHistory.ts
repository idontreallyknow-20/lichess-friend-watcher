import { useEffect, useState } from 'react';
import { fetchRatingHistory } from '../api/lichess';
import type { RatingHistorySeries } from '../types';

export function useRatingHistory(username: string | null) {
  const [history, setHistory] = useState<RatingHistorySeries[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!username) {
      setHistory([]);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    fetchRatingHistory(username)
      .then((next) => {
        if (!cancelled) {
          setHistory(next);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setHistory([]);
          setError(e instanceof Error ? e.message : 'Failed to fetch rating history.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [username]);

  return { history, loading, error };
}
