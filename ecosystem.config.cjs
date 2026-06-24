// pm2 process config. On the VPS: `pm2 start ecosystem.config.cjs`
module.exports = {
  apps: [
    {
      name: 'naruto',
      script: 'src/index.js',
      // Long-running scheduler; restart if it ever crashes, cap restart storms.
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      // Chromium (Mandarake) can hold a few hundred MB; restart if it bloats.
      max_memory_restart: '600M',
      time: true, // timestamp log lines
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
