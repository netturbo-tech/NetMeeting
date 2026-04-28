/**
 * ecosystem.config.js - Configuração do PM2 para o NetMeet Bot
 *
 * Comandos principais:
 *   pm2 start ecosystem.config.js   → inicia monitor + dashboard
 *   pm2 status                       → ver status dos processos
 *   pm2 logs                         → ver logs em tempo real
 *   pm2 restart all                  → reiniciar tudo
 *   pm2 stop all                     → parar tudo
 */

module.exports = {
  apps: [
    {
      name: 'netmeet-monitor',
      script: 'src/monitor.js',
      cwd: __dirname,
      watch: false,
      autorestart: true,
      restart_delay: 10000,       // aguarda 10s antes de reiniciar após crash
      max_restarts: 10,
      log_file: 'logs/monitor.log',
      error_file: 'logs/monitor-error.log',
      time: true,                 // adiciona timestamp nos logs
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'netmeet-dashboard',
      script: 'src/dashboard.js',
      cwd: __dirname,
      watch: false,
      autorestart: true,
      restart_delay: 5000,
      max_restarts: 10,
      log_file: 'logs/dashboard.log',
      error_file: 'logs/dashboard-error.log',
      time: true,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
