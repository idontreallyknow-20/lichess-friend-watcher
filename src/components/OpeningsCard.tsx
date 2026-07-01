import { useMemo, useState } from 'react';
import type { GameRecord } from '../types';
import { computeOpeningTable, type OpeningTableRow } from '../utils/insights';

type SortKey = 'popular' | 'best' | 'worst' | 'opponent' | 'recent';
type ColorSide = 'white' | 'black';

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

function rateFor(rec: OpeningTableRow['white']) {
  const total = colorTotal(rec);
  if (total === 0) return null;
  return Math.round(((rec.wins + rec.draws * 0.5) / total) * 100);
}

function lastPlayed(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function colorRecommendation(openings: OpeningTableRow[], side: ColorSide, mode: 'best' | 'worst', minGames: number) {
  const ranked = openings
    .map((row) => {
      const rec = row[side];
      const total = colorTotal(rec);
      const rate = rateFor(rec);
      return { row, total, rate };
    })
    .filter((item) => item.rate !== null && item.total >= minGames);

  ranked.sort((a, b) =>
    mode === 'best'
      ? (b.rate as number) - (a.rate as number) || b.total - a.total
      : (a.rate as number) - (b.rate as number) || b.total - a.total,
  );

  return ranked[0] ?? null;
}

export function OpeningsCard({ games }: { games: GameRecord[] }) {
  const [sort, setSort] = useState<SortKey>('popular');
  const [minGames, setMinGames] = useState(3);
  const openings = useMemo(() => computeOpeningTable(games), [games]);
  const qualified = useMemo(
    () => openings.filter((opening) => opening.total >= minGames),
    [openings, minGames],
  );
  const sorted = useMemo(() => {
    const rows = [...qualified];
    if (sort === 'best') return rows.sort((a, b) => b.winRate - a.winRate || b.total - a.total);
    if (sort === 'worst') return rows.sort((a, b) => a.winRate - b.winRate || b.total - a.total);
    if (sort === 'opponent') return rows.sort((a, b) => b.opponentWins - a.opponentWins || a.winRate - b.winRate);
    if (sort === 'recent') return rows.sort((a, b) => b.lastPlayed - a.lastPlayed);
    return rows;
  }, [qualified, sort]);

  const favorite = openings[0] ?? null;
  const best = [...qualified].sort((a, b) => b.winRate - a.winRate || b.total - a.total)[0] ?? null;
  const danger =
    [...qualified].sort((a, b) => a.winRate - b.winRate || b.opponentWins - a.opponentWins)[0] ?? null;
  const whiteBest = colorRecommendation(openings, 'white', 'best', minGames);
  const whiteWorst = colorRecommendation(openings, 'white', 'worst', minGames);
  const blackBest = colorRecommendation(openings, 'black', 'best', minGames);
  const blackWorst = colorRecommendation(openings, 'black', 'worst', minGames);

  return (
    <section className="card card--wide">
      <div className="openings-head">
        <h2 className="card__title">Openings</h2>
        <div className="openings-controls">
          <div className="seg" role="tablist" aria-label="Opening sort">
            {[
              ['popular', 'Most played'],
              ['best', 'Best score'],
              ['worst', 'Worst score'],
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
          <div className="seg" role="tablist" aria-label="Minimum games">
            {[1, 2, 3, 5, 10].map((value) => (
              <button
                key={value}
                className={`seg__btn ${minGames === value ? 'seg__btn--active' : ''}`}
                onClick={() => setMinGames(value)}
              >
                {value}+ games
              </button>
            ))}
          </div>
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

          <div className="opening-recs">
            <OpeningRec title="Best as White" item={whiteBest} side="white" tone="pos" />
            <OpeningRec title="Worst as White" item={whiteWorst} side="white" tone="neg" />
            <OpeningRec title="Best as Black" item={blackBest} side="black" tone="pos" />
            <OpeningRec title="Worst as Black" item={blackWorst} side="black" tone="neg" />
          </div>

          <p className="empty openings-filter-note">
            Showing openings with at least {minGames} game{minGames === 1 ? '' : 's'}.
          </p>

          <div className="table-wrap">
            <table className="games-table openings-table">
              <thead>
                <tr>
                  <th>Opening</th>
                  <th>Record</th>
                  <th>Win rate</th>
                  <th>Color use</th>
                  <th>White %</th>
                  <th>Black %</th>
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
                    <td>{rateFor(row.white) === null ? 'N/A' : `${rateFor(row.white)}%`}</td>
                    <td>{rateFor(row.black) === null ? 'N/A' : `${rateFor(row.black)}%`}</td>
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

function OpeningRec({
  title,
  item,
  side,
  tone,
}: {
  title: string;
  item: ReturnType<typeof colorRecommendation> | null;
  side: ColorSide;
  tone: 'pos' | 'neg';
}) {
  const rec = item?.row[side];
  const rate = rec ? rateFor(rec) : null;
  return (
    <div className="opening-rec">
      <span className="opening-rec__k">{title}</span>
      {item && rec && rate !== null ? (
        <>
          <span className={`opening-rec__name ${tone === 'pos' ? 'stat--positive' : 'stat--negative'}`}>
            {item.row.name}
          </span>
          <span className="opening-rec__meta">
            {rate}% over {item.total} game{item.total === 1 ? '' : 's'} ({rec.wins}-{rec.losses}-{rec.draws})
          </span>
        </>
      ) : (
        <span className="opening-rec__meta">Not enough games yet.</span>
      )}
    </div>
  );
}
