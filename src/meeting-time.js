const MS_PER_MINUTE = 60 * 1000;

function parseGraphDateTime(value) {
  if (!value) return null;

  const normalized = String(value).endsWith('Z') ? String(value) : `${value}Z`;
  const date = new Date(normalized);

  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateTimeBr(date) {
  if (!date) return 'data indisponivel';

  return date.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

function getPostMeetingWaitStatus(meeting, waitMinutes, now = new Date()) {
  const endDate = parseGraphDateTime(meeting?.end?.dateTime);
  const safeWaitMinutes = Math.max(0, Number(waitMinutes) || 0);
  const nowDate = now instanceof Date ? now : parseGraphDateTime(now);

  if (!endDate || !nowDate) {
    return {
      ready: true,
      readyAt: null,
      remainingMinutes: 0,
    };
  }

  const readyAt = new Date(endDate.getTime() + safeWaitMinutes * MS_PER_MINUTE);
  const remainingMs = readyAt.getTime() - nowDate.getTime();

  return {
    ready: remainingMs <= 0,
    readyAt,
    remainingMinutes: Math.max(0, Math.ceil(remainingMs / MS_PER_MINUTE)),
  };
}

module.exports = {
  parseGraphDateTime,
  formatDateTimeBr,
  getPostMeetingWaitStatus,
};
