import { useMemo } from 'react';
import type { GameRecord } from '../types';
import {
  computeInsights,
  computeDetailedInsights,
  type ColorRecord,
  type OpeningRecord,
} from '../utils/insights';
import { formatSigned } from '../utils/format';

interface InsightsCardProps {
  title?: string;
  /** Games newest-first (already scoped/filtered by the caller). */
  games: GameRecord[];
}

function percent(value: number, total: number) {
  return total === 0 ? 0 : Math.round((value / total) * 100);
}

function ColorRow({ label, rec }: { label: string; rec: ColorRecord }) {
  const total = rec.wins + rec.losses + rec.draws;
  const winPct = percent(rec.wins, total);
  const drawPct = percent(rec.draws, total);
  const lossPct = percent(rec.losses, total);

  return (
    <div className="color-row">
      <div className="color-row__head">
        <span className="color-row__label">{label}</span>
        <span className="color-row__rate">{total === 0 ? 'N/A' : `${winPct}% / ${drawPct}% / ${lossPct}%`}</span>
      </div>
      <div className="color-bar" aria-hidden="true">
        <span className="color-bar__seg color-bar__seg--win" style={{ flexGrow: rec.wins }} />
        <span className="color-bar__seg color-bar__seg--draw" style={{ flexGrow: rec.draws }} />
        <span className="color-bar__seg color-bar__seg--loss" style={{ flexGrow: rec.losses }} />
      </div>
      <div className="outcome-split">
        <span style={{ color: 'var(--win)' }}>Win {total === 0 ? 'N/A' : `${winPct}%`}</span>
        <span style={{ color: 'var(--draw)' }}>Draw {total === 0 ? 'N/A' : `${drawPct}%`}</span>
        <span style={{ color: 'var(--loss)' }}>Loss {total === 0 ? 'N/A' : `${lossPct}%`}</span>
      </div>
    </div>
  );
}

function Metric({ k, v, tone }: { k: string; v: string; tone?: 'pos' | 'neg' }) {
  const cls = tone === 'pos' ? 'stat--positive' : tone === 'neg' ? 'stat--negative' : '';
  return (
    <div className="metric">
      <span className="metric__k">{k}</span>
      <span className={`metric__v ${cls}`}>{v}</span>
    </div>
  );
}

function OpeningRow({ label, rec, tone }: { label: string; rec: OpeningRecord; tone?: 'pos' | 'neg' }) {
  const cls = tone === 'pos' ? 'stat--positive' : tone === 'neg' ? 'stat--negative' : '';
  return (
    <div className="opening-row">
      <span className="opening-row__label">{label}</span>
      <span className="opening-row__name">{rec.name}</span>
      <span className={`opening-row__rate ${cls}`}>
        {rec.winRate}% <span className="muted">· {rec.total} game{rec.total === 1 ? '' : 's'}</span>
      </span>
    </div>
  );
}

export function InsightsCard({ title = 'Insights', games }: InsightsCardProps) {
  const insights = useMemo(() => computeInsights(games), [games]);
  const detail = useMemo(() => computeDetailedInsights(games), [games]);
  const { currentStreak } = insights;

  const streakText =
    currentStreak.count === 0 || currentStreak.type === null
      ? 'None'
      : `${currentStreak.count} ${
          currentStreak.type === 'win'
            ? currentStreak.count > 1
              ? 'wins'
              : 'win'
            : currentStreak.type === 'loss'
              ? currentStreak.count > 1
                ? 'losses'
                : 'loss'
              : currentStreak.count > 1
                ? 'draws'
                : 'draw'
        }`;

  const streakClass =
    currentStreak.type === 'win'
      ? 'stat--positive'
      : currentStreak.type === 'loss'
        ? 'stat--negative'
        : '';

  const hasOpenings = detail.topOpening !== null;

  return (
    <section className="card">
      <h2 className="card__title">{title}</h2>

      {games.length === 0 ? (
        <p className="empty">No games in this view yet.</p>
      ) : (
        <>
          <div className="metric-grid">
            <Metric k="Record" v={`${detail.wins}-${detail.losses}-${detail.draws}`} />
            <Metric k="Win rate" v={detail.winRate === null ? 'N/A' : `${detail.winRate}%`} />
            <Metric
              k="Net Elo"
              v={detail.netElo === null ? 'N/A' : formatSigned(detail.netElo)}
              tone={detail.netElo === null ? undefined : detail.netElo >= 0 ? 'pos' : 'neg'}
            />
            <Metric k="Avg opponent" v={detail.avgOpponent === null ? 'N/A' : String(detail.avgOpponent)} />
            <Metric k="Rated" v={`${detail.ratedCount}/${detail.total}`} />
            <Metric
              k="Top time control"
              v={detail.topTimeControl ? detail.topTimeControl.label : 'N/A'}
            />
          </div>

          <ColorRow label="As White" rec={insights.white} />
          <ColorRow label="As Black" rec={insights.black} />

          <div className="streaks">
            <div className="streak">
              <span className="streak__k">Current streak</span>
              <span className={`streak__v ${streakClass}`}>{streakText}</span>
            </div>
            <div className="streak">
              <span className="streak__k">Best win run</span>
              <span className="streak__v stat--positive">{insights.bestWinStreak}</span>
            </div>
            <div className="streak">
              <span className="streak__k">Worst loss run</span>
              <span className="streak__v stat--negative">{insights.bestLossStreak}</span>
            </div>
          </div>

          {(detail.bestGame || detail.worstGame) && (
            <div className="streaks">
              {detail.bestGame && (
                <div className="streak">
                  <span className="streak__k">Best result</span>
                  <span className="streak__v stat--positive">
                    {formatSigned(detail.bestGame.ratingDiff)} vs {detail.bestGame.opponent}
                  </span>
                </div>
              )}
              {detail.worstGame && (
                <div className="streak">
                  <span className="streak__k">Worst result</span>
                  <span className="streak__v stat--negative">
                    {formatSigned(detail.worstGame.ratingDiff)} vs {detail.worstGame.opponent}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="openings">
            <h3 className="openings__title">Openings</h3>
            {hasOpenings ? (
              <>
                {detail.topOpening && <OpeningRow label="Most played" rec={detail.topOpening} />}
                {detail.bestOpening && <OpeningRow label="Best" rec={detail.bestOpening} tone="pos" />}
                {detail.worstOpening && <OpeningRow label="Worst" rec={detail.worstOpening} tone="neg" />}
              </>
            ) : (
              <p className="empty empty--inline">No opening data for these games.</p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
