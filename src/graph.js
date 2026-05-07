/**
 * graph.js - Funções para interagir com a Microsoft Graph API
 * Lista usuários, busca reuniões, tenta obter transcrições
 */
const axios = require('axios');
const { getGraphToken } = require('./auth');
const { createLogger } = require('./logger');
const { config } = require('./config');
const { parseGraphDateTime } = require('./meeting-time');

const log = createLogger(config.logLevel);

/**
 * Chamada genérica à Graph API
 * @param {string} endpoint - Endpoint relativo (ex: /users)
 * @param {string} version - v1.0 ou beta
 * @returns {Promise<{success: boolean, data?: any, status?: number, error?: string}>}
 */
async function callGraph(endpoint, version = 'v1.0') {
  const token = await getGraphToken();
  const url = `https://graph.microsoft.com/${version}${endpoint}`;

  try {
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status,
      error: error.response?.data?.error?.message || error.message,
    };
  }
}

/**
 * Lista todos os usuários do tenant
 * @returns {Promise<Array>} Lista de usuários
 */
async function listUsers() {
  log.info('Buscando usuários do tenant...');
  const result = await callGraph(
    '/users?$select=id,displayName,mail,userPrincipalName&$top=50'
  );

  if (!result.success) {
    log.error('Erro ao buscar usuários:', result.error);
    return [];
  }

  const users = result.data.value || [];
  log.info(`${users.length} usuários encontrados`);
  return users;
}

