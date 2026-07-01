import { useEffect, useMemo, useState } from 'react';
import type { GameRecord, UserStatus } from '../types';
import { fetchLiveGameSummary, type LiveGamePlayer, type LiveGameSummary } from '../api/lichess';
import { formatDuration } from '../utils/format';
import { useNow } from '../hooks/useNow';

interface CurrentGameCardProps {
  username: string;
  status: UserStatus | null;
  gameDetectedAt: number | null;
  games: GameRecord[];
}

function sameUser(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function playerText(player: LiveGamePlayer) {
  return `${player.name} (${player.rating ?? 'N/A'})`;
}

function matchupText(username: string, status: UserStatus | null, summary: LiveGameSummary | null) {
  if (!summary) return `${status?.name ?? username} (N/A) vs opponent (N/A)`;

  const watchedNames = [username, status?.name, status?.id].filter(Boolean) as string[];
  const watchedIsWhite = watchedNames.some((name) => sameUser(name, summary.white.name));
  const watchedIsBlack = watchedNames.some((name) => sameUser(name, summary.black.name));

  if (watchedIsWhite) return `${playerText(summary.white)} vs ${playerText(summary.black)}`;
  if (watchedIsBlack) return `${playerText(summary.black)} vs ${playerText(summary.white)}`;
  return `${playerText(summary.white)} vs ${playerText(summary.black)}`;
}

function resultLabel(result: GameRecord['result']) {
  if (result === 'win') return 'Won';
  if (result === 'loss') return 'Lost';
  return 'Drew';
}

function timeAgo(timestamp: number, now: number) {
  const delta = Math.max(0, now - timestamp);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (delta < minute) return 'just now';
  if (delta < hour) return `${Math.floor(delta / minute)}m ago`;
  if (delta < day) return `${Math.floor(delta / hour)}h ago`;
  return `${Math.floor(delta / day)}d ago`;
}

export function CurrentGameCard({ username, status, gameDetectedAt, games }: CurrentGameCardProps) {
  const now = useNow(1000);
  const gameId = status?.playing ? status.playingId : null;
  const [summary, setSummary] = useState<LiveGameSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSummary(null);

    if (!gameId) return;
    fetchLiveGameSummary(gameId)
      .then((next) => {
        if (!cancelled) setSummary(next);
      })
      .catch(() => {
        if (!cancelled) setSummary(null);
      });

    return () => {
      cancelled = true;
    };
  }, [gameId]);

  const liveLabel = useMemo(() => matchupText(username, status, summary), [username, status, summary]);
  const statusText = gameId ? 'Playing' : status?.online ? 'Online, not playing' : 'Offline';
  const lastGame = useMemo(() => [...games].sort((a, b) => b.endTime - a.endTime)[0] ?? null, [games]);

  return (
    <section className="card card--game">
      <h2 className="card__title">Live status</h2>

      {gameId ? (
        <>
          <div
            className="game__status"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
              marginTop: 12,
            }}
          >
            <span
              style={{
                color: 'var(--win)',
                fontSize: '0.78rem',
                fontWeight: 800,
                letterSpacing: 0,
                textTransform: 'uppercase',
              }}
            >
              {statusText}
            </span>
            <span style={{ color: 'var(--text-dim)', fontSize: '0.82rem' }}>
              Watched for {gameDetectedAt ? formatDuration(now - gameDetectedAt) : '0:00'}
            </span>
          </div>
          <p
            className="game__matchup"
            style={{ margin: '12px 0 0', fontSize: '1.05rem', fontWeight: 800, lineHeight: 1.35 }}
          >
            {liveLabel}
          </p>
          <div
            className="game__meta-line"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 10,
              flexWrap: 'wrap',
              marginTop: 10,
              color: 'var(--text-dim)',
              fontSize: '0.82rem',
            }}
          >
            <span>
              Game ID: <code>{gameId}</code>
            </span>
          </div>
          <a
            className="btn btn--spectate"
            href={`https://lichess.org/${gameId}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Spectate on Lichess
          </a>
          <p className="game__note">Opens the live board on lichess.org. This app shows no moves or analysis.</p>
        </>
      ) : status?.online ? (
        <p className="empty">{statusText}</p>
      ) : (
        <div className="offline-status">
          <p className="empty">{statusText}</p>
          {lastGame ? (
            <div className="last-played">
              <div className="last-played__head">
                <span>Last played</span>
                <span>{timeAgo(lastGame.endTime, now)}</span>
              </div>
              <div className="last-played__result">
                <strong
                  className={
                    lastGame.result === 'win'
                      ? 'stat--positive'
                      : lastGame.result === 'loss'
                        ? 'stat--negative'
                        : 'stat--neutral'
                  }
                >
                  {resultLabel(lastGame.result)}
                </strong>
                <span>
                  {lastGame.speed} vs {lastGame.opponent}
                </span>
              </div>
              <div className="last-played__meta">
                <span>{lastGame.timeControl}</span>
                {lastGame.ratingDiff !== null && (
                  <span className={lastGame.ratingDiff >= 0 ? 'stat--positive' : 'stat--negative'}>
                    {lastGame.ratingDiff >= 0 ? '+' : ''}
                    {lastGame.ratingDiff} rating
                  </span>
                )}
              </div>
            </div>
          ) : (
            <p className="empty">No recent finished games found yet.</p>
          )}
        </div>
      )}
    </section>
  );
}
