import { useMemo } from 'react';
import type { GameRecord } from '../types';
import { Sparkline } from './Sparkline';
import { formatSigned } from '../utils/format';

interface TrendCardProps {
  /** Games to chart (any order). Only rated games with a rating are used. */
  games: GameRecord[];
  scopeLabel: string;
}

export function TrendCard({ games, scopeLabel }: TrendCardProps) {
  const series = useMemo(() => {
    return games
      .filter((g) => g.rated && g.ratingAfter !== null)
      .slice()
      .sort((a, b) => a.endTime - b.endTime)
      .map((g) => g.ratingAfter as number);
  }, [games]);

  const delta = series.length >= 2 ? series[series.length - 1] - series[0] : null;

  return (
    <section className="card">
      <h2 className="card__title">Rating trend · {scopeLabel}</h2>

      {series.length >= 2 ? (
        <>
          <div className="trend__head">
            <span className="trend__latest">{series[series.length - 1]}</span>
            {delta !== null && (
              <span
                className={
                  delta > 0 ? 'stat--positive' : delta < 0 ? 'stat--negative' : 'muted'
                }
              >
                {formatSigned(delta)} over {series.length} games
              </span>
            )}
          </div>
          <Sparkline values={series} />
        </>
      ) : (
        <p className="empty">Not enough rated games to chart a trend.</p>
      )}
    </section>
  );
}
