# Lichess Friend Watcher

A clean React + Vite + TypeScript dashboard for **spectating and tracking** any
Lichess player. Type a username, watch their live status, get a browser
notification when they start a game, and follow their daily / session stats.

> **Spectating only.** This app deliberately shows **no** chess advice, engine
> analysis, best moves, or opening suggestions. It never fetches moves or
> evaluations — it only tracks status and results. The "Spectate" button hands
> you off to lichess.org for the actual board.

## Features

- **Username search** with Lichess API validation, helpful "not found" errors,
  and recent usernames saved in `localStorage` (click to re-watch, × to remove).
- **Live status** polled every ~7 seconds (never faster than 5s, to respect
  Lichess rate limits): online/offline, playing/not playing, current game id,
  a direct spectate link, time elapsed since the game was detected, and last
  checked time. Manual **Refresh now** button included.
- **Browser notifications** — request permission with a button, get notified
  once per new game (`"{username} started a game on Lichess"`, click to open the
  game), with no duplicate notifications and an automatic reset when play stops.
- **Daily stats** from the last ~100 games (NDJSON parsed), filtered to today in
  your local timezone: wins, losses, draws, total, and net Elo. Elo is only
  summed from finished **rated** games that carry a rating delta — otherwise
  it shows **N/A** (no guessing).
- **Session stats** — Start / Reset session (start time persisted in
  `localStorage`), counting only games finished after the session began, plus a
  live session duration.
- **Correct W/L/D logic** — detects the watched user's color, uses the `winner`
  field, treats finished winner-less games (draw, stalemate, repetition,
  insufficient material, timeout draw, …) as draws, and ignores aborted /
  unfinished games.
- **Recent games table** — result, opponent, color, rating change (or N/A),
  time control, end time, and a link to each game.
- Responsive, modern dashboard layout for desktop and mobile.

## Project structure

```
lichess-friend-watcher/
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── public/
│   └── favicon.svg
└── src/
    ├── api/
    │   └── lichess.ts          # API calls: validate user, status, games (NDJSON)
    ├── components/
    │   ├── Header.tsx
    │   ├── SearchBar.tsx
    │   ├── RecentUsers.tsx
    │   ├── StatusCard.tsx
    │   ├── CurrentGameCard.tsx
    │   ├── StatsCard.tsx
    │   ├── SessionControls.tsx
    │   └── GamesTable.tsx
    ├── hooks/
    │   ├── useLocalStorage.ts
    │   ├── useNow.ts
    │   ├── useStatus.ts        # ~7s status polling + game-detection timing
    │   ├── useGames.ts
    │   └── useNotifications.ts
    ├── utils/
    │   ├── games.ts            # raw game -> normalized record, W/L/D logic
    │   ├── stats.ts            # aggregation, today / session filters
    │   └── format.ts           # duration / time / signed number helpers
    ├── types.ts
    ├── App.tsx
    ├── main.tsx
    └── styles.css
```

## Install & run

```bash
npm install
npm run dev
```

Then open the printed local URL (default http://localhost:5173).

To create a production build:

```bash
npm run build
npm run preview
```

## Notes on the Lichess API

- User existence: `GET /api/user/{username}` (404 ⇒ not found).
- Live status: `GET /api/users/status?ids={username}&withGameIds=true`.
- Recent games: `GET /api/games/user/{username}` with
  `Accept: application/x-ndjson` (requested with moves/evals/openings disabled).

No API token is required for these public endpoints.
