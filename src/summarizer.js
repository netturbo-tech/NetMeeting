/**
 * summarizer.js - Geracao de resumos com fallback Gemini -> Groq.
 *
 * O formato de transcricao do Teams e WebVTT (.vtt). Antes de enviar
 * para a IA, convertemos o VTT em texto limpo no formato "Speaker: fala"
 * para reduzir tokens e melhorar a qualidade do resumo.
 */
const axios = require('axios');
const { config } = require('./config');
const { createLogger } = require('./logger');

const log = createLogger(config.logLevel);

// Limite de caracteres do texto limpo enviado para a IA.
const MAX_TRANSCRIPT_CHARS = 80000;

const SYSTEM_INSTRUCTION =
  'Voce e um assistente de reunioes profissional da empresa Net Turbo. ' +
  'Seu objetivo e extrair o maximo de informacao util da transcricao, ' +
  'sem inventar participantes, decisoes, responsaveis ou prazos.';

function parseVttToText(vtt) {
  if (!vtt || typeof vtt !== 'string') return String(vtt || '');

  const blocks = vtt.split(/\n\s*\n/);
  const lines = [];

  for (const block of blocks) {
    const blockLines = block.trim().split('\n');
    if (!blockLines.some((line) => line.includes('-->'))) continue;

    const contentLines = blockLines
      .filter((line) => !line.includes('-->') && !/^\d+$/.test(line.trim()))
      .join(' ')
      .trim();

    if (!contentLines) continue;

    const speakerMatch = contentLines.match(/^<v ([^>]+)>/);
    const speaker = speakerMatch ? speakerMatch[1].trim() : null;
    const text = contentLines.replace(/<[^>]+>/g, '').trim();
    if (!text) continue;

    const formatted = speaker ? `${speaker}: ${text}` : text;
    const last = lines[lines.length - 1];
    if (last && speaker && last.startsWith(`${speaker}: `)) {
      lines[lines.length - 1] = last + ' ' + text;
    } else {
      lines.push(formatted);
    }
  }

  return lines.join('\n');
}

function getEmailAddressPerson(emailAddress) {
  const name = String(emailAddress?.name || '').trim();
  const address = String(emailAddress?.address || '').trim().toLowerCase();
  const displayName = name || address;
  if (!displayName) return null;

  return {
    name: displayName,
    address,
  };
}

function buildPersonKey(person) {
  return person.address || person.name.toLowerCase();
}

function extractMeetingParticipants(meeting = {}) {
  const participants = [];
  const seen = new Set();

  const addPerson = (person, role) => {
    if (!person?.name) return;
    const key = buildPersonKey(person);
    if (seen.has(key)) return;
    seen.add(key);
    participants.push({
      name: person.name,
      role,
    });
  };

  addPerson(getEmailAddressPerson(meeting.organizer?.emailAddress), 'organizador');

  for (const attendee of meeting.attendees || []) {
    addPerson(getEmailAddressPerson(attendee.emailAddress), 'participante');
  }

  return participants;
}

function formatParticipantSection(participants) {
  if (!participants?.length) {
    return '## Participantes\n- Participantes nao informados nos metadados da reuniao.';
  }

  const lines = participants.map((participant) => {
    const roleSuffix = participant.role === 'organizador' ? ' (organizador)' : '';
    return `- ${participant.name}${roleSuffix}`;
  });

  return `## Participantes\n${lines.join('\n')}`;
}

