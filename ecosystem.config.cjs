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
      user:"deployman",
      key: '../deployman_private.key',
      host: "josh.earth",
      ref: "origin/main",
      repo: 'https://github.com/pixelandcircuit/lolcat-maker.git',
      path: "/projects/lolcat-maker2",
      'post-deploy':
        'npm ci && npm run build',
    },
  },
};
