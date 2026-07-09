module.exports = {
  apps: [
    {
      name: 'meem-makr',
      script: 'node_modules/.bin/serve',
      args: 'dist --listen 4001 --no-clipboard',
      interpreter: 'none',
      env: { NODE_ENV: 'production' },
    },
  ],

  deploy: {
    production: {
      user: 'deploy',
      host: 'josh.earth',
      ref: 'origin/main',
      repo: 'https://github.com/pixelandcircuit/lolcat-maker.git',
      path: '/var/www/meem-makr',
      'post-deploy':
        'npm ci && npm run build && pm2 reload ecosystem.config.cjs --env production',
    },
  },
};
