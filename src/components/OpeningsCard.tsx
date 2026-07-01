import { useMemo, useState } from 'react';
import type { GameRecord } from '../types';
import { computeOpeningTable, type OpeningTableRow } from '../utils/insights';

type SortKey = 'popular' | 'best' | 'opponent' | 'recent';

function colorTotal(rec: OpeningTableRow['white']) {
  return rec.wins + rec.losses + rec.draws;
}

function recordText(row: OpeningTableRow) {
  return `${row.wins}-${row.losses}-${row.draws}`;
}

function colorText(row: OpeningTableRow) {
  const whiteTotal = colorTotal(row.white);
  const blackTotal = colorTotal(row.black);
  if (whiteTotal === 0 && blackTotal === 0) return 'N/A';
  return `${whiteTotal}W / ${blackTotal}B`;
}

function lastPlayed(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function OpeningsCard({ games }: { games: GameRecord[] }) {
  const [sort, setSort] = useState<SortKey>('popular');
  const openings = useMemo(() => computeOpeningTable(games), [games]);
  const sorted = useMemo(() => {
    const rows = [...openings];
    if (sort === 'best') return rows.sort((a, b) => b.winRate - a.winRate || b.total - a.total);
    if (sort === 'opponent') return rows.sort((a, b) => b.opponentWins - a.opponentWins || a.winRate - b.winRate);
    if (sort === 'recent') return rows.sort((a, b) => b.lastPlayed - a.lastPlayed);
    return rows;
  }, [openings, sort]);

  const favorite = openings[0] ?? null;
  const best = openings.filter((o) => o.total >= 2).sort((a, b) => b.winRate - a.winRate)[0] ?? null;
  const danger =
    openings.filter((o) => o.total >= 2).sort((a, b) => a.winRate - b.winRate || b.opponentWins - a.opponentWins)[0] ??
    null;

  return (
    <section className="card card--wide">
      <div className="openings-head">
        <h2 className="card__title">Openings</h2>
        <div className="seg" role="tablist" aria-label="Opening sort">
          {[
            ['popular', 'Popular'],
            ['best', 'Best'],
            ['opponent', 'Opponent success'],
            ['recent', 'Recent'],
          ].map(([id, label]) => (
            <button
              key={id}
              className={`seg__btn ${sort === id ? 'seg__btn--active' : ''}`}
              onClick={() => setSort(id as SortKey)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {openings.length === 0 ? (
        <p className="empty">No opening data found in the recent games export.</p>
      ) : (
        <>
          <div className="opening-summary">
            <div className="metric">
              <span className="metric__k">Most played by you</span>
              <span className="metric__v">{favorite ? favorite.name : 'N/A'}</span>
            </div>
            <div className="metric">
              <span className="metric__k">Best scorer</span>
              <span className="metric__v stat--positive">
                {best ? `${best.name} (${best.winRate}%)` : 'N/A'}
              </span>
            </div>
            <div className="metric">
              <span className="metric__k">Opponent danger</span>
              <span className="metric__v stat--negative">
                {danger ? `${danger.name} (${danger.winRate}%)` : 'N/A'}
              </span>
            </div>
          </div>

          <div className="table-wrap">
            <table className="games-table openings-table">
              <thead>
                <tr>
                  <th>Opening</th>
                  <th>Record</th>
                  <th>Win rate</th>
                  <th>Color use</th>
                  <th>Opp. wins</th>
                  <th>Avg opp</th>
                  <th>Last</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row) => (
                  <tr key={row.name}>
                    <td className="games-table__opponent">{row.name}</td>
                    <td>{recordText(row)}</td>
                    <td className={row.winRate >= 55 ? 'stat--positive' : row.winRate <= 45 ? 'stat--negative' : ''}>
                      {row.winRate}%
                    </td>
                    <td>{colorText(row)}</td>
                    <td className={row.opponentWins > row.wins ? 'stat--negative' : ''}>{row.opponentWins}</td>
                    <td>{row.avgOpponent ?? 'N/A'}</td>
                    <td>{lastPlayed(row.lastPlayed)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