function escapeODataString(value) {
  return String(value).replace(/'/g, "''");
}

/**
 * Busca um unico usuario por email ou userPrincipalName.
 * Evita varrer o tenant inteiro quando o bot for acionado para uma pessoa especifica.
 * @param {string} email - Email ou UPN do usuario
 * @returns {Promise<object|null>} Usuario encontrado ou null
 */
async function findUserByEmail(email) {
  const safeEmail = escapeODataString(email.trim().toLowerCase());
  const filter = `mail eq '${safeEmail}' or userPrincipalName eq '${safeEmail}'`;

  log.info(`Buscando usuario especifico: ${email}`);
  const result = await callGraph(
    `/users?$filter=${encodeURIComponent(filter)}&$select=id,displayName,mail,userPrincipalName&$top=1`
  );

  if (!result.success) {
    log.error('Erro ao buscar usuario especifico:', result.error);
    return null;
  }

  return result.data.value?.[0] || null;
}

/**
 * Busca eventos de calendário (reuniões) de um usuário
 * @param {string} userId - ID do usuário
 * @param {Date} startDate - Início do intervalo
 * @param {Date} endDate - Fim do intervalo
 * @returns {Promise<Array>} Lista de eventos
 */
async function getUserEvents(userId, startDate, endDate) {
  const select = 'subject,start,end,onlineMeeting,attendees,organizer,bodyPreview';
  const startParam = encodeURIComponent(startDate.toISOString());
  const endParam = encodeURIComponent(endDate.toISOString());

  // calendarView expande reunioes recorrentes em ocorrencias individuais;
  // /calendar/events com $filter nao faz isso.
  const result = await callGraph(
    `/users/${userId}/calendarView?startDateTime=${startParam}&endDateTime=${endParam}&$select=${select}&$orderby=start/dateTime&$top=50`
  );

  if (!result.success) {
    log.debug(`  Erro no calendário de ${userId}:`, result.error);
    return [];
  }

  return result.data.value || [];
}

/**
 * Busca reuniões Teams nas próximas N horas
 * @param {string} userId - ID do usuário
 * @param {number} hoursAhead - Horas à frente para buscar
 * @returns {Promise<Array>} Reuniões Teams filtradas
 */
async function getUpcomingTeamsMeetings(userId, hoursAhead = 2) {
  const now = new Date();
  const future = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

  const events = await getUserEvents(userId, now, future);
  return events.filter((e) => e.onlineMeeting?.joinUrl);
}

/**
 * Busca reunioes Teams em andamento ou proximas.
 * Isso cobre casos em que o monitor iniciou depois que a reuniao ja comecou.
 * @param {string} userId - ID do usuario
 * @param {number} lookBackMinutes - Minutos para tras para capturar reunioes em andamento
 * @param {number} hoursAhead - Horas a frente para buscar reunioes futuras
 * @returns {Promise<Array>} Reunioes Teams ativas ou proximas
 */
async function getActiveOrUpcomingTeamsMeetings(userId, lookBackMinutes = 60, hoursAhead = 0.5) {
  const now = new Date();
  const past = new Date(now.getTime() - lookBackMinutes * 60 * 1000);
  const future = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

  const events = await getUserEvents(userId, past, future);

  if (events.length > 0) {
    const semJoinUrl = events.filter((e) => !e.onlineMeeting?.joinUrl);
    if (semJoinUrl.length > 0) {
      log.warn(`  ${semJoinUrl.length} evento(s) ignorado(s) por falta de joinUrl do Teams: ${semJoinUrl.map((e) => `"${e.subject}"`).join(', ')}`);
    }
  }

  return events.filter((e) => {
    if (!e.onlineMeeting?.joinUrl) return false;
    const endTime = new Date(e.end.dateTime + 'Z');
    return endTime >= now;
  });
}

/**
 * Busca reuniões Teams que terminaram nas últimas N horas
 * @param {string} userId - ID do usuário
 * @param {number} hoursBack - Horas para trás
 * @returns {Promise<Array>} Reuniões finalizadas
 */
async function getRecentlyEndedMeetings(userId, hoursBack = 8) {
  const now = new Date();
  const past = new Date(now.getTime() - hoursBack * 60 * 60 * 1000);

  const events = await getUserEvents(userId, past, now);

  if (events.length > 0) {
    const semJoinUrl = events.filter((e) => !e.onlineMeeting?.joinUrl);
    if (semJoinUrl.length > 0) {
      log.warn(`  ${semJoinUrl.length} evento(s) encerrado(s) ignorado(s) por falta de joinUrl: ${semJoinUrl.map((e) => `"${e.subject}"`).join(', ')}`);
    }
  }

  return events.filter((e) => {
    if (!e.onlineMeeting?.joinUrl) return false;
    const endTime = new Date(e.end.dateTime + 'Z');
    return endTime <= now;
  });
}

/**
 * Busca o registro onlineMeeting real a partir do joinUrl do evento.
 * O ID do evento de calendario nem sempre e aceito pelo endpoint de transcricoes.
 * @param {string} userId - ID do usuario
 * @param {string} joinUrl - Link da reuniao Teams
 * @returns {Promise<object|null>} onlineMeeting encontrado ou null
 */
async function findOnlineMeetingByJoinUrl(userId, joinUrl, options = {}) {
  if (!joinUrl) return null;

  const filter = `joinWebUrl eq '${escapeODataString(joinUrl)}'`;
  const result = await callGraph(
    `/users/${userId}/onlineMeetings?$filter=${encodeURIComponent(filter)}`,
    'v1.0'
  );

  if (!result.success) {
    log.warn(`  Nao consegui resolver onlineMeeting pelo joinUrl (${result.status || 'sem status'}): ${result.error}`);
    return null;
  }

  const onlineMeeting = result.data.value?.[0] || null;
  if (!onlineMeeting && options.warnOnMissing !== false) {
    log.warn('  Nenhum onlineMeeting encontrado pelo joinUrl; usando fallback do evento.');
  }

  return onlineMeeting;
}

function sameUser(left, right) {
  const leftValues = [left?.id, left?.mail, left?.userPrincipalName]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());
  const rightValues = [right?.id, right?.mail, right?.userPrincipalName]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

  return leftValues.some((value) => rightValues.includes(value));
}

