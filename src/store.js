/**
 * store.js - Persistencia local simples para evitar reprocessamento.
 */
const fs = require('fs');
const path = require('path');
const { createLogger } = require('./logger');
const { config } = require('./config');

const log = createLogger(config.logLevel);
const dataDir = path.resolve(__dirname, '..', 'data');
const storePath = path.join(dataDir, 'processed-meetings.json');

function readStore() {
  try {
    if (!fs.existsSync(storePath)) {
      return { processedMeetings: {}, notifiedMeetings: {}, optedInMeetings: {} };
    }

    const content = fs.readFileSync(storePath, 'utf8');
    const parsed = JSON.parse(content);
    return {
      processedMeetings: parsed.processedMeetings || {},
      notifiedMeetings: parsed.notifiedMeetings || {},
      optedInMeetings: parsed.optedInMeetings || {},
    };
  } catch (error) {
    log.warn(`Nao consegui ler o store local: ${error.message}`);
    return { processedMeetings: {}, notifiedMeetings: {}, optedInMeetings: {} };
  }
}

function writeStore(store) {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf8');
}

function buildMeetingKey(userId, meetingId) {
  return `${userId}:${meetingId}`;
}

function buildNotificationKey(userId, meetingId) {
  return `${userId}:${meetingId}`;
}

function buildOptInKey(userId, meetingId) {
  return `${userId}:${meetingId}`;
}

function wasMeetingProcessed(userId, meetingId) {
  const store = readStore();
  return Boolean(store.processedMeetings?.[buildMeetingKey(userId, meetingId)]);
}

function markMeetingProcessed(userId, meetingId, details = {}) {
  const store = readStore();
  store.processedMeetings = store.processedMeetings || {};
  store.processedMeetings[buildMeetingKey(userId, meetingId)] = {
    ...details,
    userId,
    meetingId,
    processedAt: new Date().toISOString(),
  };
  writeStore(store);
}

function wasMeetingNotified(userId, meetingId) {
  const store = readStore();
  return Boolean(store.notifiedMeetings?.[buildNotificationKey(userId, meetingId)]);
}

function markMeetingNotified(userId, meetingId, details = {}) {
  const store = readStore();
  store.notifiedMeetings = store.notifiedMeetings || {};
  store.notifiedMeetings[buildNotificationKey(userId, meetingId)] = {
    ...details,
    userId,
    meetingId,
    notifiedAt: new Date().toISOString(),
  };
  writeStore(store);
}

function wasMeetingOptedIn(userId, meetingId) {
  const store = readStore();
  return Boolean(store.optedInMeetings?.[buildOptInKey(userId, meetingId)]);
}

function markMeetingOptIn(userId, meetingId, details = {}) {
  const store = readStore();
  store.optedInMeetings = store.optedInMeetings || {};
  store.optedInMeetings[buildOptInKey(userId, meetingId)] = {
    ...details,
    userId,
    meetingId,
    optedInAt: new Date().toISOString(),
  };
  writeStore(store);
}

module.exports = {
  wasMeetingProcessed,
  markMeetingProcessed,
  wasMeetingNotified,
  markMeetingNotified,
  wasMeetingOptedIn,
  markMeetingOptIn,
};
