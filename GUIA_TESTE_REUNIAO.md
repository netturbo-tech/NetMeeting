# Guia de Teste - NetMeet Bot

Este guia cobre os dois testes atuais:

1. `node src/index.js ...` para validar o processamento pos-reuniao.
2. `npm run monitor` para validar o lembrete preventivo e o processamento automatico.

## Objetivo

Validar se o bot consegue:

1. Autenticar no Microsoft Graph.
2. Encontrar o usuario pelo email.
3. Ler o calendario do usuario.
4. Identificar reunioes Teams proximas e encerradas.
5. Buscar a transcricao da reuniao.
6. Gerar resumo com IA.
7. Enviar os emails esperados.

## Teste 1 - Pos-Reuniao

Use este comando para um teste controlado:

```powershell
cd "C:\Users\alan.moreira\Documents\00 - 2026\15 - PROJETO IA NETTURBO\08 - RESUMO DE REUNIOES APP\TESTE"
node src/index.js alan.moreira@netturbo.com.br
```

Esse fluxo procura reunioes Teams encerradas nas ultimas 8 horas (configuravel via `ENDED_MEETING_LOOKBACK_HOURS`).

### Resultado esperado

Se a reuniao terminou e a transcricao ja estiver pronta:

```text
1 reuniao Teams recente
Transcricao encontrada
Gerando resumo com IA
Resumo enviado por email
```

Se ainda nao houver transcricao:

```text
Transcricao nao disponivel
```

## Teste 2 - Monitor Preventivo

Use este comando:

```powershell
cd "C:\Users\alan.moreira\Documents\00 - 2026\15 - PROJETO IA NETTURBO\08 - RESUMO DE REUNIOES APP\TESTE"
npm run monitor
```

### Pre-condicoes

- O usuario precisa estar em `PILOT_USERS`.
- O usuario precisa ter `Grant-CsApplicationAccessPolicy`.
- A reuniao precisa ser do Microsoft Teams.
- Deve existir uma reuniao marcada para os proximos 30 minutos, ou uma reuniao em andamento que tenha comecado dentro da janela `ACTIVE_MEETING_LOOKBACK_MINUTES`.

### Resultado esperado

1. O monitor identifica a reuniao futura.
2. O usuario recebe um email preventivo pedindo ativacao de gravacao/transcricao.
3. O organizador ja fica elegivel para receber o resumo.
4. Participantes recebem somente se clicarem em `Quero receber o resumo desta reuniao`.
5. Depois que a reuniao termina, o monitor tenta buscar a transcricao automaticamente.
6. Quando a transcricao estiver pronta, o resumo e enviado por email para organizador + participantes com opt-in.

Para testar opt-in de participantes, mantenha tambem a dashboard ativa:

```powershell
npm run dashboard
```

Para testes na sua maquina, `DASHBOARD_URL=http://localhost:3000` funciona. Para outros usuarios clicarem no link do email, a dashboard precisa rodar em um endereco acessivel para eles, por exemplo `http://IP-DA-MAQUINA:3000`.

## Quando Rodar

Para `index.js`, rode alguns minutos depois do fim da reuniao.

Exemplo:

- Reuniao: `Daily TI`
- Horario: `09:30 - 10:00`

Melhor horario de teste:

```text
entre 10:05 e 10:15
```

Isso da tempo para o Teams processar a transcricao.

## Pre-condicoes da Reuniao

Para o resumo funcionar:

- precisa ser reuniao agendada do Teams (criada pelo botao **"Nova reuniao"** no calendario do Teams — reunioes de canal e Meet Now nao tem `joinUrl` e sao ignoradas);
- precisa estar no calendario do usuario autorizado;
- precisa ter terminado;
- precisa ter **transcricao** habilitada (diferente de gravacao — durante a reuniao: `...` → **Iniciar transcricao**);
- a transcricao precisa estar disponivel na Graph API (Teams pode levar de 5 a 60 minutos para processar);
- para participantes, precisa existir opt-in pelo link do email preventivo.

## Como Interpretar o Output

### Usuario encontrado

```text
Buscando usuario especifico: alan.moreira@netturbo.com.br
1 usuario(s) na fila de processamento
```

### Nenhuma reuniao encontrada

```text
0 reunioes Teams recentes
Processamento concluido! 0 resumos enviados.
```

Possiveis causas:

- a reuniao ainda nao terminou;
- terminou ha mais de 8 horas (janela padrao configurada em `ENDED_MEETING_LOOKBACK_HOURS`);
- nao foi identificada como Teams (sem `joinUrl` — reunioes de canal, Meet Now e eventos Outlook sao ignorados; aparece como aviso no log);
- e uma reuniao recorrente e o monitor usa `/calendar/events` em vez de `/calendarView` (corrigido na v1.1.0);
- o calendario nao e o esperado.

### Reuniao encontrada, mas sem transcricao

```text
Transcricao nao disponivel
```

Possiveis causas:

- gravacao/transcricao nao ativada;
- Teams ainda processando;
- permissao de transcript faltando;
- policy do Teams ainda nao propagou.
- a reuniao foi organizada por outro usuario; nesse caso o bot tenta resolver a transcricao pelo organizador da reuniao, que tambem precisa estar liberado pela policy.

## Permissoes Necessarias

No Entra ID:

- `User.Read.All`
- `Calendars.Read`
- `OnlineMeetings.Read.All`
- `OnlineMeetingTranscript.Read.All`

No Teams:

- `Application Access Policy` aplicada ao usuario de teste.

## Exemplo de Liberacao

```powershell
Grant-CsApplicationAccessPolicy `
  -PolicyName "NetMeetBotPolicy" `
  -Identity "alan.moreira@netturbo.com.br"
```

## Cuidado com `npm start`

```powershell
npm start
```

Esse modo pode processar muitos usuarios. Para teste, prefira:

```powershell
node src/index.js alan.moreira@netturbo.com.br
```

Ou:

```powershell
npm run monitor
```