async function getTranscriptCandidateUsers(calendarUser, meeting) {
  const candidates = [];
  const addCandidate = (user, role) => {
    if (!user?.id) return;
    if (candidates.some((candidate) => sameUser(candidate.user, user))) return;
    candidates.push({ user, role });
  };

  const organizerEmail = meeting.organizer?.emailAddress?.address?.trim().toLowerCase();

  if (organizerEmail) {
    const calendarUserEmails = [calendarUser.mail, calendarUser.userPrincipalName]
      .filter(Boolean)
      .map((email) => email.toLowerCase());

    if (calendarUserEmails.includes(organizerEmail)) {
      addCandidate(calendarUser, 'organizador');
    } else {
      const organizerUser = await findUserByEmail(organizerEmail);
      if (organizerUser) {
        addCandidate(organizerUser, 'organizador');
      } else {
        log.warn(`  Organizador nao encontrado no Graph: ${organizerEmail}`);
      }
    }
  }

  addCandidate(calendarUser, 'usuario do calendario');
  return candidates;
}

function sortTranscriptsByCreatedDesc(transcripts) {
  return [...transcripts].sort((a, b) => {
    const aDate = parseGraphDateTime(a.createdDateTime) || new Date(0);
    const bDate = parseGraphDateTime(b.createdDateTime) || new Date(0);
    return bDate - aDate;
  });
}

function selectTranscriptForOccurrence(transcripts, meetingStartTime = null) {
  const sorted = sortTranscriptsByCreatedDesc(transcripts);
  const startDate = parseGraphDateTime(meetingStartTime);

  if (!startDate) {
    return sorted[0] || null;
  }

  return sorted.find((transcript) => {
    const createdAt = parseGraphDateTime(transcript.createdDateTime);
    return createdAt && createdAt >= startDate;
  }) || null;
}

/**
 * Tenta obter transcrição de uma reunião (API Beta)
 * @param {string} userId - ID do usuário
 * @param {string} meetingId - ID da reunião online
 * @returns {Promise<{found: boolean, content?: string}>}
 */
async function getMeetingTranscript(userId, meetingId, meetingStartTime = null) {
  // Listar transcrições disponíveis
  const transcriptRes = await callGraph(
    `/users/${userId}/onlineMeetings/${meetingId}/transcripts`,
    'beta'
  );

  if (!transcriptRes.success) {
    log.warn(`  Erro ao listar transcricoes (${transcriptRes.status || 'sem status'}): ${transcriptRes.error}`);
    return { found: false };
  }

  if (!transcriptRes.data.value?.length) {
    log.warn('  Graph respondeu OK, mas sem transcricoes disponiveis para esta reuniao.');
    return { found: false };
  }

  const allTranscripts = transcriptRes.data.value;
  log.info(`  ${allTranscripts.length} transcricao(oes) encontrada(s) para este onlineMeeting.`);

  const startDate = parseGraphDateTime(meetingStartTime);
  const transcript = selectTranscriptForOccurrence(allTranscripts, meetingStartTime);

  if (startDate && !transcript) {
    const allDates = allTranscripts
      .map((t) => t.createdDateTime)
      .filter(Boolean)
      .join(', ');
    log.warn(
      `  Nenhuma transcricao encontrada apos ${startDate.toISOString()} — nenhuma das ${allTranscripts.length} transcricao(oes) existentes pertence a esta ocorrencia.` +
      (allDates ? ` Datas disponiveis: ${allDates}` : '')
    );
    log.warn('  Protecao ativa: recusando usar transcricao de ocorrencia anterior para nao enviar resumo errado.');
    return { found: false, reason: 'NO_TRANSCRIPT_FOR_OCCURRENCE' };
  }

  if (!transcript) {
    log.warn('  Nao encontrei transcricao valida para esta reuniao.');
    return { found: false };
  }

  if (startDate) {
    log.info(`  Transcricao correta encontrada: criada em ${transcript.createdDateTime} (ocorrencia iniciada em ${startDate.toISOString()}) ✓`);
  } else {
    log.info(`  Usando transcricao mais recente: ${transcript.createdDateTime || 'data desconhecida'}.`);
  }

  log.success('Transcrição selecionada! Baixando conteúdo...');

  // Baixar conteúdo
  const contentRes = await callGraph(
    `/users/${userId}/onlineMeetings/${meetingId}/transcripts/${transcript.id}/content?$format=text/vtt`,
    'beta'
  );

  if (!contentRes.success) {
    log.warn(`Transcrição listada mas não conseguiu baixar conteúdo (${contentRes.status || 'sem status'}):`, contentRes.error);
    return { found: false };
  }

  return {
    found: true,
    content: contentRes.data,
    transcriptId: transcript.id,
    transcriptCreatedDateTime: transcript.createdDateTime,
  };
}

