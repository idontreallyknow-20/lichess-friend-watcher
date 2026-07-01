import type { Profile } from '../types';
import { orderSpeeds, speedLabel } from '../utils/speeds';
import { formatSigned } from '../utils/format';

interface AllTimeCardProps {
  perfs: Profile['perfs'];
  /** 'all' or a specific speed key. */
  speed: string;
  loading: boolean;
}

/**
 * All-time ratings straight from the player's Lichess profile. For a specific
 * speed it shows the headline rating + lifetime game count; for "all" it lists
 * every speed the player has a rating in.
 */
export function AllTimeCard({ perfs, speed, loading }: AllTimeCardProps) {
  const speeds = orderSpeeds(
    Object.keys(perfs).filter((k) => (perfs[k]?.games ?? 0) > 0 || perfs[k]?.rating),
  );

  return (
    <section className="card">
      <h2 className="card__title">
        All-time rating
        {loading && <span className="card__loading"> · loading</span>}
      </h2>

      {speed !== 'all' ? (
        (() => {
          const perf = perfs[speed];
          if (!perf) {
            return <p className="empty">No {speedLabel(speed)} games on record.</p>;
          }
          return (
            <div className="alltime">
              <div className="alltime__main">
                <span className="alltime__rating">
                  {perf.rating}
                  {perf.prov && <span className="alltime__prov">?</span>}
                </span>
                <span className="alltime__label">{speedLabel(speed)} rating</span>
              </div>
              <div className="alltime__meta">
                <div className="metric">
                  <span className="metric__k">Games</span>
                  <span className="metric__v">{perf.games.toLocaleString()}</span>
                </div>
                <div className="metric">
                  <span className="metric__k">Recent trend</span>
                  <span
                    className={`metric__v ${perf.prog > 0 ? 'stat--positive' : perf.prog < 0 ? 'stat--negative' : ''}`}
                  >
                    {formatSigned(perf.prog)}
                  </span>
                </div>
                {typeof perf.rd === 'number' && (
                  <div className="metric">
                    <span className="metric__k">Deviation</span>
                    <span className="metric__v">±{perf.rd}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })()
      ) : speeds.length === 0 ? (
        <p className="empty">No rated games on record.</p>
      ) : (
        <div className="alltime-grid">
          {speeds.map((s) => {
            const perf = perfs[s];
            return (
              <div className="alltime-cell" key={s}>
                <span className="alltime-cell__rating">
                  {perf.rating}
                  {perf.prov && <span className="alltime__prov">?</span>}
                </span>
                <span className="alltime-cell__label">{speedLabel(s)}</span>
                <span className="alltime-cell__games">{perf.games.toLocaleString()} games</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
