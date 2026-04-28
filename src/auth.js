/**
 * auth.js - Autenticação com Microsoft Graph via MSAL
 * Usa Client Credentials (app-only, sem login de usuário)
 */
const { ConfidentialClientApplication } = require('@azure/msal-node');
const { config } = require('./config');
const { createLogger } = require('./logger');

const log = createLogger(config.logLevel);

const msalConfig = {
  auth: {
    clientId: config.azure.clientId,
    authority: `https://login.microsoftonline.com/${config.azure.tenantId}`,
    clientSecret: config.azure.clientSecret,
  },
};

const cca = new ConfidentialClientApplication(msalConfig);

/**
 * Obtém token de acesso para a Graph API
 * @returns {Promise<string>} Access token
 */
async function getGraphToken() {
  try {
    const result = await cca.acquireTokenByClientCredential({
      scopes: ['https://graph.microsoft.com/.default'],
    });
    log.debug('Token obtido com sucesso');
    return result.accessToken;
  } catch (error) {
    log.error('Falha ao obter token:', error.message);
    throw new Error(`Falha de autenticação: ${error.message}`);
  }
}

module.exports = { getGraphToken };
