import type { Profile } from '../types';
import { speedLabel } from '../utils/speeds';
import { formatSigned } from '../utils/format';

interface PerformanceTabsProps {
  perfs: Profile['perfs'];
  /** Speed keys available to filter by (canonically ordered). */
  speeds: string[];
  /** Current selection: 'all' or a speed key. */
  value: string;
  onChange: (value: string) => void;
  loading: boolean;
}

export function PerformanceTabs({ perfs, speeds, value, onChange, loading }: PerformanceTabsProps) {
  const activePerf = value !== 'all' ? perfs[value] : undefined;

  return (
    <section className="card card--wide">
      <h2 className="card__title">
        Performance
        {loading && <span className="card__loading"> · loading ratings</span>}
      </h2>

      <div className="tabs" role="tablist">
        <button
          className={`tab ${value === 'all' ? 'tab--active' : ''}`}
          role="tab"
          aria-selected={value === 'all'}
          onClick={() => onChange('all')}
        >
          <span className="tab__name">All</span>
          <span className="tab__sub">every speed</span>
        </button>

        {speeds.map((s) => {
          const perf = perfs[s];
          return (
            <button
              key={s}
              className={`tab ${value === s ? 'tab--active' : ''}`}
              role="tab"
              aria-selected={value === s}
              onClick={() => onChange(s)}
            >
              <span className="tab__name">{speedLabel(s)}</span>
              <span className="tab__sub">
                {perf ? `${perf.rating}${perf.prov ? '?' : ''}` : 'unrated'}
              </span>
            </button>
          );
        })}
      </div>

      {value !== 'all' && (
        <div className="perf-detail">
          {activePerf ? (
            <>
              <div className="perf-detail__main">
                <span className="perf-detail__rating">
                  {activePerf.rating}
                  {activePerf.prov && <span className="perf-detail__prov"> provisional</span>}
                </span>
                <span className="perf-detail__label">{speedLabel(value)} rating</span>
              </div>
              <div className="perf-detail__meta">
                <div>
                  <span className="perf-detail__k">Games</span>
                  <span className="perf-detail__v">{activePerf.games}</span>
                </div>
                <div>
                  <span className="perf-detail__k">Recent trend</span>
                  <span
                    className={`perf-detail__v ${
                      activePerf.prog > 0
                        ? 'stat--positive'
                        : activePerf.prog < 0
                          ? 'stat--negative'
                          : ''
                    }`}
                  >
                    {formatSigned(activePerf.prog)}
                  </span>
                </div>
                {typeof activePerf.rd === 'number' && (
                  <div>
                    <span className="perf-detail__k">Deviation</span>
                    <span className="perf-detail__v">±{activePerf.rd}</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="empty empty--inline">No rating for this speed yet.</p>
          )}
        </div>
      )}
    </section>
  );
}
