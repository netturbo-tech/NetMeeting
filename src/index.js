/**
 * index.js - Script principal do NetMeet Bot
 * Processa reuniões recentes: busca transcrição → gera resumo → envia email
 */
const { config, validateConfig } = require('./config');
const { createLogger } = require('./logger');
const {
  listUsers,
  findUserByEmail,
  getRecentlyEndedMeetings,
  getMeetingTranscriptForEvent,
} = require('./graph');
const { sendMeetingSummary } = require('./email');
const { generateSummary } = require('./summarizer');
const { getPostMeetingWaitStatus, formatDateTimeBr } = require('./meeting-time');
const {
  wasMeetingProcessed,
  markMeetingProcessed,
  wasMeetingOptedIn,
  markMeetingFailed,
  getFailureCooldownStatus,
} = require('./store');

const log = createLogger(config.logLevel);

function getSummaryRetryAfter() {
  const minutes = Math.max(15, config.monitor.summaryFailureCooldownMinutes || 240);
  return new Date(Date.now() + minutes * 60 * 1000);
}

function shouldCooldownSummaryFailure(error) {
  return Boolean(
    error?.isQuotaError ||
    error?.status === 429 ||
    /quota|free_tier|rate-limit|rate limit|status code 429/i.test(error?.message || '')
  );
}

function normalizeEmailList(targetEmails) {
  return [...new Set(
    targetEmails
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  )];
}

async function getUsersToProcess(targetEmails) {
  let emails = normalizeEmailList(targetEmails);

  if (emails.length === 0 && config.pilotUsers.length > 0) {
    emails = normalizeEmailList(config.pilotUsers);
    log.info(`Modo PILOTO ativado pelo .env: ${emails.length} usuario(s) configurado(s)`);
  }

  if (emails.length > 0) {
    const users = [];

    for (const email of emails) {
      const user = await findUserByEmail(email);
      if (!user) {
        log.error(`Usuario nao encontrado: ${email}`);
        continue;
        continue;
      }
      users.push(user);
    }

    return users;
  }

  log.warn('Modo TODOS OS USUARIOS ativado porque nenhum email foi informado.');
  log.warn('Para evitar isso, configure PILOT_USERS no .env.');
  log.warn('Para teste controlado, rode: node src/index.js nome@empresa.com pessoa2@empresa.com');
  return listUsers();
}

function isMeetingOrganizer(user, meeting) {
  const organizerEmail = meeting.organizer?.emailAddress?.address?.toLowerCase();
  return Boolean(user.mail && organizerEmail && organizerEmail === user.mail.toLowerCase());
}

async function processMeetings(targetEmails) {
  console.log('\n' + '='.repeat(60));
  console.log('  🤖 NetMeet Bot - Processador de Reuniões');
  console.log('  ⏰ ' + new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }));
  console.log('='.repeat(60) + '\n');

  // Validar configuração
  const errors = validateConfig();
  if (errors.length > 0) {
    console.log('❌ ERROS DE CONFIGURAÇÃO:');
    errors.forEach((e) => console.log(`   → ${e}`));
    console.log('\n📝 Edite o arquivo .env com suas credenciais e tente novamente.');
    process.exit(1);
  }

  log.success('Configuração validada!');

  // 1. Definir usuarios do processamento
  const users = await getUsersToProcess(targetEmails);
  if (users.length === 0) {
    log.warn('Nenhum usuario para processar. Verifique email informado ou permissoes do app no Entra ID.');
    return;
  }
  log.info(`${users.length} usuario(s) na fila de processamento`);

  // 2. Para cada usuário, buscar reuniões recentes
  let totalProcessed = 0;

  for (const user of users) {
    if (!user.mail) continue;

    log.info(`\n📅 Verificando: ${user.displayName} (${user.mail})`);

    const meetings = await getRecentlyEndedMeetings(user.id, 3);
    log.info(`  📊 ${meetings.length} reuniões Teams recentes`);

    for (const meeting of meetings) {
      log.info(`  🎯 ${meeting.subject}`);
      log.debug(`     Início: ${meeting.start.dateTime}`);

      const isOrganizer = isMeetingOrganizer(user, meeting);
      const optedIn = wasMeetingOptedIn(user.id, meeting.id);

      if (!isOrganizer && !optedIn) {
        log.info('  Usuario nao e organizador e nao fez opt-in para esta reuniao; pulando envio.');
        continue;
      }

      if (wasMeetingProcessed(user.id, meeting.id)) {
        log.info('  Reuniao ja processada anteriormente; pulando para evitar email duplicado.');
        continue;
      }

      const cooldown = getFailureCooldownStatus(user.id, meeting.id);
      if (cooldown.active) {
        log.info(`  Resumo em cooldown por falha de IA; nova tentativa em ${cooldown.remainingMinutes} min.`);
        continue;
      }

      const waitStatus = getPostMeetingWaitStatus(meeting, config.monitor.postMeetingWaitMinutes);
      if (!waitStatus.ready) {
        log.info(`  Aguardando ${waitStatus.remainingMinutes} min antes de buscar transcricao; liberado a partir de ${formatDateTimeBr(waitStatus.readyAt)}.`);
        continue;
      }

      const transcript = await getMeetingTranscriptForEvent(user, meeting);
      const transcriptMeetingId = transcript.meetingId || meeting.id;

      // 3. Tentar pegar transcrição

      if (transcript.found && transcript.content) {
        // 4. Gerar resumo com GPT-4
        let summary;
        try {
          summary = await generateSummary(transcript.content, meeting.subject);
        } catch (err) {
          if (shouldCooldownSummaryFailure(err)) {
            const retryAfter = getSummaryRetryAfter();
            markMeetingFailed(user.id, meeting.id, {
              subject: meeting.subject,
              recipient: user.mail,
              meetingStart: meeting.start.dateTime,
              provider: err.provider || 'gemini',
              reason: 'summary_quota_or_rate_limit',
              error: err.message,
              retryAfter: retryAfter.toISOString(),
            });
            log.warn(`  Gemini sem cota/limitado. Vou tentar novamente apos ${formatDateTimeBr(retryAfter)}.`);
            continue;
          }
          throw err;
        }

        // 5. Enviar email
        const meetingDate = new Date(meeting.start.dateTime + 'Z').toLocaleString('pt-BR', {
          timeZone: 'America/Sao_Paulo',
        });
        const organizerName = meeting.organizer?.emailAddress?.name || user.displayName;

        await sendMeetingSummary(user.mail, meeting.subject, meetingDate, organizerName, summary);
        markMeetingProcessed(user.id, meeting.id, {
          subject: meeting.subject,
          recipient: user.mail,
          meetingStart: meeting.start.dateTime,
          transcriptMeetingId,
          transcriptId: transcript.transcriptId,
          transcriptCreatedDateTime: transcript.transcriptCreatedDateTime,
          resolvedBy: transcript.resolvedBy,
          transcriptUser: transcript.transcriptUser?.mail || transcript.transcriptUser?.userPrincipalName,
        });
        totalProcessed++;
        log.success(`  Resumo enviado para ${user.mail}!`);
      } else {
        log.warn('  ⏳ Transcrição não disponível (reunião não gravada ou ainda processando)');
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`  🏁 Processamento concluído! ${totalProcessed} resumos enviados.`);
  console.log('='.repeat(60) + '\n');
}

const targetEmails = process.argv.slice(2);

processMeetings(targetEmails).catch((err) => {
  log.error('Erro fatal:', err.message);
  process.exit(1);
});
