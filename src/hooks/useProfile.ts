import { useEffect, useState } from 'react';
import { fetchProfile } from '../api/lichess';
import type { Profile } from '../types';

/** Loads a user's profile (perf ratings) whenever the watched username changes. */
export function useProfile(username: string | null) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!username) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchProfile(username)
      .then((p) => {
        if (!cancelled) setProfile(p);
      })
      .catch(() => {
        if (!cancelled) setProfile(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [username]);

  return { profile, loading };
}
