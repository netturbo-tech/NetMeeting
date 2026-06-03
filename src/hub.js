/**
 * hub.js - Envia resumo de reunião para a aba NetMeet do Hub NetTurbo.
 * Chamado após sendMeetingSummary() ter sucesso.
 * Se HUB_API_URL ou HUB_API_KEY não estiverem configurados, apenas loga e segue.
 */
const axios = require('axios');
const { config } = require('./config');
const { createLogger } = require('./logger');

const log = createLogger(config.logLevel);

/**
 * Envia o resumo ao Hub.
 * @returns {Promise<{ok: boolean, skipped: boolean, status?: number|string}>}
 *   - { skipped: true }  -> integração desligada (sem URL/key); não há o que reenviar.
 *   - { ok: true }       -> salvo no Hub com sucesso.
 *   - { ok: false }      -> falhou (deve ser reenfileirado para retry).
 */
async function sendToHub({ externalId, title, meetingDate, organizerEmail, organizerName, meetingLink, summary, recipientEmail, provider }) {
  if (!config.hub.apiUrl || !config.hub.apiKey) {
    log.debug('HUB_API_URL ou HUB_API_KEY nao configurados; pulando envio ao Hub.');
    return { ok: false, skipped: true };
  }

  const url = `${config.hub.apiUrl}/api/netmeet/meetings/ingest`;

  try {
    await axios.post(url, {
      externalId,
      title,
      meetingDate,
      organizerEmail,
      organizerName,
      meetingLink: meetingLink || '',
      summary,
      recipientEmail,
      provider: provider || 'teams-bot',
    }, {
      headers: {
        'Authorization': `Bearer ${config.hub.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    log.success(`  Resumo salvo no Hub para ${recipientEmail}`);
    return { ok: true, skipped: false };
  } catch (err) {
    const status = err.response?.status;
    const msg = err.response?.data?.error || err.message;
    log.warn(`  Hub nao disponivel (${status || 'timeout'}): ${msg}. Email ja foi enviado; vou reenviar ao Hub na proxima checagem.`);
    return { ok: false, skipped: false, status: status || 'timeout' };
  }
}

module.exports = { sendToHub };
