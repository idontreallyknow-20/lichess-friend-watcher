import type { UserStatus } from '../types';
import { formatClock } from '../utils/format';

interface StatusCardProps {
  username: string;
  status: UserStatus | null;
  lastChecked: number | null;
  loading: boolean;
  error: string | null;
}

export function StatusCard({ username, status, lastChecked, loading, error }: StatusCardProps) {
  const online = status?.online ?? false;
  const playing = status?.playing ?? false;

  return (
    <section className="card">
      <h2 className="card__title">Live status</h2>

      <div className="status__name">
        <a
          href={`https://lichess.org/@/${encodeURIComponent(username)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {status?.name ?? username}
        </a>
      </div>

      <div className="status__badges">
        <span className={`badge ${online ? 'badge--online' : 'badge--offline'}`}>
          <span className="dot" /> {online ? 'Online' : 'Offline'}
        </span>
        <span className={`badge ${playing ? 'badge--playing' : 'badge--idle'}`}>
          {playing ? 'Playing' : 'Not playing'}
        </span>
      </div>

      <dl className="status__meta">
        <div>
          <dt>Last checked</dt>
          <dd>{lastChecked ? formatClock(lastChecked) : '—'}</dd>
        </div>
        <div>
          <dt>Polling</dt>
          <dd>{loading ? 'Refreshing…' : 'Every ~7s'}</dd>
        </div>
      </dl>

      {error && <p className="search__error" role="alert">{error}</p>}
    </section>
  );
}
