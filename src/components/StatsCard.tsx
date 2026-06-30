import type { ReactNode } from 'react';
import type { StatBlock } from '../types';
import { formatSigned } from '../utils/format';

interface StatsCardProps {
  title: string;
  stats: StatBlock;
  /** Optional extra rows (e.g. session controls / duration). */
  footer?: ReactNode;
  loading?: boolean;
}

export function StatsCard({ title, stats, footer, loading }: StatsCardProps) {
  const eloClass =
    stats.eloChange === null
      ? ''
      : stats.eloChange > 0
        ? 'stat--positive'
        : stats.eloChange < 0
          ? 'stat--negative'
          : '';

  return (
    <section className="card">
      <h2 className="card__title">
        {title}
        {loading && <span className="card__loading"> · updating…</span>}
      </h2>

      <div className="stats-grid">
        <div className="stat">
          <span className="stat__value stat--positive">{stats.wins}</span>
          <span className="stat__label">Wins</span>
        </div>
        <div className="stat">
          <span className="stat__value stat--negative">{stats.losses}</span>
          <span className="stat__label">Losses</span>
        </div>
        <div className="stat">
          <span className="stat__value stat--neutral">{stats.draws}</span>
          <span className="stat__label">Draws</span>
        </div>
        <div className="stat">
          <span className="stat__value">{stats.total}</span>
          <span className="stat__label">Total</span>
        </div>
        <div className="stat">
          <span className={`stat__value ${eloClass}`}>
            {stats.eloChange === null ? 'N/A' : formatSigned(stats.eloChange)}
          </span>
          <span className="stat__label">Elo</span>
        </div>
      </div>

      {footer && <div className="stats__footer">{footer}</div>}
    </section>
  );
}
