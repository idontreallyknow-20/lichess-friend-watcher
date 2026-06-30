import { useEffect, useState } from 'react';

/**
 * Returns a `Date.now()` value that updates on an interval, so components that
 * display elapsed/relative time re-render on their own (default every second).
 */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
