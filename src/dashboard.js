/**
 * dashboard.js - Endpoint simples para opt-in de resumo.
 * Rode: npm run dashboard
 */
const express = require('express');
const { config, validateConfig } = require('./config');
const { createLogger } = require('./logger');
const { markMeetingOptIn } = require('./store');

const log = createLogger(config.logLevel);
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NetMeet Bot</title>
  <style>
    body { font-family: Segoe UI, Arial, sans-serif; background: #f8fafc; color: #1f2937; margin: 0; }
    main { max-width: 760px; margin: 64px auto; padding: 0 24px; }
    section { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 28px; }
    h1 { margin: 0 0 12px; color: #0f172a; }
    p { line-height: 1.6; color: #475569; }
  </style>
</head>
<body>
  <main>
    <section>
      <h1>NetMeet Bot</h1>
      <p>Dashboard simples para confirmar interesse em receber resumos de reunioes.</p>
      <p>Use o link recebido por email para ativar o recebimento de uma reuniao especifica.</p>
    </section>
  </main>
</body>
</html>`);
});

app.get('/activate', (req, res) => {
  const { meetingId, userId, email, subject } = req.query;

  if (!meetingId || !userId || !email) {
    res.status(400).send('Link invalido: meetingId, userId e email sao obrigatorios.');
    return;
  }

  markMeetingOptIn(userId, meetingId, {
    subject: subject || 'Reuniao sem titulo',
    recipient: String(email).toLowerCase(),
  });

  log.success(`Opt-in registrado: ${email} -> ${subject || meetingId}`);

  res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resumo confirmado</title>
  <style>
    body { font-family: Segoe UI, Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f8fafc; color: #1f2937; }
    .box { width: min(560px, calc(100% - 32px)); background: white; padding: 32px; border-radius: 8px; border: 1px solid #e5e7eb; text-align: center; }
    h1 { margin: 0 0 12px; color: #0f172a; }
    p { line-height: 1.6; color: #475569; }
  </style>
</head>
<body>
  <div class="box">
    <h1>Resumo confirmado</h1>
    <p>Voce optou por receber o resumo da reuniao <strong>${escapeHtml(subject || '')}</strong>.</p>
    <p>Depois que a reuniao terminar e a transcricao estiver disponivel, o NetMeet enviara o resumo por email.</p>
  </div>
</body>
</html>`);
});

const errors = validateConfig();
if (errors.length > 0) {
  console.log('Configuracao incompleta, mas dashboard inicia mesmo assim.');
}

app.listen(config.server.port, () => {
  console.log(`\nDashboard rodando em: http://localhost:${config.server.port}`);
  console.log('Para parar: Ctrl+C\n');
});
