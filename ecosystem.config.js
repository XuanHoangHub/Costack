module.exports = {
  apps: [
    {
      name: 'apexa-os',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      instances: 'max',
      exec_mode: 'cluster',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      max_memory_restart: '1G',
      listen_timeout: 10000,
      kill_timeout: 5000,
    },
  ],
};
