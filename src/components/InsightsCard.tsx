import { useMemo } from 'react';
import type { GameRecord } from '../types';
import { computeInsights, winRate, type ColorRecord } from '../utils/insights';

interface InsightsCardProps {
  /** Games newest-first. */
  games: GameRecord[];
}

function ColorRow({ label, rec }: { label: string; rec: ColorRecord }) {
  const rate = winRate(rec);
  return (
    <div className="color-row">
      <div className="color-row__head">
        <span className="color-row__label">{label}</span>
        <span className="color-row__rate">{rate === null ? 'N/A' : `${rate}%`}</span>
      </div>
      <div className="color-bar" aria-hidden="true">
        <span className="color-bar__seg color-bar__seg--win" style={{ flexGrow: rec.wins }} />
        <span className="color-bar__seg color-bar__seg--draw" style={{ flexGrow: rec.draws }} />
        <span className="color-bar__seg color-bar__seg--loss" style={{ flexGrow: rec.losses }} />
      </div>
      <div className="color-row__counts muted">
        {rec.wins}W / {rec.losses}L / {rec.draws}D
      </div>
    </div>
  );
}

export function InsightsCard({ games }: InsightsCardProps) {
  const insights = useMemo(() => computeInsights(games), [games]);
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

  return (
    <section className="card">
      <h2 className="card__title">Insights</h2>

      {games.length === 0 ? (
        <p className="empty">No games in this view yet.</p>
      ) : (
        <>
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
        </>
      )}
    </section>
  );
}
