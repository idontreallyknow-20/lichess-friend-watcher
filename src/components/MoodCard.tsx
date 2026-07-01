import { useMemo } from 'react';
import type { GameRecord, GameResult } from '../types';
import { computeSessions } from '../utils/sessions';
import { computeStats } from '../utils/stats';

interface MoodCardProps {
  games: GameRecord[];
  gapMinutes: number;
  isPlaying: boolean;
  loading: boolean;
}

function latestStreak(games: GameRecord[]): { type: GameResult | null; count: number } {
  const newest = [...games].sort((a, b) => b.endTime - a.endTime);
  const first = newest[0];
  if (!first) return { type: null, count: 0 };
  let count = 0;
  for (const game of newest) {
    if (game.result !== first.result) break;
    count += 1;
  }
  return { type: first.result, count };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function moodFor(score: number, stats: ReturnType<typeof computeStats>, streak: ReturnType<typeof latestStreak>) {
  if (score >= 78) {
    return {
      label: 'Tilt sirens',
      text: streak.type === 'loss' && streak.count >= 3
        ? 'The losses are stacking. This is pause-and-drink-water territory.'
        : 'The session is getting spicy in the bad direction. A reset would not be dramatic.',
    };
  }
  if (score >= 56) {
    return {
      label: 'Shaky',
      text: stats.losses > stats.wins
        ? 'He is a little underwater right now. Not doomed, but the board is asking questions.'
        : 'The results are okay, but the vibe is wobbly. One bad game could make it loud.',
    };
  }
  if (score >= 34) {
    return {
      label: 'Locked-ish',
      text: stats.wins >= stats.losses
        ? 'Pretty stable session. Some chaos, but nothing that needs an intervention.'
        : 'Slightly messy, still recoverable. The next couple games decide the mood.',
    };
  }
  return {
    label: 'Chilling',
    text: stats.wins > stats.losses
      ? 'He is cruising. The rating graph is allowed to smile a little.'
      : 'Low danger right now. Quiet session, no tilt weather on the radar.',
  };
}

export function MoodCard({ games, gapMinutes, isPlaying, loading }: MoodCardProps) {
  const mood = useMemo(() => {
    const sessions = computeSessions(games, gapMinutes * 60 * 1000);
    const session = sessions[sessions.length - 1];
    if (!session) return null;

    const stats = computeStats(session.games);
    const streak = latestStreak(session.games);
    const lossRate = stats.total ? stats.losses / stats.total : 0;
    const eloPenalty = stats.eloChange === null ? 0 : clamp(-stats.eloChange, 0, 45);
    const streakPenalty = streak.type === 'loss' ? Math.min(streak.count * 14, 42) : 0;
    const winRelief = stats.wins > stats.losses ? Math.min((stats.wins - stats.losses) * 8, 22) : 0;
    const score = clamp(Math.round(lossRate * 70 + eloPenalty + streakPenalty - winRelief), 0, 100);

    return {
      ...moodFor(score, stats, streak),
      score,
      stats,
      streak,
    };
  }, [games, gapMinutes]);

  if (!mood) {
    return (
      <section className="card">
        <h2 className="card__title">Current mood{loading && <span className="card__loading"> - loading</span>}</h2>
        <p className="empty">No session yet. Mood pending.</p>
      </section>
    );
  }

  const tiltClass =
    mood.score >= 78 ? 'tilt--red' : mood.score >= 56 ? 'tilt--orange' : mood.score >= 34 ? 'tilt--yellow' : 'tilt--green';

  return (
    <section className="card">
      <h2 className="card__title">Current mood{loading && <span className="card__loading"> - loading</span>}</h2>
      <div
        className="mood-head"
        style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start' }}
      >
        <div>
          <div
            className="mood-label"
            style={{ fontSize: '1.45rem', fontWeight: 800, lineHeight: 1.05 }}
          >
            {mood.label}
          </div>
          <p className="mood-copy" style={{ color: 'var(--text-dim)', margin: '8px 0 0', lineHeight: 1.45 }}>
            {mood.text}
          </p>
        </div>
        <span
          className={`mood-live ${isPlaying ? 'mood-live--on' : ''}`}
          style={{
            border: '1px solid var(--border)',
            padding: '5px 9px',
            whiteSpace: 'nowrap',
            color: isPlaying ? 'var(--win)' : 'var(--text-muted)',
            fontSize: '0.72rem',
            fontWeight: 700,
            textTransform: 'uppercase',
          }}
        >
          {isPlaying ? 'playing now' : 'between games'}
        </span>
      </div>

      <div className="tilt" style={{ marginTop: 18 }}>
        <div
          className="tilt__top"
          style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7, fontSize: '0.78rem' }}
        >
          <span>Tilt meter</span>
          <strong>{mood.score}%</strong>
        </div>
        <div
          className="tilt__track"
          aria-hidden="true"
          style={{
            height: 12,
            border: '1px solid var(--border)',
            background: 'linear-gradient(90deg, var(--win), var(--draw), var(--loss))',
            overflow: 'hidden',
          }}
        >
          <span
            className={`tilt__fill ${tiltClass}`}
            style={{
              display: 'block',
              width: `${mood.score}%`,
              height: '100%',
              background:
                mood.score >= 78
                  ? 'var(--loss)'
                  : mood.score >= 56
                    ? 'color-mix(in srgb, var(--loss) 65%, var(--draw))'
                    : mood.score >= 34
                      ? 'var(--draw)'
                      : 'var(--win)',
            }}
          />
        </div>
      </div>
    </section>
  );
}