function stripAiParticipantSection(summary) {
  return String(summary || '')
    .replace(/^##\s+Participantes\s*[\s\S]*?(?=^##\s+|\s*$)/gim, '')
    .trim();
}

function withDeterministicParticipants(summary, participants) {
  const participantSection = formatParticipantSection(participants);
  const cleanSummary = stripAiParticipantSection(summary);
  return cleanSummary ? `${participantSection}\n\n${cleanSummary}` : participantSection;
}

function buildSummaryPrompt(meetingTitle, transcriptText, participants = []) {
  const participantLines = participants.length
    ? participants.map((participant) => `- ${participant.name}${participant.role === 'organizador' ? ' (organizador)' : ''}`).join('\n')
    : '- Participantes nao informados nos metadados da reuniao.';

  return `Voce e um assistente executivo da empresa Net Turbo. Analise a transcricao completa abaixo e gere um resumo profissional em portugues do Brasil.

REUNIAO: ${meetingTitle}

PARTICIPANTES CONFIRMADOS PELO CALENDARIO:
${participantLines}

TRANSCRICAO (formato: "Falante: fala"):
${transcriptText}

---

Regras obrigatorias:
- A secao "Participantes" sera montada pelo sistema usando apenas os metadados do calendario.
- Nao crie secao "Participantes" na sua resposta.
- Nao adicione como participante nenhum nome apenas citado na transcricao.
- Use nomes citados na transcricao apenas no contexto do assunto, decisao ou tarefa, quando isso estiver claro.

Com base na transcricao COMPLETA acima, gere somente as secoes abaixo:

## Resumo Executivo
3-4 paragrafos descrevendo o objetivo e o que foi discutido.

## Decisoes Tomadas
Liste cada decisao com quem decidiu (quando identificavel).

## Action Items
Liste cada tarefa com responsavel e prazo (quando mencionado).

## Proximos Passos
O que foi combinado para as proximas reunioes ou acoes futuras.

## Pontos de Atencao
Duvidas, riscos ou pendencias que ficaram em aberto.

Formate em Markdown. Seja objetivo e direto.`;
}

function wrapAiError(error, provider) {
  const apiMessage = error.response?.data?.error?.message || error.message;
  const wrapped = new Error(`Falha na geracao do resumo: ${apiMessage}`);
  wrapped.status = error.response?.status;
  wrapped.provider = provider;
  wrapped.isQuotaError =
    wrapped.status === 429 ||
    /quota exceeded|free_tier|rate-limit|rate limit|too many requests/i.test(apiMessage || '');
  return wrapped;
}

function summarizeProviderErrors(errors) {
  return errors
    .map((error) => `${error.provider || 'ia'}${error.status ? ` ${error.status}` : ''}: ${error.message}`)
    .join(' | ');
}

async function generateSummaryWithGemini(prompt) {
  if (!config.gemini.apiKey) {
    throw Object.assign(new Error('GOOGLE_API_KEY nao configurado'), {
      provider: 'gemini',
      isConfigError: true,
    });
  }

  log.info(`Gerando resumo com Gemini (${config.gemini.model})...`);
  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${config.gemini.model}:generateContent?key=${config.gemini.apiKey}`;
    const response = await axios.post(
      endpoint,
      {
        systemInstruction: {
          parts: [{ text: SYSTEM_INSTRUCTION }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 3000,
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Gemini nao retornou conteudo no resumo');
    log.success('Resumo gerado com Gemini!');
    return text;
  } catch (error) {
    const wrapped = wrapAiError(error, 'gemini');
    log.error('Erro ao gerar resumo com Gemini:', wrapped.message);
    throw wrapped;
  }
}

async function generateSummaryWithNvidia(prompt) {
  if (!config.nvidia.apiKey) {
    throw Object.assign(new Error('NVIDIA_API_KEY nao configurado'), {
      provider: 'nvidia',
      isConfigError: true,
    });
  }

  log.info(`Gerando resumo com NVIDIA (${config.nvidia.model})...`);
  try {
    const response = await axios.post(
      'https://integrate.api.nvidia.com/v1/chat/completions',
      {
        model: config.nvidia.model,
        messages: [
          { role: 'system', content: SYSTEM_INSTRUCTION },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 3000,
      },
      {
        headers: {
          Authorization: `Bearer ${config.nvidia.apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    const text = response.data.choices?.[0]?.message?.content;
    if (!text) throw new Error('NVIDIA nao retornou conteudo no resumo');
    log.success('Resumo gerado com NVIDIA!');
    return text;
  } catch (error) {
    const wrapped = wrapAiError(error, 'nvidia');
    log.error('Erro ao gerar resumo com NVIDIA:', wrapped.message);
    throw wrapped;
  }
}

async function generateSummaryWithGroq(prompt) {
  if (!config.groq.apiKey) {
    throw Object.assign(new Error('GROQ_API_KEY nao configurado'), {
      provider: 'groq',
      isConfigError: true,
    });
  }

  log.info(`Gerando resumo com Groq (${config.groq.model})...`);
  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: config.groq.model,
        messages: [
          { role: 'system', content: SYSTEM_INSTRUCTION },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 3000,
      },
      {
        headers: {
          Authorization: `Bearer ${config.groq.apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    const text = response.data.choices?.[0]?.message?.content;
    if (!text) throw new Error('Groq nao retornou conteudo no resumo');
    log.success('Resumo gerado com Groq!');
    return text;
  } catch (error) {
    const wrapped = wrapAiError(error, 'groq');
    log.error('Erro ao gerar resumo com Groq:', wrapped.message);
    throw wrapped;
  }
}

async function generateSummaryWithOpenRouter(prompt) {
  if (!config.openrouter.apiKey) {
    throw Object.assign(new Error('OPENROUTER_API_KEY nao configurado'), {
      provider: 'openrouter',
      isConfigError: true,
    });
  }

  log.info(`Gerando resumo com OpenRouter (${config.openrouter.model})...`);
  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: config.openrouter.model,
        messages: [
          { role: 'system', content: SYSTEM_INSTRUCTION },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 3000,
      },
      {
        headers: {
          Authorization: `Bearer ${config.openrouter.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': config.server.dashboardUrl || 'http://localhost:3000',
          'X-Title': 'NetMeeting',
        },
      }
    );
    const text = response.data.choices?.[0]?.message?.content;
    if (!text) throw new Error('OpenRouter nao retornou conteudo no resumo');
    log.success('Resumo gerado com OpenRouter!');
    return text;
  } catch (error) {
    const wrapped = wrapAiError(error, 'openrouter');
    log.error('Erro ao gerar resumo com OpenRouter:', wrapped.message);
    throw wrapped;
  }
}

