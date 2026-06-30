// Small formatting helpers used across the UI.

/** "3:05" / "1:02:33" style duration from a millisecond span. */
export function formatDuration(ms: number): string {
  if (ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  return `${minutes}:${pad(seconds)}`;
}

/** Local clock time, e.g. "14:05:09". */
export function formatClock(ts: number): string {
  return new Date(ts).toLocaleTimeString();
}

/** Local date + time, e.g. "Jun 30, 14:05". */
export function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** "+12" / "-5" / "±0" for a signed Elo delta. */
export function formatSigned(value: number): string {
  if (value > 0) return `+${value}`;
  if (value < 0) return `${value}`;
  return '±0';
}
