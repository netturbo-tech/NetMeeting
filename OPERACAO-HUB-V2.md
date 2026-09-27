# Operação do NetMeet Bot — modo Hub v2 (a partir de 27/09/2026)

> **Este é o robô ATIVO.** O do `.238` (`/opt/DESENVOLVIMENTO_E_TESTE/NetMeeting`, pm2
> `netmeet-monitor`) foi **pausado** em 27/09/2026 (`pm2 stop`, nada apagado). As demais notas
> deste repositório (NOTAS-SERVIDOR, NOTAS-PM2, PILOTO_TI) descrevem o robô antigo.

## O que mudou

Com `DELIVERY_MODE=hub` o robô:

- **não envia e-mail** (nem o lembrete de 30 min, nem o resumo) e **não usa SMTP nem IA**;
- **não exige opt-in**: todo usuário de `PILOT_USERS` recebe a ata das reuniões em que participou;
- busca a transcrição no Graph (mesma lógica de antes), converte o VTT em texto
  `Pessoa: fala` e envia ao Hub v2 (`POST /api/netmeet/meetings/ingest`, com `transcript` e
  `participants`);
- só marca a reunião como processada quando o Hub confirma; se o Hub falhar, a próxima checagem
  (5 min) busca de novo, dentro da janela `ENDED_MEETING_LOOKBACK_HOURS` (12 h).

O **Hub** gera a ata (resumo, tópicos, decisões, tarefas com responsável/prazo só quando ditos,
pendências), guarda a transcrição e avisa o usuário na própria tela (contador no menu NetMeet e
selo "Nova"). Sem `DELIVERY_MODE` (padrão `email`) o robô funciona exatamente como antes.

## Onde roda

| Item | Valor |
|---|---|
| Servidor | Hermes — `SRV-CT-Hermes-01` (10.250.116.18), SSH `:2231` |
| Código | `/opt/netmeet-bot-v2` (cópia via `git archive`, sem `.git`) |
| Configuração | `/opt/netmeet-bot-v2/.env` (permissão 600) |
| pm2 | `netmeet-bot-v2`, config `/opt/netmeet-bot-v2.pm2.config.cjs` (`TZ=America/Sao_Paulo`) |
| Logs | `pm2 logs netmeet-bot-v2` (saem no `-error.log`, é o stderr do logger) |
| Hub destino | `http://127.0.0.1:4300` (Hub v2, zona núcleo) |

`.env` necessário: `DELIVERY_MODE=hub`, `HUB_API_URL`, `HUB_API_KEY` (= `NETMEET_BOT_API_KEY`
do Hub), `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID`, `PILOT_USERS`.
**Nunca** exibir o `.env` (conferir por contagem: `grep -c '^AZURE_CLIENT_SECRET=.' .env`).

## Tarefas comuns

**Atualizar o código** (depois de commit + push aqui):
```bash
# na máquina com o repo
git archive --format=tar HEAD | ssh -p 2231 root@10.250.116.18 'cd /opt/netmeet-bot-v2 && tar -xf -'
# no Hermes, se o package-lock mudou:
cd /opt/netmeet-bot-v2 && npm ci --omit=dev --cache /opt/.npm-cache
pm2 restart netmeet-bot-v2
```

**Incluir uma pessoa:**
1. Política do Teams (igual antes): `Grant-CsApplicationAccessPolicy -PolicyName "NetMeetBotPolicy" -Identity "<email>"`
   (pode levar até ~30 min para valer).
2. No Hermes: acrescentar o e-mail em `PILOT_USERS` no `/opt/netmeet-bot-v2/.env` (backup antes) e
   `pm2 restart netmeet-bot-v2 --update-env`.
3. Validar: `cd /opt/netmeet-bot-v2 && node src/diagnose.js <email>`.

**Retirar uma pessoa:** tirar de `PILOT_USERS` e reiniciar (a política do Teams pode ficar).

**Conferir se uma reunião virou ata:** nos logs, a reunião aparece como encerrada, depois
"Resumo salvo no Hub"; no Hub, a linha nasce com `provider = teams-transcript` e passa a
`hub-ata` quando a ata é gravada (segundos depois).

## Voltar ao robô antigo (rollback)

```bash
# Hermes
pm2 stop netmeet-bot-v2
# .238 (como root)
pm2 start netmeet-monitor
```
Os dois ligados juntos não duplicam atas (mesma linha por `external_id`), mas o resumo do robô
antigo grava por cima da ata gerada pelo Hub. Por isso, só um ligado de cada vez.

⚠️ Se o `.238` reiniciar, conferir se o pm2 não religou o `netmeet-monitor`.

## Pendências

- Transcrição automática no Teams (administração do Microsoft 365; alguns recursos exigem Teams Premium).
- Na virada do Hub: desligar de vez o robô do `.238` (e o `netmeet-dashboard`, página do opt-in).