async function generateSummary(rawTranscript, meetingTitle, meeting = {}) {
  const cleanTranscript = parseVttToText(rawTranscript);
  const truncated = cleanTranscript.substring(0, MAX_TRANSCRIPT_CHARS);
  const participants = extractMeetingParticipants(meeting);

  const charsBrutos = rawTranscript.length;
  const charsLimpos = cleanTranscript.length;
  const charsEnviados = truncated.length;
  log.info(`Transcricao: ${charsBrutos} chars brutos -> ${charsLimpos} limpos -> ${charsEnviados} enviados a IA`);

  if (charsLimpos > MAX_TRANSCRIPT_CHARS) {
    log.warn(`Transcricao truncada em ${MAX_TRANSCRIPT_CHARS} chars. Considere aumentar MAX_TRANSCRIPT_CHARS para reunioes longas.`);
  }

  const prompt = buildSummaryPrompt(meetingTitle, truncated, participants);
  const errors = [];

  if (config.nvidia.apiKey) {
    try {
      const summary = await generateSummaryWithNvidia(prompt);
      return withDeterministicParticipants(summary, participants);
    } catch (error) {
      errors.push(error);
      log.warn('Fallback para Gemini apos falha da NVIDIA.');
    }
  }

  if (config.gemini.apiKey) {
    try {
      const summary = await generateSummaryWithGemini(prompt);
      return withDeterministicParticipants(summary, participants);
    } catch (error) {
      errors.push(error);
      log.warn('Fallback para Groq apos falha do Gemini.');
    }
  }

  if (config.groq.apiKey) {
    try {
      const summary = await generateSummaryWithGroq(prompt);
      return withDeterministicParticipants(summary, participants);
    } catch (error) {
      errors.push(error);
      log.warn('Fallback para OpenRouter apos falha do Groq.');
    }
  }

  if (config.openrouter.apiKey) {
    try {
      const summary = await generateSummaryWithOpenRouter(prompt);
      return withDeterministicParticipants(summary, participants);
    } catch (error) {
      errors.push(error);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Todos os provedores de IA falharam: ${summarizeProviderErrors(errors)}`);
  }

  throw new Error('Nenhum provedor de IA configurado para resumo');
}

module.exports = {
  generateSummary,
  buildSummaryPrompt,
  extractMeetingParticipants,
  formatParticipantSection,
  stripAiParticipantSection,
  withDeterministicParticipants,
};
