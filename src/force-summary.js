/**
 * force-summary.js - Processa manualmente o resumo de uma reunião,
 * ignorando opt-in e verificações de "já processado".
 *
 * Útil quando o email preventivo não foi enviado ou o opt-in não aconteceu.
 *
 * Uso:
 *   node src/force-summary.js <email-do-usuario> [horas-atras] [filtro-assunto]
 *
 * Exemplos:
 *   node src/force-summary.js alan.moreira@netturbo.com.br
 *   node src/force-summary.js alan.moreira@netturbo.com.br 12
 *   node src/force-summary.js alan.moreira@netturbo.com.br 12 "Daily TI"
 */

const { config, validateConfig } = require('./config');
const { findUserByEmail, getUserEvents, findOnlineMeetingByJoinUrl, getMeetingTranscript } = require('./graph');
const { generateSummary } = require('./summarizer');
const { sendMeetingSummary } = require('./email');

const targetEmail = process.argv[2] || config.pilotUsers[0];
const horasAtras  = parseInt(process.argv[3] || '10', 10);
const subjectFilter = process.argv.slice(4).join(' ').trim().toLowerCase();

function hr(char = '─') { return char.repeat(60); }

function fmtTime(isoStr) {
  if (!isoStr) return '—';
  const s = isoStr.endsWith('Z') ? isoStr : isoStr + 'Z';
  return new Date(s).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

async function run() {
  console.log('\n' + hr('='));
  console.log('  NetMeet Bot — Processamento Forçado de Resumo');
  console.log(hr('=') + '\n');

  const errors = validateConfig();
  if (errors.length > 0) {
    console.log('❌ Configuração inválida:');
    errors.forEach((e) => console.log(`   → ${e}`));
    process.exit(1);
  }

  if (!targetEmail) {
    console.log('❌ Informe um email: node src/force-summary.js alan@empresa.com');
    process.exit(1);
  }

  console.log(`👤 Usuário: ${targetEmail}`);
  const user = await findUserByEmail(targetEmail);
  if (!user) {
    console.log(`❌ Usuário não encontrado: ${targetEmail}`);
    process.exit(1);
  }
  console.log(`✅ ${user.displayName} (${user.mail})\n`);

  // Busca reuniões encerradas nas últimas N horas
  const now  = new Date();
  const past = new Date(now.getTime() - horasAtras * 60 * 60 * 1000);

  console.log(`📅 Buscando reuniões encerradas: ${fmtTime(past.toISOString())} → ${fmtTime(now.toISOString())}`);
  if (subjectFilter) {
    console.log(`🔎 Filtro de assunto: "${subjectFilter}"`);
  }
  console.log(hr());

  const events = await getUserEvents(user.id, past, now);
  const teamsEnded = events.filter(
    (e) => e.onlineMeeting?.joinUrl && new Date((e.end.dateTime || '') + 'Z') <= now
  ).filter(
    (e) => !subjectFilter || String(e.subject || '').toLowerCase().includes(subjectFilter)
  );

  if (teamsEnded.length === 0) {
    console.log('\n⚠️  Nenhuma reunião Teams encerrada encontrada na janela/filtro.\n');
    return;
  }

  console.log(`\n📋 ${teamsEnded.length} reunião(ões) Teams encerrada(s):\n`);
  teamsEnded.forEach((e, i) => {
    console.log(`   ${i + 1}. "${e.subject}"  —  ${fmtTime(e.start.dateTime)}  (org: ${e.organizer?.emailAddress?.address})`);
  });

  console.log('\n' + hr());
  console.log('\n🔄 Processando...\n');

  for (const meeting of teamsEnded) {
    console.log(hr('-'));
    console.log(`📝 "${meeting.subject}"  (${fmtTime(meeting.start.dateTime)})`);

    const joinUrl = meeting.onlineMeeting?.joinUrl;
    const onlineMeeting = await findOnlineMeetingByJoinUrl(user.id, joinUrl);

    if (!onlineMeeting?.id) {
      console.log(`   ⚠️  Não foi possível resolver o onlineMeeting para ${user.mail}.`);
      console.log(`   → Verifique a Application Access Policy no Azure.\n`);
      continue;
    }

    console.log(`   ✅ onlineMeeting: ${onlineMeeting.id}`);

    const transcript = await getMeetingTranscript(user.id, onlineMeeting.id, meeting.start?.dateTime);

    if (!transcript.found || !transcript.content) {
      console.log(`   ⚠️  Nenhuma transcrição disponível.`);
      console.log(`   → Reunião pode não ter sido gravada.\n`);
      continue;
    }

    console.log(`   ✅ Transcrição: ${transcript.content.length} chars`);
    console.log(`   🤖 Gerando resumo com IA...`);

    let summary;
    try {
      summary = await generateSummary(transcript.content, meeting.subject, meeting);
    } catch (err) {
      console.log(`   ❌ Erro ao gerar resumo: ${err.message}\n`);
      if (err.isQuotaError || err.status === 429) {
        console.log('   → A chave/projeto do Gemini esta sem cota disponivel. Troque GOOGLE_API_KEY, habilite billing ou aguarde a cota voltar.\n');
      }
      continue;
    }

    const meetingDate = new Date(meeting.start.dateTime + 'Z').toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
    });
    const organizer = meeting.organizer?.emailAddress?.name || 'Organizador';

    try {
      await sendMeetingSummary(user.mail, meeting.subject, meetingDate, organizer, summary);
      console.log(`   ✅ Resumo enviado para ${user.mail}!\n`);
    } catch (err) {
      console.log(`   ❌ Erro ao enviar email: ${err.message}\n`);
    }
  }

  console.log(hr('='));
  console.log('  Processamento concluído.');
  console.log(hr('=') + '\n');
}

run().catch((err) => {
  console.error('\n❌ Erro fatal:', err.message);
  process.exit(1);
});
