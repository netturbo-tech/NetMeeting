/**
 * config.js - Carrega e valida variáveis de ambiente
 */
const dotenv = require('dotenv');
const path = require('path');

// Carrega .env do diretório raiz do projeto
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

function parseEmailList(value) {
  return String(value || '')
    .split(/[\s,;]+/)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

const config = {
  azure: {
    clientId: process.env.AZURE_CLIENT_ID || '',
    clientSecret: process.env.AZURE_CLIENT_SECRET || '',
    tenantId: process.env.AZURE_TENANT_ID || '',
  },

  gemini: {
    apiKey: process.env.GOOGLE_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  },

  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    fromName: process.env.EMAIL_FROM_NAME || 'NetMeet Bot',
  },

  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    dashboardUrl: process.env.DASHBOARD_URL || 'http://localhost:3000',
  },

  monitor: {
    checkIntervalMinutes: parseInt(process.env.CHECK_INTERVAL_MINUTES || '5', 10),
    postMeetingWaitMinutes: parseInt(process.env.POST_MEETING_WAIT_MINUTES || '60', 10),
    activeMeetingLookBackMinutes: parseInt(process.env.ACTIVE_MEETING_LOOKBACK_MINUTES || '60', 10),
    endedMeetingLookBackHours: parseInt(process.env.ENDED_MEETING_LOOKBACK_HOURS || '8', 10),
  },

  pilotUsers: parseEmailList(process.env.PILOT_USERS),

  logLevel: process.env.LOG_LEVEL || 'info',
};

/**
 * Valida se as credenciais obrigatórias estão preenchidas
 */
function validateConfig() {
  const errors = [];

  if (!config.azure.clientId) errors.push('AZURE_CLIENT_ID não configurado');
  if (!config.azure.clientSecret || config.azure.clientSecret === 'COLOQUE_SEU_SEGREDO_AQUI') {
    errors.push('AZURE_CLIENT_SECRET não configurado (edite o .env)');
  }
  if (!config.azure.tenantId) errors.push('AZURE_TENANT_ID não configurado');

  if (!config.gemini.apiKey) {
    errors.push('GOOGLE_API_KEY não configurado (edite o .env)');
  }

  if (!config.email.user) errors.push('SMTP_USER não configurado');
  if (!config.email.pass || config.email.pass === 'sua-app-password-aqui') {
    errors.push('SMTP_PASS não configurado (edite o .env)');
  }

  return errors;
}

module.exports = { config, validateConfig };
