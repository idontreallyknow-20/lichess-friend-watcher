import type { GameRecord } from '../types';
import { formatDateTime, formatSigned } from '../utils/format';

interface GamesTableProps {
  games: GameRecord[];
  loading: boolean;
  error: string | null;
}

const RESULT_LABEL: Record<GameRecord['result'], string> = {
  win: 'Win',
  loss: 'Loss',
  draw: 'Draw',
};

export function GamesTable({ games, loading, error }: GamesTableProps) {
  return (
    <section className="card card--wide">
      <h2 className="card__title">
        Recent games
        {loading && <span className="card__loading"> · loading…</span>}
      </h2>

      {error && <p className="search__error" role="alert">{error}</p>}

      {!error && games.length === 0 && !loading && (
        <p className="empty">No finished games found.</p>
      )}

      {games.length > 0 && (
        <div className="table-wrap">
          <table className="games-table">
            <thead>
              <tr>
                <th>Result</th>
                <th>Opponent</th>
                <th>Color</th>
                <th>Elo</th>
                <th>Time</th>
                <th>Ended</th>
                <th aria-label="Link" />
              </tr>
            </thead>
            <tbody>
              {games.map((g) => (
                <tr key={g.id}>
                  <td>
                    <span className={`result-pill result-pill--${g.result}`}>
                      {RESULT_LABEL[g.result]}
                    </span>
                  </td>
                  <td className="games-table__opponent">{g.opponent}</td>
                  <td>
                    <span className={`color-dot color-dot--${g.color}`} aria-hidden="true" />
                    {g.color === 'white' ? 'White' : 'Black'}
                  </td>
                  <td>
                    {g.ratingDiff === null ? (
                      <span className="muted">N/A</span>
                    ) : (
                      <span
                        className={
                          g.ratingDiff > 0
                            ? 'stat--positive'
                            : g.ratingDiff < 0
                              ? 'stat--negative'
                              : ''
                        }
                      >
                        {formatSigned(g.ratingDiff)}
                      </span>
                    )}
                  </td>
                  <td>{g.timeControl}</td>
                  <td className="muted">{formatDateTime(g.endTime)}</td>
                  <td>
                    <a
                      className="games-table__link"
                      href={`https://lichess.org/${g.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
