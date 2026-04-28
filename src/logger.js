/**
 * logger.js - Logger simples com níveis e timestamps
 */
const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

function createLogger(level = 'info') {
  const currentLevel = LEVELS[level] ?? LEVELS.info;

  function formatTime() {
    return new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  }

  return {
    error: (...args) => {
      if (currentLevel >= LEVELS.error)
        console.error(`❌ [${formatTime()}]`, ...args);
    },
    warn: (...args) => {
      if (currentLevel >= LEVELS.warn)
        console.warn(`⚠️  [${formatTime()}]`, ...args);
    },
    info: (...args) => {
      if (currentLevel >= LEVELS.info)
        console.log(`ℹ️  [${formatTime()}]`, ...args);
    },
    debug: (...args) => {
      if (currentLevel >= LEVELS.debug)
        console.log(`🐛 [${formatTime()}]`, ...args);
    },
    success: (...args) => {
      console.log(`✅ [${formatTime()}]`, ...args);
    },
  };
}

module.exports = { createLogger };
