const assert = require('assert');
const { test } = require('./harness');
const {
  buildSummaryPrompt,
  extractMeetingParticipants,
  withDeterministicParticipants,
} = require('../src/summarizer');

const meeting = {
  organizer: {
    emailAddress: {
      name: 'Patrik Oliveira - Net Turbo',
      address: 'patrik.oliveira@netturbo.com.br',
    },
  },
  attendees: [
    {
      emailAddress: {
        name: 'Alan Moreira - Net Turbo',
        address: 'alan.moreira@netturbo.com.br',
      },
    },
    {
      emailAddress: {
        name: 'Marcos Santos - Net Turbo',
        address: 'marcos.santos@netturbo.com.br',
      },
    },
  ],
};

test('extractMeetingParticipants uses only calendar organizer and attendees', () => {
  const participants = extractMeetingParticipants(meeting);

  assert.deepStrictEqual(participants, [
    { name: 'Patrik Oliveira - Net Turbo', role: 'organizador' },
    { name: 'Alan Moreira - Net Turbo', role: 'participante' },
    { name: 'Marcos Santos - Net Turbo', role: 'participante' },
  ]);
});

test('buildSummaryPrompt tells the model not to create participants section', () => {
  const participants = extractMeetingParticipants(meeting);
  const prompt = buildSummaryPrompt(
    'Alinhamento IA',
    'Alan Moreira - Net Turbo: Wellington foi citado no contexto do projeto.',
    participants
  );

  assert.match(prompt, /PARTICIPANTES CONFIRMADOS PELO CALENDARIO/);
  assert.match(prompt, /Nao crie secao "Participantes"/);
  assert.match(prompt, /Nao adicione como participante nenhum nome apenas citado na transcricao/);
});

test('withDeterministicParticipants strips hallucinated AI participants', () => {
  const participants = extractMeetingParticipants(meeting);
  const aiSummary = `## Participantes
- Wellington (papel nao especificado)
- Fernando (papel nao especificado)

## Resumo Executivo
Alan, Marcos e Patrik alinharam os proximos passos de IA. Wellington foi citado como contexto.`;

  const summary = withDeterministicParticipants(aiSummary, participants);

  assert.match(summary, /- Patrik Oliveira - Net Turbo \(organizador\)/);
  assert.match(summary, /- Alan Moreira - Net Turbo/);
  assert.match(summary, /- Marcos Santos - Net Turbo/);
  assert.doesNotMatch(summary, /Wellington \(papel nao especificado\)/);
  assert.match(summary, /Wellington foi citado como contexto/);
});
