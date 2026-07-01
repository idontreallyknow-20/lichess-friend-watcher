import type { UserStatus } from '../types';
import { formatDuration } from '../utils/format';
import { useNow } from '../hooks/useNow';

interface CurrentGameCardProps {
  status: UserStatus | null;
  gameDetectedAt: number | null;
}

export function CurrentGameCard({ status, gameDetectedAt }: CurrentGameCardProps) {
  const now = useNow(1000);
  const gameId = status?.playing ? status.playingId : null;

  return (
    <section className="card card--game">
      <h2 className="card__title">Current game</h2>

      {gameId ? (
        <>
          <div
            className="game__preview"
            title="Live Lichess board preview"
            style={{
              aspectRatio: '4 / 3',
              width: '100%',
              background: 'var(--bg-elev-2)',
              border: '1px solid var(--border)',
              overflow: 'hidden',
            }}
          >
            <iframe
              src={`https://lichess.org/embed/${gameId}?theme=auto&bg=auto`}
              title={`Lichess game ${gameId}`}
              loading="lazy"
              referrerPolicy="no-referrer"
              style={{ width: '100%', height: '100%', border: 0, display: 'block' }}
            />
          </div>
          <div
            className="game__meta-line"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 10,
              flexWrap: 'wrap',
              marginTop: 12,
              color: 'var(--text-dim)',
              fontSize: '0.82rem',
            }}
          >
            <span>
              Game ID: <code>{gameId}</code>
            </span>
            <span>
              Watched for {gameDetectedAt ? formatDuration(now - gameDetectedAt) : '0:00'}
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
          <p className="game__note">
            Preview only. If Lichess blocks the embed, the spectate button opens the board.
          </p>
        </>
      ) : (
        <p className="empty">Not in a game right now.</p>
      )}
    </section>
  );
}
