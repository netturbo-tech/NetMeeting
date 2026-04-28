/**
 * diagnose.js - Diagnóstico do dia: mostra todos os eventos do calendário,
 * o que foi filtrado e por quê, e tenta buscar transcrições das reuniões encerradas.
 *
 * Uso: node src/diagnose.js [email]
 * Ex:  node src/diagnose.js alan.moreira@netturbo.com.br
 */

const { config, validateConfig } = require('./config');
const { findUserByEmail, getUserEvents, findOnlineMeetingByJoinUrl, getMeetingTranscript } = require('./graph');

const targetEmail = process.argv[2] || config.pilotUsers[0];

function hr(char = '─') { return char.repeat(60); }

function fmtTime(isoStr) {
  if (!isoStr) return '—';
  const s = isoStr.endsWith('Z') ? isoStr : isoStr + 'Z';
  return new Date(s).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

async function run() {
  console.log('\n' + hr('='));
  console.log('  NetMeet Bot — Diagnóstico do Dia');
  console.log(hr('=') + '\n');

  const errors = validateConfig();
  if (errors.length > 0) {
    console.log('❌ Configuração inválida:');
    errors.forEach((e) => console.log(`   → ${e}`));
    process.exit(1);
  }

  if (!targetEmail) {
    console.log('❌ Informe um email como argumento: node src/diagnose.js alan@empresa.com');
    process.exit(1);
  }

  console.log(`👤 Buscando usuário: ${targetEmail}`);
  const user = await findUserByEmail(targetEmail);
  if (!user) {
    console.log(`❌ Usuário não encontrado no Graph: ${targetEmail}`);
    process.exit(1);
  }
  console.log(`✅ Usuário: ${user.displayName} (${user.mail})\n`);

  // Janela: início do dia até fim do dia (horário de Brasília → UTC)
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  // Usar janela ampla: 12h atrás até 12h à frente
  const windowStart = new Date(now.getTime() - 12 * 60 * 60 * 1000);
  const windowEnd   = new Date(now.getTime() + 12 * 60 * 60 * 1000);

  console.log(`📅 Janela de busca: ${fmtTime(windowStart.toISOString())} → ${fmtTime(windowEnd.toISOString())}`);
  console.log(hr());

  const events = await getUserEvents(user.id, windowStart, windowEnd);
  console.log(`\n📋 Total de eventos retornados pelo Graph: ${events.length}\n`);

  if (events.length === 0) {
    console.log('   (nenhum evento encontrado na janela)\n');
  }

  const teamsEvents = [];
  const nonTeams = [];

  for (const ev of events) {
    const inicio = fmtTime(ev.start?.dateTime);
    const fim    = fmtTime(ev.end?.dateTime);
    const hasJoinUrl = Boolean(ev.onlineMeeting?.joinUrl);
    const ended = new Date((ev.end?.dateTime || '') + 'Z') <= now;

    if (hasJoinUrl) {
      teamsEvents.push({ ev, ended });
      console.log(`✅ [TEAMS] "${ev.subject}"`);
    } else {
      nonTeams.push(ev);
      console.log(`⚪ [SEM joinUrl - IGNORADO] "${ev.subject}"`);
    }
    console.log(`         Início: ${inicio}  |  Fim: ${fim}`);
    console.log(`         Organizador: ${ev.organizer?.emailAddress?.address || '—'}`);
    if (!hasJoinUrl && ev.onlineMeeting) {
      console.log(`         onlineMeeting presente mas sem joinUrl:`, JSON.stringify(ev.onlineMeeting));
    }
    console.log();
  }

  console.log(hr());
  console.log(`\n🔵 Reuniões Teams detectadas: ${teamsEvents.length}`);
  console.log(`⚪ Eventos ignorados (sem joinUrl): ${nonTeams.length}\n`);

  if (teamsEvents.length === 0) {
    console.log('Nenhuma reunião Teams encontrada. Nada para verificar transcrições.\n');
    return;
  }

  // Para reuniões já encerradas, tenta buscar a transcrição
  const ended = teamsEvents.filter((t) => t.ended);
  console.log(hr());
  console.log(`\n🔍 Verificando transcrições para ${ended.length} reunião(ões) encerrada(s)...\n`);

  for (const { ev } of ended) {
    console.log(`📝 "${ev.subject}"  (${fmtTime(ev.start?.dateTime)})`);
    const joinUrl = ev.onlineMeeting?.joinUrl;

    // Tenta resolver o onlineMeeting pelo usuário do calendário
    console.log(`   Tentando resolver onlineMeeting...`);
    const onlineMeeting = await findOnlineMeetingByJoinUrl(user.id, joinUrl);

    if (!onlineMeeting?.id) {
      console.log(`   ⚠️  onlineMeeting NÃO encontrado para este usuário.`);
      console.log(`   → Isso normalmente indica um problema de permissão (403) ou que o organizador é outro usuário.`);
      console.log(`   → Organizador do evento: ${ev.organizer?.emailAddress?.address}`);
    } else {
      console.log(`   ✅ onlineMeeting encontrado: ${onlineMeeting.id}`);
      const transcript = await getMeetingTranscript(user.id, onlineMeeting.id);
      if (transcript.found && transcript.content) {
        console.log(`   ✅ TRANSCRIÇÃO DISPONÍVEL! (${transcript.content.length} chars)`);
      } else {
        console.log(`   ⚠️  Transcrição NÃO disponível ainda.`);
        console.log(`   → Motivo: reunião pode não ter sido gravada, ou a transcrição ainda não foi processada pelo Teams.`);
      }
    }
    console.log();
  }

  console.log(hr('='));
  console.log('  Diagnóstico concluído.');
  console.log(hr('=') + '\n');
}

run().catch((err) => {
  console.error('\n❌ Erro fatal:', err.message);
  process.exit(1);
});
