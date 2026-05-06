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
  'identificando todos os participantes e suas contribuicoes.';

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

function buildSummaryPrompt(meetingTitle, transcriptText) {
  return `Voce e um assistente executivo da empresa Net Turbo. Analise a transcricao completa abaixo e gere um resumo profissional em portugues do Brasil.

REUNIAO: ${meetingTitle}

TRANSCRICAO (formato: "Falante: fala"):
${transcriptText}

---

Com base na transcricao COMPLETA acima, gere:

## Participantes
Liste todos os participantes que falaram, com nome e papel quando identificavel.

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

async function generateSummary(rawTranscript, meetingTitle) {
  const cleanTranscript = parseVttToText(rawTranscript);
  const truncated = cleanTranscript.substring(0, MAX_TRANSCRIPT_CHARS);

  const charsBrutos = rawTranscript.length;
  const charsLimpos = cleanTranscript.length;
  const charsEnviados = truncated.length;
  log.info(`Transcricao: ${charsBrutos} chars brutos -> ${charsLimpos} limpos -> ${charsEnviados} enviados a IA`);

  if (charsLimpos > MAX_TRANSCRIPT_CHARS) {
    log.warn(`Transcricao truncada em ${MAX_TRANSCRIPT_CHARS} chars. Considere aumentar MAX_TRANSCRIPT_CHARS para reunioes longas.`);
  }

  const prompt = buildSummaryPrompt(meetingTitle, truncated);
  const errors = [];

  if (config.gemini.apiKey) {
    try {
      return await generateSummaryWithGemini(prompt);
    } catch (error) {
      errors.push(error);
      if (!error.isQuotaError && !error.isConfigError) throw error;
      log.warn('Fallback para Groq apos falha do Gemini.');
    }
  }

  if (config.groq.apiKey) {
    return generateSummaryWithGroq(prompt);
  }

  throw errors[0] || new Error('Nenhum provedor de IA configurado para resumo');
}

module.exports = { generateSummary };
