# Lichess Friend Watcher

A clean React + Vite + TypeScript dashboard for **spectating and tracking** any
Lichess player. Type a username, watch their live status, get a browser
notification when they start a game, and follow their daily / session stats.

> **Spectating only.** This app deliberately shows **no** chess advice, engine
> analysis, best moves, or opening suggestions. It never fetches moves or
> evaluations, only status and results. The "Spectate" button hands you off to
> lichess.org for the actual board.

## Features

- **Username search** with Lichess API validation, helpful "not found" errors,
  and recent usernames saved in `localStorage` (click to re-watch, x to remove).
- **Live status** polled every ~7 seconds (never faster than 5s, to respect
  Lichess rate limits): online/offline, playing/not playing, current game id,
  a direct spectate link, time elapsed since the game was detected, and last
  checked time. Manual **Refresh now** button included.
- **Browser notifications** with a permission button, fired once per new game
  (`"{username} started a game on Lichess"`, click to open the game), with no
  duplicate notifications and an automatic reset when play stops.
- **Optional sound alert** that plays a short chime on a new game (toggle in the
  toolbar, preference persisted).
- **Performance tabs** for each speed (Bullet, Blitz, Rapid, Classical,
  Correspondence) showing the current rating, recent trend, and deviation.
  Selecting a tab filters the whole dashboard to that speed.
- **Daily stats** from the last ~100 games (NDJSON parsed), filtered to today in
  your local timezone: wins, losses, draws, total, and net Elo. Elo is only
  summed from finished **rated** games that carry a rating delta, otherwise it
  shows **N/A** (no guessing).
- **Session stats** with Start / Reset (start time persisted in `localStorage`),
  counting only games finished after the session began, plus a live duration.
- **Insights** card: win rate split by color (White vs Black), current streak,
  and best win / worst loss runs.
- **Rating trend sparkline** of recent rated games for the selected speed.
- **Correct W/L/D logic** that detects the watched user's color, uses the
  `winner` field, treats finished winner-less games (draw, stalemate,
  repetition, insufficient material, timeout draw, and so on) as draws, and
  ignores aborted or unfinished games.
- **Recent games table**: result, opponent, color, rating change (or N/A),
  time control, end time, and a link to each game.
- **Theme factory** with 11 built-in themes (dark and light), persisted in
  `localStorage` and applied as CSS variables. No rounded corners anywhere.
- **Shareable URL** (`?user=` deep link) plus a live browser-tab title that
  reflects whether the watched player is online or in a game.
- Responsive dashboard layout for desktop and mobile.

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
    │   └── lichess.ts          # API calls: validate user, profile, status, games
    ├── theme/
    │   └── themes.ts           # theme factory + 11 theme presets
    ├── components/
    │   ├── Header.tsx
    │   ├── ThemePicker.tsx
    │   ├── SearchBar.tsx
    │   ├── RecentUsers.tsx
    │   ├── PerformanceTabs.tsx # per-speed rating tabs + dashboard speed filter
    │   ├── StatusCard.tsx
    │   ├── CurrentGameCard.tsx
    │   ├── StatsCard.tsx
    │   ├── SessionControls.tsx
    │   ├── InsightsCard.tsx    # color split + streaks
    │   ├── Sparkline.tsx
    │   ├── TrendCard.tsx       # rating trend sparkline
    │   └── GamesTable.tsx
    ├── hooks/
    │   ├── useLocalStorage.ts
    │   ├── useNow.ts
    │   ├── useStatus.ts        # ~7s status polling + game-detection timing
    │   ├── useGames.ts
    │   ├── useProfile.ts       # perf ratings
    │   ├── useNotifications.ts
    │   └── useTheme.ts
    ├── utils/
    │   ├── games.ts            # raw game -> normalized record, W/L/D logic
    │   ├── stats.ts            # aggregation, today / session filters
    │   ├── insights.ts         # color split + streak computation
    │   ├── speeds.ts           # speed ordering + labels
    │   ├── sound.ts            # Web Audio chime
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
