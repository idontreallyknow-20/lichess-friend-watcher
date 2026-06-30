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
  (`"{username} is playing"`, click to open the game), with no duplicate
  notifications and an automatic reset when play stops. Shown through the
  service worker so they survive the tab losing focus, with a **Test alert**
  button to confirm the setup. See "Running it 24/7" below for always-on use.
- **Optional sound alert** that plays a short chime on a new game (toggle in the
  toolbar, preference persisted).
- **Performance tabs** for each speed (Bullet, Blitz, Rapid, Classical,
  Correspondence) showing the current rating, recent trend, and deviation.
  Selecting a tab filters the whole dashboard to that speed.
- **Daily stats** from the last ~100 games (NDJSON parsed), filtered to today in
  your local timezone: wins, losses, draws, total, and net Elo. Elo is only
  summed from finished **rated** games that carry a rating delta, otherwise it
  shows **N/A** (no guessing).
- **Automatic play sessions**: games are grouped into sessions by activity, so
  a break longer than the configured gap (default 30 minutes, adjustable to
  15 / 30 / 60 / 120) starts a new session. The current session shows its live
  duration, W/L/D, Elo, start time, and how many sessions you have today. No
  manual start/stop needed.
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
├── server/
│   └── watcher.mjs            # standalone 24/7 poller + push notifier
├── public/
│   ├── favicon.svg
│   ├── manifest.webmanifest   # PWA manifest (installable)
│   └── sw.js                  # service worker (reliable notifications)
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
    │   ├── SessionCard.tsx     # automatic play-session detection
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
    │   ├── stats.ts            # aggregation, today filter
    │   ├── sessions.ts         # group games into play sessions by gaps
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

## Running it 24/7

A web page can only show notifications while a browser is actually running, so
there are two levels of "always on".

### 1. Installable app (no server)

The app ships a web manifest and a service worker, so on desktop or Android you
can **Install** it (Chrome/Edge menu, or "Add to Home screen" on Android). Once
installed and notifications are enabled, it keeps watching and alerting while
the app/browser is running in the background. This needs HTTPS, which your
Vercel deployment already provides. It does **not** fire when the device is off
or the browser is fully closed.

### 2. Standalone watcher (true 24/7)

For alerts even when no browser is open, run the included Node watcher on a
host that stays on (a small VPS, a Raspberry Pi, Railway, Render, Fly.io, etc.).
It polls Lichess and pushes a `"{username} is playing"` notification.

The easiest push channel is [ntfy.sh](https://ntfy.sh): pick any hard-to-guess
topic name, install the ntfy app on your phone and subscribe to that topic, then:

```bash
LICHESS_USER=thibault NTFY_TOPIC=my-secret-topic-9f3a npm run watch
```

Or send to a Discord/Slack/other webhook instead:

```bash
LICHESS_USER=thibault WEBHOOK_URL=https://discord.com/api/webhooks/... npm run watch
```

Environment variables:

| Variable       | Required | Default            | Purpose                                   |
| -------------- | -------- | ------------------ | ----------------------------------------- |
| `LICHESS_USER` | yes      | -                  | Username to watch                         |
| `NTFY_TOPIC`   | no       | -                  | ntfy.sh topic for phone push              |
| `NTFY_SERVER`  | no       | `https://ntfy.sh`  | Self-hosted ntfy base URL                 |
| `WEBHOOK_URL`  | no       | -                  | Generic webhook (Discord/Slack/etc.)      |
| `POLL_MS`      | no       | `8000`             | Poll interval in ms (minimum 5000)        |

With no push channel set it just logs to the console.

### Keeping it running on an always-on PC (recommended)

If you have a computer that is always on, run the watcher there and let ntfy
deliver to your phone. Use [pm2](https://pm2.keymetrics.io) so it runs in the
background and restarts automatically. A ready-made config is included
(`ecosystem.config.cjs`):

```bash
npm install               # once, in the project folder
npm install -g pm2
# edit ecosystem.config.cjs: set LICHESS_USER and NTFY_TOPIC
pm2 start ecosystem.config.cjs
pm2 save                  # remember the process across restarts
pm2 startup               # prints a command to launch pm2 on boot; run it
```

Then `pm2 logs lichess-friend-watcher` to watch it, `pm2 restart` / `pm2 stop`
to control it. On Windows, `pm2 startup` is replaced by `pm2-startup install`
(from the `pm2-windows-startup` package) or a Task Scheduler entry.

## Notes on the Lichess API

- User existence: `GET /api/user/{username}` (404 ⇒ not found).
- Live status: `GET /api/users/status?ids={username}&withGameIds=true`.
- Recent games: `GET /api/games/user/{username}` with
  `Accept: application/x-ndjson` (requested with moves/evals/openings disabled).

No API token is required for these public endpoints.
