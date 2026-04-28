/**
 * email.js - Envio de emails via SMTP (Nodemailer)
 * Suporta Gmail, Office 365, ou qualquer SMTP
 */
const nodemailer = require('nodemailer');
const { config } = require('./config');
const { createLogger } = require('./logger');

const log = createLogger(config.logLevel);

const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: false,
  auth: {
    user: config.email.user,
    pass: config.email.pass,
  },
});

async function sendEmail(to, subject, html) {
  try {
    await transporter.sendMail({
      from: `"${config.email.fromName}" <${config.email.user}>`,
      to,
      subject,
      html,
    });
    log.success(`Email enviado para ${to}`);
  } catch (error) {
    log.error(`Falha ao enviar email para ${to}:`, error.message);
    throw error;
  }
}

async function sendMeetingNotification(to, meeting, recipientUser = {}) {
  const startTime = new Date(meeting.start.dateTime + 'Z').toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
  });
  const optInLink = `${config.server.dashboardUrl}/activate?meetingId=${encodeURIComponent(meeting.id)}&userId=${encodeURIComponent(recipientUser.id || '')}&email=${encodeURIComponent(to)}&subject=${encodeURIComponent(meeting.subject)}`;

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 20px; border-radius: 12px;">
      <div style="background: linear-gradient(135deg, #0078d4 0%, #00a4ef 100%); color: white; padding: 24px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 22px;">NetMeet Bot</h1>
        <p style="margin: 6px 0 0; opacity: 0.9; font-size: 14px;">Lembrete preventivo de resumo automatico</p>
      </div>

      <div style="background: white; padding: 24px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
        <h2 style="color: #333; margin-top: 0;">Reuniao detectada</h2>

        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr>
            <td style="padding: 8px 12px; background: #f0f6ff; border-radius: 6px 0 0 0; font-weight: bold; color: #555;">Titulo</td>
            <td style="padding: 8px 12px; background: #f0f6ff; border-radius: 0 6px 0 0;">${meeting.subject}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; font-weight: bold; color: #555;">Inicio</td>
            <td style="padding: 8px 12px;">${startTime}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #f0f6ff; border-radius: 0 0 0 6px; font-weight: bold; color: #555;">Organizador</td>
            <td style="padding: 8px 12px; background: #f0f6ff; border-radius: 0 0 6px 0;">${meeting.organizer?.emailAddress?.name || 'N/A'}</td>
          </tr>
        </table>

        <div style="background: #f0f6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0 0 8px; color: #1e3a8a; font-weight: bold;">Para receber o resumo automatico:</p>
          <p style="margin: 0; color: #334155; line-height: 1.6;">
            Ative a gravacao/transcricao no Teams durante a reuniao. Depois que a reuniao terminar,
            o NetMeet Bot tentara buscar a transcricao automaticamente e enviar o resumo por email.
          </p>
        </div>

        <div style="text-align: center; margin: 24px 0;">
          <a href="${optInLink}"
             style="display: inline-block; background: #0078d4; color: white; padding: 13px 24px;
                    border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px;">
            Quero receber o resumo desta reuniao
          </a>
        </div>

        <p style="color: #999; font-size: 12px; text-align: center; margin-top: 20px;">
          Regra de envio: o organizador recebe automaticamente. Participantes recebem somente se confirmarem interesse neste link.
        </p>
      </div>
    </div>
  `;

  await sendEmail(to, `Ative a transcricao se quiser resumo: ${meeting.subject}`, html);
}

async function sendMeetingSummary(to, meetingTitle, meetingDate, organizerName, summary) {
  const summaryHtml = summary
    .replace(/\n/g, '<br>')
    .replace(/#{3}\s*(.*?)$/gm, '<h3 style="color: #0078d4; margin-top: 16px;">$1</h3>')
    .replace(/#{2}\s*(.*?)$/gm, '<h2 style="color: #333;">$1</h2>')
    .replace(/#{1}\s*(.*?)$/gm, '<h1 style="color: #333;">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/- (.*?)(<br>|$)/g, '&bull; $1$2');

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 700px; margin: 0 auto; background: #f8f9fa; padding: 20px; border-radius: 12px;">
      <div style="background: linear-gradient(135deg, #0078d4 0%, #00a4ef 100%); color: white; padding: 24px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 22px;">Resumo da Reuniao</h1>
        <p style="margin: 6px 0 0; opacity: 0.9; font-size: 14px;">Gerado automaticamente pelo NetMeet Bot</p>
      </div>

      <div style="background: white; padding: 24px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 8px 12px; background: #f0f6ff; font-weight: bold; color: #555;">Reuniao</td>
            <td style="padding: 8px 12px; background: #f0f6ff;">${meetingTitle}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; font-weight: bold; color: #555;">Data</td>
            <td style="padding: 8px 12px;">${meetingDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #f0f6ff; font-weight: bold; color: #555;">Organizador</td>
            <td style="padding: 8px 12px; background: #f0f6ff;">${organizerName}</td>
          </tr>
        </table>

        <hr style="border: none; border-top: 2px solid #0078d4; margin: 20px 0;">

        <div style="line-height: 1.7; color: #333;">
          ${summaryHtml}
        </div>

        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;">

        <p style="color: #999; font-size: 12px; text-align: center;">
          Resumo gerado automaticamente pelo <strong>NetMeet Bot</strong> usando IA<br>
          ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
        </p>
      </div>
    </div>
  `;

  await sendEmail(to, `Resumo: ${meetingTitle}`, html);
}

async function sendNoRecordingNotice(to, meetingTitle) {
  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 20px; border-radius: 10px; text-align: center;">
        <h2 style="color: #856404; margin-top: 0;">Transcricao nao encontrada</h2>
        <p style="color: #856404;">
          A reuniao <strong>"${meetingTitle}"</strong> terminou, mas nao foi possivel encontrar a transcricao.<br><br>
          Possiveis motivos:<br>
          &bull; A gravacao/transcricao nao estava ativada<br>
          &bull; A transcricao ainda esta sendo processada<br>
          &bull; A reuniao foi muito curta
        </p>
        <p style="color: #999; font-size: 12px; margin-top: 16px;">NetMeet Bot</p>
      </div>
    </div>
  `;

  await sendEmail(to, `Sem transcricao: ${meetingTitle}`, html);
}

module.exports = {
  sendEmail,
  sendMeetingNotification,
  sendMeetingSummary,
  sendNoRecordingNotice,
};
