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

function pick(items: string[], seed: number) {
  return items[Math.abs(seed) % items.length];
}

function moodFor(score: number, stats: ReturnType<typeof computeStats>, streak: ReturnType<typeof latestStreak>) {
  const seed = score + stats.total * 5 + stats.wins * 7 + stats.losses * 11 + streak.count * 13;

  if (score >= 78) {
    const messages =
      streak.type === 'loss' && streak.count >= 3
        ? [
            'Nah, this is tilt theater. The losses are stacking and the chair is one blunder from getting blamed.',
            'He is in the danger zone. Three losses deep means the board is officially talking back.',
            'The session is yelling now. This is the exact moment a normal person takes a water break.',
            'Full red alert. The last few games are giving "I can win it back" energy.',
            'He is pressing so hard the pieces are probably filing complaints.',
            'This is not a slump anymore, this is a live broadcast of bad decisions.',
          ]
        : [
            'The session is getting spicy in the bad direction. A reset would not be dramatic.',
            'Tilt meter is screaming. Every move feels like it came with extra emotional damage.',
            'The vibes are cooked. He needs one clean win before this gets ridiculous.',
            'This is the part where confidence starts writing checks the position cannot cash.',
            'The board is winning the argument right now, loudly.',
            'Very messy scenes. The comeback arc needs to start immediately.',
          ];
    return {
      label: 'Tilt sirens',
      text: pick(messages, seed),
    };
  }
  if (score >= 56) {
    const messages =
      stats.losses > stats.wins
        ? [
            'He is a little underwater right now. Not doomed, but the board is asking questions.',
            'Shaky session. The rating is not on fire, but someone definitely smelled smoke.',
            'This is still fixable, but the next game has way too much emotional importance.',
            'He is playing like every click arrives half a second late.',
            'The results are wobbling. One nice win would calm the whole room down.',
            'Not disaster class, but the dashboard is side-eyeing the last few games.',
          ]
        : [
            'The results are okay, but the vibe is wobbly. One bad game could make it loud.',
            'He is surviving the chaos, but it is not exactly smooth criminal chess.',
            'Scoreboard looks decent. The process looks like it took the scenic route.',
            'A little shaky, a little lucky, still alive. Respectfully unstable.',
            'Could be worse, could be cleaner. The meter is keeping one eye open.',
            'He is winning enough to argue with the tilt meter, but not enough to silence it.',
          ];
    return {
      label: 'Shaky',
      text: pick(messages, seed),
    };
  }
  if (score >= 34) {
    const messages =
      stats.wins >= stats.losses
        ? [
            'Pretty stable session. Some chaos, but nothing that needs an intervention.',
            'He is mostly holding it together. The tilt meter is annoyed, not alarmed.',
            'Decent control. A few messy moments, but the wheels are still attached.',
            'The session is behaving. Not clean, but absolutely playable.',
            'Some turbulence, still cruising. The rating graph has not started yelling.',
            'He is doing fine, with just enough chaos to keep it funny.',
          ]
        : [
            'Slightly messy, still recoverable. The next couple games decide the mood.',
            'Small trouble brewing. Nothing fatal, but the meter is warming up.',
            'The losses are nibbling at the vibe. He needs one grown-up game.',
            'This is the suspicious middle zone where tilt pretends it is strategy.',
            'Recoverable, but the session is starting to develop a personality.',
            'Not terrible, not comfortable. The next result matters more than it should.',
          ];
    return {
      label: 'Locked-ish',
      text: pick(messages, seed),
    };
  }
  const messages =
    stats.wins > stats.losses
      ? [
          'He is cruising. The rating graph is allowed to smile a little.',
          'Smooth session. The tilt meter is basically unemployed right now.',
          'He is cooking quietly. No panic, just points.',
          'Clean enough to be dangerous. The board is cooperating for once.',
          'This is a good stretch. The losses are not getting invited to the party.',
          'Calm wins, calm rating, calm dashboard. Suspiciously professional.',
        ]
      : [
          'Low danger right now. Quiet session, no tilt weather on the radar.',
          'Nothing dramatic yet. The meter is relaxed and mildly bored.',
          'Tiny sample, tiny stress. We are not overreacting today.',
          'The session is still peaceful. No emergency broadcast needed.',
          'Quiet board, quiet mood. The dashboard is just watching politely.',
          'No real tilt signal. The vibes are normal, which is rare and honestly impressive.',
        ];
  return {
    label: 'Chilling',
    text: pick(messages, seed),
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

  const fillColor =
    mood.score >= 78
      ? 'var(--loss)'
      : mood.score >= 56
        ? 'var(--draw)'
        : mood.score >= 34
          ? 'var(--accent)'
          : 'var(--win)';

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

      <div className="tilt" style={{ marginTop: 18 }} aria-label={`Tilt meter ${mood.score}%`}>
        <div
          className="tilt__top"
          style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.78rem' }}
        >
          <span>Tilt meter</span>
          <strong>{mood.score}%</strong>
        </div>
        <div
          className="tilt__track"
          style={{
            height: 14,
            overflow: 'hidden',
            border: '1px solid var(--border)',
            background:
              'linear-gradient(90deg, color-mix(in srgb, var(--win) 60%, transparent), color-mix(in srgb, var(--draw) 65%, transparent), color-mix(in srgb, var(--loss) 70%, transparent))',
          }}
        >
          <span
            className="tilt__fill"
            style={{
              display: 'block',
              width: `${mood.score}%`,
              height: '100%',
              background: fillColor,
              boxShadow: `0 0 18px ${fillColor}`,
            }}
          />
        </div>
      </div>
    </section>
  );
}