async function getMeetingTranscriptForEvent(calendarUser, meeting) {
  const joinUrl = meeting.onlineMeeting?.joinUrl;
  // Usa somente joinMeetingId quando disponivel — meeting.id e ID de evento de calendario
  // e rejeitado pela Graph API com "Meeting Id is corrupted" / 400.
  const fallbackMeetingId = meeting.onlineMeeting?.joinMeetingIdSettings?.joinMeetingId || null;
  const meetingStartTime = meeting.start?.dateTime;

  // Para reunioes recorrentes (ex: Daily TI), o mesmo Teams room acumula transcricoes
  // de todas as ocorrencias anteriores. Sem o horario de inicio nao e possivel
  // garantir que a transcricao encontrada pertence a ocorrencia correta do dia.
  if (!meetingStartTime) {
    log.warn(`  "${meeting.subject}": sem horario de inicio definido. Nao e seguro buscar transcricao sem filtro de data — risco de retornar ocorrencia anterior. Pulando.`);
    return { found: false, reason: 'NO_START_TIME' };
  }

  const occurrenceDate = new Date(meetingStartTime + 'Z').toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
  log.info(`  "${meeting.subject}": buscando transcricao da ocorrencia de ${occurrenceDate} (inicio UTC: ${meetingStartTime})`);

  if (!joinUrl) {
    log.warn('  Evento sem joinUrl do Teams; usando fallback do evento.');
    const transcript = await getMeetingTranscript(calendarUser.id, fallbackMeetingId, meetingStartTime);
    return {
      ...transcript,
      transcriptUser: calendarUser,
      meetingId: fallbackMeetingId,
      resolvedBy: 'fallback',
    };
  }

  const candidates = await getTranscriptCandidateUsers(calendarUser, meeting);

  for (const candidate of candidates) {
    const label = `${candidate.role} (${candidate.user.mail || candidate.user.userPrincipalName || candidate.user.id})`;
    log.info(`  Tentando resolver onlineMeeting pelo ${label}`);

    const onlineMeeting = await findOnlineMeetingByJoinUrl(candidate.user.id, joinUrl, {
      warnOnMissing: false,
    });

    if (!onlineMeeting?.id) {
      log.info(`  OnlineMeeting nao encontrada pelo ${candidate.role}; tentando proximo contexto.`);
      continue;
    }

    log.info(`  OnlineMeeting resolvida pelo ${candidate.role}`);
    // Passa o horário de início da reunião para filtrar transcrições de ocorrências anteriores
    // (importante para reuniões recorrentes como Daily TI que reutilizam a mesma sala Teams)
    const transcript = await getMeetingTranscript(candidate.user.id, onlineMeeting.id, meetingStartTime);

    if (transcript.found && transcript.content) {
      return {
        ...transcript,
        transcriptUser: candidate.user,
        meetingId: onlineMeeting.id,
        resolvedBy: candidate.role,
      };
    }
  }

  if (!fallbackMeetingId) {
    log.warn('  Nao encontrei transcricao via organizador/participante e nenhum meetingId alternativo disponivel.');
    return { found: false, reason: 'NO_VALID_MEETING_ID' };
  }

  log.warn('  Nao encontrei transcricao via organizador/participante; tentando fallback com joinMeetingId.');
  const transcript = await getMeetingTranscript(calendarUser.id, fallbackMeetingId, meetingStartTime);
  return {
    ...transcript,
    transcriptUser: calendarUser,
    meetingId: fallbackMeetingId,
    resolvedBy: 'fallback',
  };
}

module.exports = {
  callGraph,
  listUsers,
  findUserByEmail,
  getUserEvents,
  getUpcomingTeamsMeetings,
  getActiveOrUpcomingTeamsMeetings,
  getRecentlyEndedMeetings,
  findOnlineMeetingByJoinUrl,
  selectTranscriptForOccurrence,
  getMeetingTranscript,
  getMeetingTranscriptForEvent,
};
