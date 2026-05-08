const assert = require('node:assert/strict');
const { test } = require('./harness');

const { selectTranscriptForOccurrence } = require('../src/graph');

test('selectTranscriptForOccurrence chooses the current recurring occurrence transcript', () => {
  const transcripts = [
    { id: 'yesterday', createdDateTime: '2026-04-28T12:31:52.9447993Z' },
    { id: 'today', createdDateTime: '2026-04-29T12:32:12.9186221Z' },
  ];

  const selected = selectTranscriptForOccurrence(
    transcripts,
    '2026-04-29T12:30:00.0000000'
  );

  assert.equal(selected.id, 'today');
});

test('selectTranscriptForOccurrence does not fall back to an older occurrence', () => {
  const transcripts = [
    { id: 'yesterday', createdDateTime: '2026-04-28T12:31:52.9447993Z' },
  ];

  const selected = selectTranscriptForOccurrence(
    transcripts,
    '2026-04-29T12:30:00.0000000'
  );

  assert.equal(selected, null);
});

test('selectTranscriptForOccurrence uses latest transcript only when no occurrence start is provided', () => {
  const transcripts = [
    { id: 'older', createdDateTime: '2026-04-27T12:31:52.9447993Z' },
    { id: 'newer', createdDateTime: '2026-04-28T12:31:52.9447993Z' },
  ];

  const selected = selectTranscriptForOccurrence(transcripts);

  assert.equal(selected.id, 'newer');
});

test('selectTranscriptForOccurrence aceita transcricao criada ate 10 min antes do inicio agendado', () => {
  // Daily marcada para 09:30, transcricao registrada pelo Teams as 09:28
  const transcripts = [
    { id: 'early', createdDateTime: '2026-04-29T09:28:00.0000000Z' },
  ];

  const selected = selectTranscriptForOccurrence(
    transcripts,
    '2026-04-29T09:30:00.0000000'
  );

  assert.equal(selected.id, 'early');
});

test('selectTranscriptForOccurrence rejeita transcricao de dia anterior mesmo com buffer de 10 min', () => {
  // Daily de hoje as 09:30 — transcricao de ontem as 09:35 nao deve ser aceita
  const transcripts = [
    { id: 'yesterday', createdDateTime: '2026-04-28T09:35:00.0000000Z' },
  ];

  const selected = selectTranscriptForOccurrence(
    transcripts,
    '2026-04-29T09:30:00.0000000'
  );

  assert.equal(selected, null);
});
