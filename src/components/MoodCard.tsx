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

const GAUGE_TICKS = [0, 20, 40, 60, 80, 100];

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

  const needleAngle = -126 + mood.score * 2.52;

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

      <div
        className="tilt-gauge"
        style={{
          marginTop: 18,
          background:
            'radial-gradient(circle at 50% 78%, #1b1515 0 10%, transparent 11%), linear-gradient(145deg, color-mix(in srgb, var(--loss) 36%, var(--bg-elev)), var(--bg-elev-2))',
          border: '1px solid var(--border)',
          padding: 12,
          boxShadow: 'inset 0 0 18px rgba(0, 0, 0, 0.25)',
        }}
      >
        <svg viewBox="0 0 320 190" role="img" aria-label={`Tilt meter ${mood.score}%`} style={{ width: '100%', display: 'block' }}>
          <path d="M42 154 A118 118 0 0 1 278 154" fill="#f7f1d8" stroke="rgba(0,0,0,0.35)" strokeWidth="8" />
          <path d="M52 150 A108 108 0 0 1 268 150" fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="2" />
          <path d="M214 76 A90 90 0 0 1 268 150" fill="none" stroke="rgba(224,82,75,0.45)" strokeWidth="20" />
          {GAUGE_TICKS.map((tick) => {
            const angle = (-126 + tick * 2.52) * (Math.PI / 180);
            const outerX = 160 + Math.cos(angle) * 108;
            const outerY = 154 + Math.sin(angle) * 108;
            const innerX = 160 + Math.cos(angle) * 88;
            const innerY = 154 + Math.sin(angle) * 88;
            const labelX = 160 + Math.cos(angle) * 70;
            const labelY = 154 + Math.sin(angle) * 70;
            return (
              <g key={tick}>
                <line x1={innerX} y1={innerY} x2={outerX} y2={outerY} stroke="#333" strokeWidth="3" />
                <text
                  x={labelX}
                  y={labelY + 5}
                  textAnchor="middle"
                  fontSize="17"
                  fontWeight="800"
                  fill="#3b3b36"
                >
                  {tick}
                </text>
              </g>
            );
          })}
          {Array.from({ length: 41 }, (_, i) => i * 2.5).map((tick) => {
            const angle = (-126 + tick * 2.52) * (Math.PI / 180);
            const outerX = 160 + Math.cos(angle) * 107;
            const outerY = 154 + Math.sin(angle) * 107;
            const innerX = 160 + Math.cos(angle) * (tick % 10 === 0 ? 94 : 100);
            const innerY = 154 + Math.sin(angle) * (tick % 10 === 0 ? 94 : 100);
            return <line key={tick} x1={innerX} y1={innerY} x2={outerX} y2={outerY} stroke="#333" strokeWidth="1" />;
          })}
          <text x="160" y="98" textAnchor="middle" fontSize="34" fontWeight="900" fill="var(--loss)">
            TILT
          </text>
          <text x="160" y="122" textAnchor="middle" fontSize="16" fontWeight="700" fill="#6d625b">
            MOOD METER
          </text>
          <g transform={`rotate(${needleAngle} 160 154)`}>
            <line x1="160" y1="154" x2="255" y2="154" stroke="var(--loss)" strokeWidth="6" strokeLinecap="round" />
            <path d="M263 154 L246 144 L246 164 Z" fill="var(--loss)" />
          </g>
          <circle cx="160" cy="154" r="22" fill="#292522" stroke="#090909" strokeWidth="4" />
          <path d="M36 154 H284 V188 H36 Z" fill="color-mix(in srgb, var(--loss) 45%, #3a1010)" opacity="0.92" />
        </svg>
        <div
          className="tilt__top"
          style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: '0.78rem' }}
        >
          <span>Tilt meter</span>
          <strong>{mood.score}%</strong>
        </div>
      </div>
    </section>
  );
}
