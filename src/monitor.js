/**
 * monitor.js - Monitor continuo que roda a cada N minutos
 * Rode: npm run monitor
 */
const { config, validateConfig } = require('./config');
const { createLogger } = require('./logger');
const {
  listUsers,
  findUserByEmail,
  getActiveOrUpcomingTeamsMeetings,
  getRecentlyEndedMeetings,
  getMeetingTranscriptForEvent,
} = require('./graph');
const { sendMeetingNotification, sendMeetingSummary } = require('./email');
const { generateSummary } = require('./summarizer');
const {
  wasMeetingProcessed,
  markMeetingProcessed,
  wasMeetingNotified,
  markMeetingNotified,
  wasMeetingOptedIn,
} = require('./store');

const log = createLogger(config.logLevel);

function normalizeEmailList(targetEmails) {
  return [...new Set(
    targetEmails
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  )];
}

async function getUsersToMonitor() {
  if (config.pilotUsers.length > 0) {
    const emails = normalizeEmailList(config.pilotUsers);
    const users = [];

    log.info(`Modo PILOTO no monitor: ${emails.length} usuario(s) configurado(s)`);

    for (const email of emails) {
      const user = await findUserByEmail(email);
      if (!user) {
        log.warn(`Usuario do piloto nao encontrado no Graph: ${email}`);
        continue;
      }
      users.push(user);
    }

    return users;
  }

  log.warn('Monitor sem PILOT_USERS configurado; usando todos os usuarios retornados pelo Graph.');
  return listUsers();
}

function isMeetingOrganizer(user, meeting) {
  const organizerEmail = meeting.organizer?.emailAddress?.address?.toLowerCase();
  return Boolean(user.mail && organizerEmail && organizerEmail === user.mail.toLowerCase());
}

async function notifyUpcomingMeetings(user) {
  const upcoming = await getActiveOrUpcomingTeamsMeetings(
    user.id,
    config.monitor.activeMeetingLookBackMinutes,
    0.5
  );

  if (upcoming.length === 0) {
    log.debug(`  [${user.mail}] Nenhuma reuniao Teams proxima ou em andamento.`);
  }

  for (const meeting of upcoming) {
    if (wasMeetingNotified(user.id, meeting.id)) {
      log.debug(`  [${user.mail}] Notificacao ja enviada para "${meeting.subject}"; pulando.`);
      continue;
    }

    const started = new Date(meeting.start.dateTime + 'Z') <= new Date();
    const status = started ? 'em andamento' : 'proxima';
    log.info(`Notificando ${user.displayName} sobre reuniao ${status}: ${meeting.subject}`);
    try {
      await sendMeetingNotification(user.mail, meeting, user);
      markMeetingNotified(user.id, meeting.id, {
        subject: meeting.subject,
        recipient: user.mail,
        meetingStart: meeting.start.dateTime,
      });
    } catch (err) {
      log.error(`Erro ao notificar: ${err.message}`);
    }
  }
}

async function processEndedMeetings(user) {
  const ended = await getRecentlyEndedMeetings(user.id, config.monitor.endedMeetingLookBackHours);

  if (ended.length === 0) {
    log.debug(`  [${user.mail}] Nenhuma reuniao Teams encerrada na janela de ${config.monitor.endedMeetingLookBackHours}h.`);
  } else {
    log.info(`  [${user.mail}] ${ended.length} reuniao(oes) encerrada(s) para verificar.`);
  }

  for (const meeting of ended) {
    const isOrganizer = isMeetingOrganizer(user, meeting);
    const optedIn = wasMeetingOptedIn(user.id, meeting.id);

    if (!isOrganizer && !optedIn) {
      log.info(`  [${user.mail}] "${meeting.subject}": participante sem opt-in. Para receber o resumo, clique no link do email preventivo.`);
      continue;
    }

    if (wasMeetingProcessed(user.id, meeting.id)) {
      log.debug(`  [${user.mail}] "${meeting.subject}": resumo ja enviado anteriormente; pulando.`);
      continue;
    }

    const transcript = await getMeetingTranscriptForEvent(user, meeting);
    const meetingId = transcript.meetingId || meeting.id;

    if (wasMeetingProcessed(user.id, meetingId)) {
      log.info(`Resumo ja processado para ${meeting.subject}; pulando.`);
      continue;
    }

    if (transcript.found && transcript.content) {
      try {
        const summary = await generateSummary(transcript.content, meeting.subject);
        const meetingDate = new Date(meeting.start.dateTime + 'Z').toLocaleString('pt-BR', {
          timeZone: 'America/Sao_Paulo',
        });

        await sendMeetingSummary(
          user.mail,
          meeting.subject,
          meetingDate,
          meeting.organizer?.emailAddress?.name || user.displayName,
          summary
        );

        markMeetingProcessed(user.id, meetingId, {
          subject: meeting.subject,
          recipient: user.mail,
          meetingStart: meeting.start.dateTime,
          resolvedBy: transcript.resolvedBy,
          transcriptUser: transcript.transcriptUser?.mail || transcript.transcriptUser?.userPrincipalName,
        });
        if (meetingId !== meeting.id) {
          markMeetingProcessed(user.id, meeting.id, {
            subject: meeting.subject,
            recipient: user.mail,
            meetingStart: meeting.start.dateTime,
            transcriptMeetingId: meetingId,
            resolvedBy: transcript.resolvedBy,
            transcriptUser: transcript.transcriptUser?.mail || transcript.transcriptUser?.userPrincipalName,
          });
        }
      } catch (err) {
        log.error(`Erro ao processar resumo: ${err.message}`);
      }
      continue;
    }

    const pendingMessage = `Transcricao ainda nao disponivel para ${meeting.subject}; vou tentar de novo nas proximas checagens.`;
    if (isOrganizer) {
      log.warn(pendingMessage);
    } else {
      log.info(pendingMessage);
    }
  }
}

async function checkMeetings() {
  log.info('Checando reunioes...');

  const users = await getUsersToMonitor();

  for (const user of users) {
    if (!user.mail) continue;

    await notifyUpcomingMeetings(user);
    await processEndedMeetings(user);
  }
}

async function startMonitor() {
  console.log('\n' + '='.repeat(60));
  console.log('  NetMeet Bot - Monitor Continuo');
  console.log(`  Intervalo: a cada ${config.monitor.checkIntervalMinutes} minutos`);
  console.log('  Para parar: Ctrl+C');
  console.log('='.repeat(60) + '\n');

  const errors = validateConfig();
  if (errors.length > 0) {
    console.log('ERROS:');
    errors.forEach((e) => console.log(`   -> ${e}`));
    process.exit(1);
  }

  await checkMeetings();

  const intervalMs = config.monitor.checkIntervalMinutes * 60 * 1000;
  setInterval(checkMeetings, intervalMs);
  log.info(`Proxima checagem em ${config.monitor.checkIntervalMinutes} minutos...`);
}

startMonitor().catch((err) => {
  log.error('Erro fatal no monitor:', err.message);
  process.exit(1);
});
