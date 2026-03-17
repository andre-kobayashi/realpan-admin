module.exports = {
  apps: [{
    name: 'realpan-admin',
    script: 'npm',
    args: 'start',
    cwd: '/home/frontend/htdocs/realpan.co.jp/realpan-frontend/realpan-admin',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    }
  }]
};
