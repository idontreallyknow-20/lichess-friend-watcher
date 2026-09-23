# Lichess Friend Watcher

A spectator dashboard for any Lichess player. Type a username to see if they're
online or mid-game, spectate with one click, get an alert when they start a
game, and follow their session record, tilt meter, rating trend and openings.

Live at **[lichess-friend-watcher.vercel.app](https://lichess-friend-watcher.vercel.app)**.

Spectating only: the app never fetches moves or evaluations and gives no chess
advice. "Spectate" hands you off to lichess.org for the board.

## Run it

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # type-check + production build into dist/
npm run preview   # serve the production build
```

Built with React, TypeScript and Vite. Deployed on Vercel from the production
branch. It only uses public Lichess endpoints, so no API token or env vars are
needed for the site.

## 24/7 alerts (optional)

Browser alerts only fire while the tab or installed app is open. For alerts
when nothing is open, run the standalone watcher on an always-on machine:

```bash
LICHESS_USER=someone NTFY_TOPIC=your-random-topic npm run watch
```

It pushes to your phone through the [ntfy](https://ntfy.sh) app (subscribe to
the same topic), or to a Discord/Slack webhook via `WEBHOOK_URL`. Other options:
`NTFY_SERVER` (self-hosted ntfy) and `POLL_MS` (default 8000, minimum 5000).
Run `npm run watch -- --test` to send one confirmation push on start. To keep
it running with pm2, fill in `ecosystem.config.cjs` and run
`pm2 start ecosystem.config.cjs`.

## Credit

Built by [Joseph Leung](https://josephleung-site.vercel.app). Not affiliated
with lichess.org.
