const assert = require('node:assert/strict');
const { test } = require('./harness');

const {
  parseGraphDateTime,
  getPostMeetingWaitStatus,
} = require('../src/meeting-time');

test('parseGraphDateTime treats Graph dateTime values as UTC when no Z is present', () => {
  const parsed = parseGraphDateTime('2026-04-29T13:00:00.0000000');

  assert.equal(parsed.toISOString(), '2026-04-29T13:00:00.000Z');
});

test('getPostMeetingWaitStatus blocks summary until the configured wait has elapsed', () => {
  const meeting = {
    end: { dateTime: '2026-04-29T13:00:00.0000000' },
  };

  const status = getPostMeetingWaitStatus(
    meeting,
    60,
    new Date('2026-04-29T13:03:00.000Z')
  );

  assert.equal(status.ready, false);
  assert.equal(status.remainingMinutes, 57);
  assert.equal(status.readyAt.toISOString(), '2026-04-29T14:00:00.000Z');
});

test('getPostMeetingWaitStatus allows processing after the wait window', () => {
  const meeting = {
    end: { dateTime: '2026-04-29T13:00:00.0000000' },
  };

  const status = getPostMeetingWaitStatus(
    meeting,
    60,
    new Date('2026-04-29T14:00:00.000Z')
  );

  assert.equal(status.ready, true);
  assert.equal(status.remainingMinutes, 0);
});
