// Canonical ordering and labels for Lichess game speeds (which match the perf
// keys used in a user's profile).

export const SPEED_ORDER = [
  'ultraBullet',
  'bullet',
  'blitz',
  'rapid',
  'classical',
  'correspondence',
] as const;

export type Speed = (typeof SPEED_ORDER)[number];

export const SPEED_LABELS: Record<string, string> = {
  ultraBullet: 'UltraBullet',
  bullet: 'Bullet',
  blitz: 'Blitz',
  rapid: 'Rapid',
  classical: 'Classical',
  correspondence: 'Corr.',
};

export function speedLabel(key: string): string {
  return SPEED_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
}

/** Order an arbitrary set of speed keys by the canonical ordering. */
export function orderSpeeds(keys: Iterable<string>): string[] {
  const set = new Set(keys);
  return SPEED_ORDER.filter((s) => set.has(s));
}
