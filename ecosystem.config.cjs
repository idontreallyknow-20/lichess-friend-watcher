// pm2 process config for running the 24/7 watcher on an always-on machine.
//
// 1. Edit LICHESS_USER and NTFY_TOPIC below.
// 2. npm install -g pm2
// 3. pm2 start ecosystem.config.cjs
// 4. pm2 save          (remember the process list)
// 5. pm2 startup       (print a command to make pm2 launch on boot; run it)
//
// Notifications go to your phone via the ntfy app subscribed to NTFY_TOPIC.
// Useful commands: `pm2 logs lichess-friend-watcher`, `pm2 restart ...`, `pm2 stop ...`.

module.exports = {
  apps: [
    {
      name: 'lichess-friend-watcher',
      script: 'server/watcher.mjs',
      autorestart: true,
      max_restarts: 50,
      env: {
        // Required: the Lichess username to watch.
        LICHESS_USER: 'REPLACE_WITH_USERNAME',
        // Your ntfy.sh topic (pick something random; subscribe to it in the app).
        NTFY_TOPIC: 'REPLACE_WITH_YOUR_TOPIC',
        // Optional: poll interval in ms (minimum 5000).
        POLL_MS: '8000',
      },
    },
  ],
};
