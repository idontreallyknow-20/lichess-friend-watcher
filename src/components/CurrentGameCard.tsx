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
    <section className="card">
      <h2 className="card__title">Current game</h2>

      {gameId ? (
        <>
          <div className="game__id">
            Game ID: <code>{gameId}</code>
          </div>
          <div className="game__elapsed">
            <span className="game__elapsed-label">Watched for</span>
            <span className="game__elapsed-value">
              {gameDetectedAt ? formatDuration(now - gameDetectedAt) : '0:00'}
            </span>
          </div>
          <a
            className="btn btn--spectate"
            href={`https://lichess.org/${gameId}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            ▶ Spectate on Lichess
          </a>
          <p className="game__note">
            Opens the live board on lichess.org — this app shows no moves or analysis.
          </p>
        </>
      ) : (
        <p className="empty">Not in a game right now.</p>
      )}
    </section>
  );
}
