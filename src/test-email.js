/**
 * test-email.js - Testa o envio de email via SMTP
 * Rode: npm run test:email
 */
const { config, validateConfig } = require('./config');
const { sendEmail } = require('./email');

async function testEmail() {
  console.log('\n🧪 TESTE DE EMAIL\n');

  const errors = validateConfig();
  if (errors.length > 0) {
    console.log('❌ Configuração inválida:');
    errors.forEach((e) => console.log(`   → ${e}`));
    return;
  }

  const to = config.email.user; // Envia para si mesmo
  console.log(`📧 Enviando email de teste para: ${to}`);

  try {
    await sendEmail(
      to,
      '🧪 Teste NetMeet Bot',
      `
      <div style="font-family: Arial; padding: 20px; text-align: center;">
        <h2>✅ Email funcionando!</h2>
        <p>Se você está lendo isso, o SMTP está configurado corretamente.</p>
        <p style="color: #999; font-size: 12px;">
          Enviado em: ${new Date().toLocaleString('pt-BR')}<br>
          Host: ${config.email.host}:${config.email.port}
        </p>
      </div>
      `
    );
    console.log('✅ Email enviado! Verifique sua caixa de entrada.');
  } catch (err) {
    console.log(`❌ Falha no envio: ${err.message}`);
    console.log('\n💡 Para Gmail:');
    console.log('   1. Ative "Acesso a apps menos seguros" ou use App Password');
    console.log('   2. Vá em: https://myaccount.google.com/apppasswords');
    console.log('   3. Gere uma senha e use no SMTP_PASS');
  }

  console.log('\n🏁 Teste concluído!\n');
}

testEmail().catch(console.error);
