module.exports = {
  apps: [
    {
      name: 'mbr-fashion-api',
      cwd: './backend',
      script: 'server.js',
      exec_mode: 'cluster',
      instances: 'max',
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
      },
      watch: false,
      time: true,
    },
  ],
};
