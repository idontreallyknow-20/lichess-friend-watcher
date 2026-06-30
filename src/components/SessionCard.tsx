import { useMemo } from 'react';
import type { GameRecord } from '../types';
import { computeSessions, currentSession, sessionsToday } from '../utils/sessions';
import { computeStats } from '../utils/stats';
import { useNow } from '../hooks/useNow';
import { formatDuration, formatClock, formatSigned } from '../utils/format';

interface SessionCardProps {
  /** All recent games (any order). Sessions are speed-agnostic. */
  games: GameRecord[];
  /** Idle minutes that split one session from the next. */
  gapMinutes: number;
  onGapChange: (minutes: number) => void;
  isPlaying: boolean;
  loading: boolean;
}

const GAP_CHOICES = [15, 30, 60, 120];

export function SessionCard({ games, gapMinutes, onGapChange, isPlaying, loading }: SessionCardProps) {
  const now = useNow(1000);
  const gapMs = gapMinutes * 60 * 1000;

  const { session, stats, todayCount } = useMemo(() => {
    const sessions = computeSessions(games, gapMs);
    const current = currentSession(sessions);
    return {
      session: current,
      stats: current ? computeStats(current.games) : null,
      todayCount: sessionsToday(sessions),
    };
  }, [games, gapMs]);

  // A session is "live" if the player is in a game now, or the last game ended
  // within the gap window (so they may still be on a break, not finished).
  const live = session ? isPlaying || now - session.end <= gapMs : false;
  const effectiveEnd = session ? (live ? Math.max(session.end, now) : session.end) : 0;
  const duration = session ? effectiveEnd - session.start : 0;

  return (
    <section className="card">
      <h2 className="card__title">
        Current session
        {loading && <span className="card__loading"> · loading</span>}
      </h2>

      {!session || !stats ? (
        <p className="empty">No recent games to build a session from.</p>
      ) : (
        <>
          <div className="session-head">
            <div>
              <span className="session-head__duration">{formatDuration(duration)}</span>
              <span className={`session-head__state ${live ? 'session-head__state--live' : ''}`}>
                {live ? (isPlaying ? 'playing now' : 'active') : 'ended'}
              </span>
            </div>
            <label className="session-gap">
              <span>new session after</span>
              <select
                className="select select--sm"
                value={gapMinutes}
                onChange={(e) => onGapChange(Number(e.target.value))}
              >
                {GAP_CHOICES.map((m) => (
                  <option key={m} value={m}>
                    {m} min
                  </option>
                ))}
              </select>
            </label>
          </div>

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
              <span className="stat__label">Games</span>
            </div>
            <div className="stat">
              <span
                className={`stat__value ${
                  stats.eloChange === null
                    ? ''
                    : stats.eloChange > 0
                      ? 'stat--positive'
                      : stats.eloChange < 0
                        ? 'stat--negative'
                        : ''
                }`}
              >
                {stats.eloChange === null ? 'N/A' : formatSigned(stats.eloChange)}
              </span>
              <span className="stat__label">Elo</span>
            </div>
          </div>

          <div className="session-foot muted">
            Started {formatClock(session.start)} · {todayCount} session{todayCount === 1 ? '' : 's'} today
          </div>
        </>
      )}
    </section>
  );
}
