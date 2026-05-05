/**
 * summarizer.js - Geração de resumos com Google Gemini
 *
 * O formato de transcrição do Teams é WebVTT (.vtt).
 * Antes de enviar para a IA, convertemos o VTT em texto limpo no formato
 * "Speaker: fala" para reduzir tokens e melhorar a qualidade do resumo.
 */
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const { config } = require('./config');
const { createLogger } = require('./logger');

const log = createLogger(config.logLevel);

// Limite de caracteres do texto limpo enviado para a IA.
// gemini-2.0-flash suporta 1M tokens; 80k chars ≈ 20k tokens — margem segura.
const MAX_TRANSCRIPT_CHARS = 80000;

/**
 * Converte WebVTT para texto limpo: "Nome do Falante: frase"
 * Remove timestamps, metadados e blocos sem conteúdo de fala.
 * Mescla falas consecutivas do mesmo falante para reduzir repetição.
 *
 * @param {string} vtt - Conteúdo bruto do arquivo VTT
 * @returns {string} Texto limpo
 */
function parseVttToText(vtt) {
  if (!vtt || typeof vtt !== 'string') return String(vtt || '');

  // Divide em blocos (separados por linha em branco)
  const blocks = vtt.split(/\n\s*\n/);
  const lines = [];

  for (const block of blocks) {
    const blockLines = block.trim().split('\n');

    // Ignora cabeçalho WEBVTT e blocos sem seta de tempo
    if (!blockLines.some((l) => l.includes('-->'))) continue;

    // Pega as linhas de conteúdo (após a linha de timestamp)
    const contentLines = blockLines
      .filter((l) => !l.includes('-->') && !/^\d+$/.test(l.trim()))
      .join(' ')
      .trim();

    if (!contentLines) continue;

    // Extrai nome do falante da tag <v Nome> ou deixa sem nome
    const speakerMatch = contentLines.match(/^<v ([^>]+)>/);
    const speaker = speakerMatch ? speakerMatch[1].trim() : null;

    // Remove todas as tags HTML/VTT do conteúdo
    const text = contentLines.replace(/<[^>]+>/g, '').trim();

    if (!text) continue;

    const formatted = speaker ? `${speaker}: ${text}` : text;

    // Mescla com a linha anterior se é o mesmo falante (evita repetição)
    const last = lines[lines.length - 1];
    if (last && speaker && last.startsWith(`${speaker}: `)) {
      lines[lines.length - 1] = last + ' ' + text;
    } else {
      lines.push(formatted);
    }
  }

  return lines.join('\n');
}

async function generateSummary(rawTranscript, meetingTitle) {
  // Converte VTT → texto limpo com falantes identificados
  const cleanTranscript = parseVttToText(rawTranscript);
  const truncated = cleanTranscript.substring(0, MAX_TRANSCRIPT_CHARS);

  const charsBrutos = rawTranscript.length;
  const charsLimpos = cleanTranscript.length;
  const charsEnviados = truncated.length;
  log.info(`Transcrição: ${charsBrutos} chars brutos → ${charsLimpos} limpos → ${charsEnviados} enviados à IA`);

  if (charsLimpos > MAX_TRANSCRIPT_CHARS) {
    log.warn(`Transcrição truncada em ${MAX_TRANSCRIPT_CHARS} chars. Considere aumentar MAX_TRANSCRIPT_CHARS para reuniões longas.`);
  }

  const prompt = `Você é um assistente executivo da empresa Net Turbo. Analise a transcrição completa abaixo e gere um resumo profissional em português do Brasil.

REUNIÃO: ${meetingTitle}

TRANSCRIÇÃO (formato: "Falante: fala"):
${truncated}

---

Com base na transcrição COMPLETA acima, gere:

## 👥 Participantes
Liste todos os participantes que falaram, com nome e papel quando identificável.

## 📋 Resumo Executivo
2-3 parágrafos descrevendo o objetivo e o que foi discutido.

## 🎯 Decisões Tomadas
Liste cada decisão com quem decidiu (quando identificável).

## ✅ Action Items
Liste cada tarefa com responsável e prazo (quando mencionado).

## 📅 Próximos Passos
O que foi combinado para as próximas reuniões ou ações futuras.

## ❓ Pontos de Atenção
Dúvidas, riscos ou pendências que ficaram em aberto.

Formate em Markdown. Seja objetivo e direto.`;

  try {
    log.info('Gerando resumo com IA...');
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${config.gemini.model}:generateContent?key=${config.gemini.apiKey}`;
    const response = await axios.post(
      endpoint,
      {
        systemInstruction: {
          parts: [
            {
              text:
                'Você é um assistente de reuniões profissional da empresa Net Turbo. ' +
                'Seu objetivo é extrair o máximo de informação útil da transcrição, ' +
                'identificando todos os participantes e suas contribuições.',
            },
          ],
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
    log.success('Resumo gerado!');
    return response.data.candidates[0].content.parts[0].text;
  } catch (error) {
    log.error('Erro ao gerar resumo:', error.response?.data?.error?.message || error.message);
    throw new Error(`Falha na geração do resumo: ${error.message}`);
  }
}

module.exports = { generateSummary };
