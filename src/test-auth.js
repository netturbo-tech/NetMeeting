/**
 * test-auth.js - Testa a autenticação com o Entra ID e a Graph API
 * Rode: npm run test:auth
 */
const { config, validateConfig } = require('./config');
const { createLogger } = require('./logger');
const { getGraphToken } = require('./auth');
const { callGraph } = require('./graph');

const log = createLogger(config.logLevel);

async function testAuth() {
  console.log('\n🧪 TESTE DE AUTENTICAÇÃO\n');

  // 1. Validar .env
  const errors = validateConfig();
  if (errors.length > 0) {
    console.log('❌ Configuração inválida:');
    errors.forEach((e) => console.log(`   → ${e}`));
    return;
  }
  console.log('✅ .env carregado com sucesso');

  // 2. Tentar obter token
  console.log('\n📡 Tentando autenticar no Entra ID...');
  try {
    const token = await getGraphToken();
    console.log(`✅ Token obtido! (${token.substring(0, 20)}...)`);
  } catch (err) {
    console.log(`❌ Falha na autenticação: ${err.message}`);
    console.log('\n💡 Verifique:');
    console.log('   1. AZURE_CLIENT_ID está correto');
    console.log('   2. AZURE_CLIENT_SECRET está válido (não expirado)');
    console.log('   3. AZURE_TENANT_ID está correto');
    return;
  }

  // 3. Testar chamada à Graph API
  console.log('\n📊 Testando Graph API - listando usuários...');
  const result = await callGraph('/users?$top=3&$select=displayName,mail');

  if (result.success) {
    console.log(`✅ Graph API funcionando! ${result.data.value.length} usuários:`);
    result.data.value.forEach((u) => {
      console.log(`   👤 ${u.displayName} (${u.mail || 'sem email'})`);
    });
  } else {
    console.log(`❌ Erro na Graph API: ${result.error}`);
    console.log('\n💡 Verifique as permissões do app no Entra ID:');
    console.log('   → Calendars.Read (Application)');
    console.log('   → User.Read.All (Application)');
    console.log('   → OnlineMeetings.Read.All (Application)');
    console.log('   → OnlineMeetingTranscript.Read.All (Application)');
  }

  console.log('\n🏁 Teste concluído!\n');
}

testAuth().catch(console.error);
