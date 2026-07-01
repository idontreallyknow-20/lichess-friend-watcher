import { useMemo, useState } from 'react';
import type { GameRecord, Profile, RatingHistorySeries } from '../types';
import { Sparkline } from './Sparkline';
import { formatSigned } from '../utils/format';
import { orderSpeeds, speedLabel } from '../utils/speeds';

interface TrendCardProps {
  games: GameRecord[];
  history: RatingHistorySeries[];
  perfs: Profile['perfs'];
  loading: boolean;
  error: string | null;
}

function fallbackGameSeries(games: GameRecord[], speed: string) {
  return games
    .filter((g) => g.speed === speed && g.rated && g.ratingAfter !== null)
    .slice()
    .sort((a, b) => a.endTime - b.endTime)
    .map((g) => ({ date: g.endTime, rating: g.ratingAfter as number }));
}

function dateRange(points: { date: number; rating: number }[]) {
  if (points.length < 2) return '';
  const first = new Date(points[0].date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  const last = new Date(points[points.length - 1].date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  return `${first} to ${last}`;
}

export function TrendCard({ games, history, perfs, loading, error }: TrendCardProps) {
  const speeds = useMemo(() => {
    const keys = new Set<string>();
    for (const series of history) keys.add(series.speed);
    for (const key of Object.keys(perfs)) {
      if ((perfs[key]?.games ?? 0) > 0) keys.add(key);
    }
    return orderSpeeds(keys).filter((speed) => speed !== 'storm' && speed !== 'racer' && speed !== 'puzzle');
  }, [history, perfs]);

  const [speed, setSpeed] = useState<string>('blitz');
  const activeSpeed = speeds.includes(speed) ? speed : speeds[0] ?? 'blitz';
  const series = history.find((item) => item.speed === activeSpeed);
  const points = series?.points.length ? series.points : fallbackGameSeries(games, activeSpeed);
  const values = points.map((point) => point.rating);
  const profileRating = perfs[activeSpeed]?.rating ?? null;
  const latest = profileRating ?? values[values.length - 1] ?? null;
  const delta = values.length >= 2 ? values[values.length - 1] - values[0] : null;
  const source = series?.points.length ? 'Lichess rating history' : 'recent rated games';

  return (
    <section className="card">
      <div className="trend-title-row">
        <h2 className="card__title">Rating trend</h2>
        <div className="seg" role="tablist" aria-label="Rating speed">
          {speeds.map((item) => (
            <button
              key={item}
              className={`seg__btn ${activeSpeed === item ? 'seg__btn--active' : ''}`}
              onClick={() => setSpeed(item)}
            >
              {speedLabel(item)}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="empty">{error}</p>}

      {latest !== null && values.length >= 2 ? (
        <>
          <div className="trend__head">
            <span className="trend__latest">{latest}</span>
            {delta !== null && (
              <span className={delta > 0 ? 'stat--positive' : delta < 0 ? 'stat--negative' : 'muted'}>
                {formatSigned(delta)} over {values.length} points
              </span>
            )}
          </div>
          <Sparkline values={values} height={96} />
          <div className="trend__meta muted">
            {source}
            {dateRange(points) ? ` - ${dateRange(points)}` : ''}
            {loading ? ' - loading' : ''}
          </div>
        </>
      ) : (
        <p className="empty">
          {loading ? 'Loading rating history.' : 'Not enough rated history to chart this speed.'}
        </p>
      )}
    </section>
  );
}
