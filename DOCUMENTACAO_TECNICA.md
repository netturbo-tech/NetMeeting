# DOCUMENTAÇÃO TÉCNICA - NETMEET BOT (Node.js)

**Versão:** 1.3.0
**Data:** 28/04/2026
**Autor:** Equipe Netturbo
**Status:** Piloto ativo — 9 usuários monitorados, PM2 configurado, Application Access Policy global

---

## 1. Visão Geral

O **NetMeet Bot** é um sistema automatizado de resumo de reuniões do Microsoft Teams, construído em Node.js. Opera **sem Azure Bot Framework** e **sem assinatura Azure adicional**, utilizando apenas recursos já disponíveis no Microsoft 365 E5 e Entra ID.

### 1.1 O Que o Sistema Faz

1. **Monitora calendários** dos usuários-piloto via Microsoft Graph API (a cada 5 min)
2. **Detecta reuniões próximas** e envia email preventivo com pedido de ativação de transcrição
3. **Permite opt-in** via botão no email (link para dashboard web)
4. **Busca transcrições** automaticamente após o término da reunião (Graph API Beta)
5. **Converte VTT → texto limpo** com falantes identificados antes de enviar à IA
6. **Gera resumo profissional** com OpenAI (participantes, decisões, action items, próximos passos)
7. **Envia o resumo por email** com template HTML formatado

### 1.2 Pré-requisitos de Licença

| Recurso | Onde está | Licença necessária |
|---------|-----------|-------------------|
| App Registration + Graph API | Microsoft Entra ID | Incluso no M365 E5 |
| Gravação/Transcrição no Teams | Microsoft Teams | Incluso no M365 E5 |
| OpenAI GPT-4o-mini | API da OpenAI | Pay-as-you-go (~R$0,15/reunião) |
| SMTP para email | Gmail ou Office 365 | Grátis |
| Servidor do bot | Computador local / VM | Grátis (usa o PC do Alan) |

> ✅ **Não é necessária uma assinatura Azure separada.** O Entra ID está incluso no M365 E5.

---

## 2. Arquitetura

### 2.1 Fluxo Completo

```
┌─────────────────────────────────────────────────────────────────┐
│                     NETMEET BOT — FLUXO                         │
│                                                                 │
│  ┌──────────┐   a cada 5 min   ┌──────────────────────────┐    │
│  │  PM2     │ ──────────────>  │  monitor.js (loop)       │    │
│  │ (2 proc) │                  └──────────┬───────────────┘    │
│  └──────────┘                             │                    │
│                                           ▼                    │
│                              graph.js — calendarView API        │
│                              (expande reuniões recorrentes)     │
│                                           │                    │
│                          ┌────────────────┴──────────────┐     │
│                          ▼                               ▼     │
│                   Reunião nos          Reunião encerrada        │
│                   próximos 30 min      (últimas 8h)             │
│                          │                               │     │
│                          ▼                               ▼     │
│               Email preventivo          Organizador? → Sim     │
│               + link opt-in             Opt-in clicado? → Sim  │
│                          │                               │     │
│                          ▼                               ▼     │
│               dashboard.js:3000        Busca transcrição VTT   │
│               /activate                (Graph API beta)         │
│               (registra opt-in)                │               │
│                                               ▼               │
│                                    parseVttToText()            │
│                                    (remove timestamps,         │
│                                     identifica falantes)       │
│                                               │               │
│                                               ▼               │
│                                    OpenAI GPT-4o-mini          │
│                                    (até 80k chars)             │
│                                               │               │
│                                               ▼               │
│                                    Email com resumo            │
│                                    (participantes, decisões,   │
│                                     action items, etc.)        │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Regra de Envio do Resumo

| Papel na reunião | Recebe o resumo? |
|-----------------|-----------------|
| Organizador | ✅ Automaticamente, sem precisar clicar em nada |
| Participante que clicou no botão de opt-in | ✅ Sim |
| Participante que não clicou | ❌ Não |
| Pessoas fora do PILOT_USERS | ❌ Não (nesta fase do piloto) |

### 2.3 Modos de Operação

| Modo | Comando | Uso |
|------|---------|-----|
| **PM2 (produção)** | `pm2 start ecosystem.config.js` | Sobe monitor + dashboard de uma vez, com reinício automático |
| **Monitor manual** | `npm run monitor` | Loop contínuo sem PM2 |
| **Dashboard manual** | `npm run dashboard` | Servidor web sem PM2 |
| **Execução única** | `node src/index.js email@empresa.com` | Processa reuniões recentes de um usuário |
| **Diagnóstico** | `node src/diagnose.js email@empresa.com` | Vê o que o bot está vendo no calendário |
| **Resumo forçado** | `node src/force-summary.js email@empresa.com [horas]` | Processa resumo sem depender de opt-in |

---

## 3. Estrutura de Arquivos

```
TESTE/
├── .env                      # Credenciais (NÃO versionar)
├── .env.example              # Modelo de configuração
├── .gitignore
├── package.json              # Dependências e 8 scripts npm
├── ecosystem.config.js       # Configuração do PM2 (monitor + dashboard)
├── README.md                 # Guia rápido
├── DOCUMENTACAO_TECNICA.md   # Este arquivo
├── PONTO_RECUPERACAO.md      # Estado atual + como retomar
│
├── src/
│   ├── config.js             # Carregamento e validação do .env
│   ├── logger.js             # Logger com níveis e timestamps BR
│   ├── auth.js               # Autenticação MSAL (Client Credentials)
│   ├── graph.js              # Chamadas à Microsoft Graph API
│   ├── email.js              # Templates HTML e envio SMTP
│   ├── summarizer.js         # Conversão VTT + geração de resumo OpenAI
│   ├── store.js              # Persistência JSON (processed-meetings.json)
│   ├── index.js              # Execução única
│   ├── monitor.js            # Monitor contínuo (loop)
│   ├── dashboard.js          # Servidor web de opt-in (Express)
│   ├── diagnose.js           # Diagnóstico do dia para um usuário
│   ├── force-summary.js      # Processamento manual de resumo
│   ├── test-auth.js          # Teste de autenticação Entra ID
│   └── test-email.js         # Teste de envio de email
│
├── data/
│   └── processed-meetings.json  # Estado: notificados, opt-ins, processados
│
└── logs/
    ├── monitor.log           # Logs do monitor (PM2)
    ├── monitor-error.log     # Erros do monitor (PM2)
    ├── dashboard.log         # Logs do dashboard (PM2)
    └── dashboard-error.log   # Erros do dashboard (PM2)
```

---

## 4. Módulos — Documentação Detalhada

### 4.1 config.js

Carrega variáveis do `.env` e exporta objeto `config` com valores padrão.

| Grupo | Variáveis | Padrão |
|-------|-----------|--------|
| `config.azure` | `clientId`, `clientSecret`, `tenantId` | — (obrigatório) |
| `config.openai` | `apiKey`, `model` | modelo: `gpt-4o-mini` |
| `config.email` | `host`, `port`, `user`, `pass`, `fromName` | `smtp.gmail.com:587` |
| `config.server` | `port`, `dashboardUrl` | `3000`, `http://localhost:3000` |
| `config.monitor` | `checkIntervalMinutes`, `activeMeetingLookBackMinutes`, `endedMeetingLookBackHours` | 5 min / 60 min / 8h |
| `config.pilotUsers` | Lista de emails | Lê `PILOT_USERS` do .env |

---

### 4.2 logger.js

Logger com emojis, timestamps no fuso `America/Sao_Paulo` e filtragem por nível.

| Nível | Emoji | Visível quando LOG_LEVEL= |
|-------|-------|--------------------------|
| `error` | ❌ | sempre |
| `warn` | ⚠️ | warn, info, debug |
| `info` | ℹ️ | info, debug |
| `debug` | 🐛 | debug |
| `success` | ✅ | sempre |

Para ver mais detalhes durante troubleshooting, defina `LOG_LEVEL=debug` no `.env`.

---

### 4.3 auth.js

Autentica o app no Entra ID via **Client Credentials Grant** (OAuth 2.0, sem login de usuário).

- Scope: `https://graph.microsoft.com/.default`
- Export: `getGraphToken()` → `Promise<string>`

---

### 4.4 graph.js

Encapsula todas as chamadas à Microsoft Graph API.

| Função | Descrição | API |
|--------|-----------|-----|
| `callGraph(endpoint, version)` | GET genérico com autenticação | v1.0 / beta |
| `findUserByEmail(email)` | Busca usuário por email sem varrer o tenant | v1.0 |
| `getUserEvents(userId, start, end)` | Eventos via `calendarView` (expande recorrentes) | v1.0 |
| `getActiveOrUpcomingTeamsMeetings(userId, lookBackMin, hoursAhead)` | Reuniões em andamento ou próximas | v1.0 |
| `getRecentlyEndedMeetings(userId, hoursBack)` | Reuniões encerradas | v1.0 |
| `findOnlineMeetingByJoinUrl(userId, joinUrl)` | Resolve `onlineMeeting` pelo joinUrl | v1.0 |
| `getMeetingTranscript(userId, meetingId, meetingStartTime?)` | Lista e baixa transcrição (VTT); filtra por `meetingStartTime` para reuniões recorrentes | **beta** |
| `getMeetingTranscriptForEvent(calendarUser, meeting)` | Orquestra tentativas: organizador → usuário do calendário → fallback | **beta** |

**Filtros automáticos:** Apenas eventos com `onlineMeeting.joinUrl`. Reuniões de canal, Meet Now e eventos Outlook sem link Teams são ignorados com aviso no log.

> ⚠️ **Reuniões recorrentes:** Sempre use `calendarView` (não `/calendar/events` com `$filter`) — o `calendarView` expande cada ocorrência da série individualmente.

> ⚠️ **Transcrições de reuniões recorrentes:** Uma mesma "sala" Teams acumula transcrições de todas as ocorrências anteriores. `getMeetingTranscript` filtra pelo campo `createdDateTime >= meetingStartTime` e pega a ocorrência mais recente que atenda ao critério. Se nenhuma atender (ex.: transcrição ainda não gerada), usa a mais recente como fallback.

---

### 4.5 email.js

Envio de emails HTML via Nodemailer (SMTP).

| Função | Quando |
|--------|--------|
| `sendMeetingNotification(to, meeting, user)` | ~30 min antes da reunião |
| `sendMeetingSummary(to, title, date, organizer, summary)` | Após geração do resumo |
| `sendNoRecordingNotice(to, title)` | Transcrição não encontrada |

O link de opt-in no email preventivo aponta para `${DASHBOARD_URL}/activate?meetingId=...&userId=...&email=...`.

---

### 4.6 summarizer.js _(atualizado em v1.2.0)_

Converte a transcrição VTT em texto limpo e gera o resumo com OpenAI.

**Função `parseVttToText(vtt)`:**
- Remove timestamps, índices e tags HTML do formato WebVTT
- Extrai nome do falante de `<v Nome>` → formato `Nome: fala`
- Mescla falas consecutivas do mesmo falante
- Resultado: texto compacto com todos os participantes identificados

**Impacto da melhoria:**

| | Antes (v1.1.0) | Depois (v1.2.0) |
|--|----------------|-----------------|
| Formato enviado à IA | VTT bruto | Texto limpo `Falante: fala` |
| Limite de caracteres | 12.000 | 80.000 |
| % da transcrição enviada | ~29% | ~100% |
| Participantes capturados | Só quem falou no início | Todos os falantes |

**Seções do resumo gerado:**
```
## 👥 Participantes
## 📋 Resumo Executivo
## 🎯 Decisões Tomadas
## ✅ Action Items
## 📅 Próximos Passos
## ❓ Pontos de Atenção
```

**Parâmetros OpenAI:** model `gpt-4o-mini`, temperature `0.2`, max_tokens `3000`.

---

### 4.7 store.js

Persistência em JSON (`data/processed-meetings.json`) para evitar reenvios após reinicializações.

| Coleção | Chave | Para quê |
|---------|-------|----------|
| `notifiedMeetings` | `userId:meetingId` | Reuniões que já receberam o email preventivo |
| `optedInMeetings` | `userId:meetingId` | Participantes que clicaram no botão de opt-in |
| `processedMeetings` | `userId:meetingId` | Reuniões que já tiveram o resumo enviado |

---

### 4.8 monitor.js _(atualizado em v1.2.0)_

Loop contínuo com checagem a cada `CHECK_INTERVAL_MINUTES` (padrão: 5 min).

**Logs melhorados em v1.2.0 — agora mostra explicitamente:**
- Quando nenhuma reunião é encontrada na janela
- Quando notificação já foi enviada (e por isso está pulando)
- Quando participante não tem opt-in (e por isso não receberá o resumo)
- Quando resumo já foi processado anteriormente

---

### 4.9 dashboard.js

Servidor Express na porta `3000` com dois endpoints:

| Rota | Descrição |
|------|-----------|
| `GET /` | Página inicial do dashboard |
| `GET /activate?meetingId=&userId=&email=&subject=` | Registra opt-in e exibe confirmação |

Quando o participante clica no botão do email, é redirecionado para `/activate`, que chama `markMeetingOptIn()` no store e exibe uma página de confirmação.

---

### 4.10 diagnose.js _(novo em v1.2.0)_

Script de diagnóstico que mostra o que o bot está vendo para um usuário em um determinado dia.

**Uso:**
```powershell
node src/diagnose.js alan.moreira@netturbo.com.br
# ou
npm run diagnose
```

**O que exibe:**
- Todos os eventos nas últimas 12h e próximas 12h
- Quais têm `joinUrl` (são Teams) e quais foram filtrados
- Para reuniões encerradas: tenta resolver o `onlineMeeting` e verificar se há transcrição disponível
- Diagnóstico de erros 403 (Application Access Policy)

---

### 4.11 force-summary.js _(novo em v1.2.0)_

Processa manualmente o resumo de reuniões, ignorando opt-in e checagem de "já processado". Útil quando o email preventivo não foi enviado ou o opt-in não aconteceu.

**Uso:**
```powershell
# Últimas 10 horas (padrão)
node src/force-summary.js alan.moreira@netturbo.com.br

# Últimas 13 horas (reunião mais antiga)
node src/force-summary.js alan.moreira@netturbo.com.br 13
```

**Fluxo:** busca reuniões Teams encerradas → resolve `onlineMeeting` → baixa transcrição → gera resumo → envia email.

---

### 4.12 ecosystem.config.js _(novo em v1.2.0)_

Configuração do PM2 para subir monitor e dashboard com um único comando.

```powershell
pm2 start ecosystem.config.js   # sobe os dois processos
pm2 status                       # ver status
pm2 logs                         # ver logs em tempo real
pm2 restart all                  # reiniciar após mudança de código
```

Logs gravados em `logs/monitor.log`, `logs/monitor-error.log`, `logs/dashboard.log`, `logs/dashboard-error.log`.

---

## 5. Variáveis de Ambiente (.env)

### Obrigatórias

| Variável | Descrição |
|----------|-----------|
| `AZURE_CLIENT_ID` | ID do App Registration no Entra ID |
| `AZURE_CLIENT_SECRET` | Segredo do App (gerar no Entra ID, expira em 24 meses) |
| `AZURE_TENANT_ID` | ID do tenant Microsoft 365 |
| `OPENAI_API_KEY` | Chave da API OpenAI |
| `SMTP_USER` | Email do remetente |
| `SMTP_PASS` | Senha ou App Password do email |

### Opcionais (com padrões)

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `OPENAI_MODEL` | `gpt-4o-mini` | Modelo da OpenAI |
| `SMTP_HOST` | `smtp.gmail.com` | Servidor SMTP |
| `SMTP_PORT` | `587` | Porta SMTP |
| `EMAIL_FROM_NAME` | `NetMeet Bot` | Nome exibido no remetente |
| `PORT` | `3000` | Porta do dashboard |
| `DASHBOARD_URL` | `http://localhost:3000` | URL base para os links de opt-in nos emails |
| `CHECK_INTERVAL_MINUTES` | `5` | Intervalo do monitor em minutos |
| `ACTIVE_MEETING_LOOKBACK_MINUTES` | `60` | Minutos para trás ao buscar reuniões em andamento |
| `ENDED_MEETING_LOOKBACK_HOURS` | `8` | Horas para trás ao buscar reuniões encerradas |
| `PILOT_USERS` | — | Emails separados por vírgula/ponto-e-vírgula. Quando preenchido, só monitora esses usuários |
| `LOG_LEVEL` | `info` | Nível de log: `error`, `warn`, `info`, `debug` |

> 💡 `DASHBOARD_URL` deve ser o IP/hostname acessível pelos outros usuários do piloto, não `localhost`. Exemplo: `http://10.200.16.107:3000`

---

## 6. Permissões do Microsoft Entra ID

Permissões **Application** (não Delegated) necessárias:

| Permissão | Para quê |
|-----------|----------|
| `User.Read.All` | Buscar usuários do tenant por email |
| `Calendars.Read` | Ler calendários e eventos dos usuários |
| `OnlineMeetings.Read.All` | Acessar dados das reuniões Teams |
| `OnlineMeetingTranscript.Read.All` | Baixar transcrições |

> ⚠️ Após adicionar, clique em **"Grant admin consent"** no portal do Entra ID.

**Portal:** https://entra.microsoft.com → App registrations → NetMeet Bot → API permissions

---

## 7. Instalação e Configuração do PM2 no Windows

### 7.1 Primeira Vez (instalação completa)

```powershell
# 1. Instalar dependências do projeto
cd "C:\Users\alan.moreira\Documents\00 - 2026\15 - PROJETO IA NETTURBO\08 - RESUMO DE REUNIÕES APP\TESTE"
npm install

# 2. Testar antes de subir
npm run test:auth
npm run test:email

# 3. Instalar PM2 e plugin de startup para Windows
npm install -g pm2
npm install -g pm2-windows-startup
pm2-startup install

# 4. Subir os processos
pm2 start ecosystem.config.js

# 5. Salvar estado (para autostart no boot)
pm2 save
```

### 7.2 Dia a Dia

```powershell
pm2 status              # ver se está rodando
pm2 logs                # ver logs em tempo real
pm2 restart all         # reiniciar após atualização de código
```

### 7.3 Quando Algo der Errado

```powershell
# Ver os últimos erros
pm2 logs netmeet-monitor --lines 50

# Rodar diagnóstico completo
node src/diagnose.js alan.moreira@netturbo.com.br

# Forçar processamento de uma reunião
node src/force-summary.js alan.moreira@netturbo.com.br 13

# Testar autenticação
npm run test:auth
```

---

## 8. Troubleshooting

| Sintoma | Causa provável | Solução |
|---------|---------------|---------|
| Bot não detecta a Daily (recorrente) | Uso de `/calendar/events` com `$filter` | Corrigido em v1.1.0 — `calendarView` |
| Email preventivo não chegou | Monitor não estava rodando antes da janela de 30 min | Usar `force-summary.js` para processar manualmente |
| Resumo capturou só 2-3 pessoas | Transcrição truncada em 12k chars | Corrigido em v1.2.0 — parser VTT + limite 80k |
| Botão do email dá erro de conexão | Dashboard não está rodando em `:3000` | `pm2 status` → subir dashboard |
| Resumo da Daily é do dia anterior | Reunião recorrente — `getMeetingTranscript` pegava a transcrição mais antiga | Corrigido em v1.3.0 — filtro por `meetingStartTime` |
| `403 No application access policy found` | Teams policy não configurada para o usuário específico | Aplicar `Grant-CsApplicationAccessPolicy -PolicyName NetMeetBotPolicy -Global` |
| `Transcrição não disponível` | Reunião não foi gravada / transcrição ainda processando | Ativar transcrição no Teams; aguardar 5-10 min |
| `Falha de autenticação` | Client secret expirado | Gerar novo secret no Entra ID |
| `429 Too Many Requests` (OpenAI) | Rate limit | Aguardar ou fazer upgrade do plano |

---

## 8.1 Application Access Policy (Teams)

O bot usa permissões **Application** (app-only, sem login de usuário). Para acessar os dados de `onlineMeetings` e `transcripts` de qualquer usuário, é obrigatório que o App Registration esteja associado a uma **Application Access Policy** no Teams.

### Configurar (uma vez por tenant)

```powershell
# Requer módulo MicrosoftTeams instalado
Install-Module MicrosoftTeams -Force
Connect-MicrosoftTeams  # Login com conta de administrador Teams

# Criar a policy (se ainda não existir)
New-CsApplicationAccessPolicy -Identity NetMeetBotPolicy -AppIds "b1c9406b-6cc4-4419-9a14-2430c8a44133" -Description "NetMeet Bot acesso a reunioes"

# Aplicar globalmente a todos os usuários do tenant
Grant-CsApplicationAccessPolicy -PolicyName NetMeetBotPolicy -Global
```

> ✅ Aplicada globalmente em 28/04/2026. Sem isso, o bot recebe `403 No application access policy found` ao tentar acessar `onlineMeetings` ou `transcripts`.

---

## 9. Endpoints da Graph API Utilizados

| Endpoint | Versão | Uso |
|----------|--------|-----|
| `GET /users?$filter=mail eq '...'` | v1.0 | Buscar usuário por email |
| `GET /users/{id}/calendarView?startDateTime=...&endDateTime=...` | v1.0 | Buscar eventos (expande recorrentes) |
| `GET /users/{id}/onlineMeetings?$filter=joinWebUrl eq '...'` | v1.0 | Resolver onlineMeeting pelo joinUrl |
| `GET /users/{id}/onlineMeetings/{id}/transcripts` | **beta** | Listar transcrições disponíveis |
| `GET /.../transcripts/{id}/content?$format=text/vtt` | **beta** | Baixar conteúdo em formato VTT |

> ⚠️ Endpoints `beta` podem mudar sem aviso pela Microsoft.

---

## 10. Histórico de Alterações

### v1.3.0 — 28/04/2026

**Problema 1 identificado:** Reuniões recorrentes (ex.: Daily TI) compartilham a mesma "sala" Teams. O bot estava sempre pegando a primeira transcrição da lista, que era da ocorrência anterior (ontem), não da atual.

**Problema 2 identificado:** Erros `403 No application access policy found` para usuários organizadores — a Application Access Policy existia mas não estava aplicada globalmente.

| Arquivo | Alteração |
|---------|-----------|
| `src/graph.js` | `getMeetingTranscript()` recebe novo parâmetro opcional `meetingStartTime`. Quando fornecido, filtra as transcrições disponíveis mantendo apenas as com `createdDateTime >= meetingStartTime`, ordena decrescente e usa a mais recente. Fallback para mais recente disponível se nenhuma passar no filtro. `getMeetingTranscriptForEvent()` atualizado para passar `meeting.start.dateTime` em todas as chamadas internas. |
| `src/force-summary.js` | Atualizado para passar `meeting.start?.dateTime` como `meetingStartTime` ao chamar `getMeetingTranscript()`. |
| Teams / Entra ID | `Grant-CsApplicationAccessPolicy -PolicyName NetMeetBotPolicy -Global` aplicado — elimina 403 para todos os organizadores do tenant sem precisar aplicar policy por usuário individualmente. |

### v1.2.0 — 27/04/2026

**Problema identificado:** O resumo capturava apenas os falantes do início da reunião. Causa: transcrição VTT sendo truncada em 12.000 chars brutos — apenas ~29% do conteúdo real de uma reunião de 30 min.

| Arquivo | Alteração |
|---------|-----------|
| `src/summarizer.js` | Adicionada função `parseVttToText()`: converte WebVTT em `Falante: texto`, remove timestamps e tags, mescla falas consecutivas do mesmo falante. Limite aumentado de 12k para 80k chars. Prompt atualizado com seção "👥 Participantes" e instrução explícita para analisar transcrição completa. Temperature reduzida de 0.3 para 0.2. Max tokens aumentado de 2500 para 3000. |
| `src/monitor.js` | Adicionados logs detalhados: exibe quando nenhuma reunião é encontrada, quando notificação já foi enviada e quando participante não tem opt-in — eliminando "caixas pretas" no comportamento do monitor. |
| `src/diagnose.js` | **Novo arquivo.** Script de diagnóstico que mostra todos os eventos do calendário de um usuário, quais têm joinUrl, quais foram filtrados e se a transcrição está disponível para reuniões encerradas. |
| `src/force-summary.js` | **Novo arquivo.** Processa manualmente o resumo de qualquer reunião encerrada, ignorando opt-in. Útil quando o email preventivo não chegou ou o opt-in não aconteceu. Aceita número de horas como segundo argumento. |
| `ecosystem.config.js` | **Novo arquivo.** Configuração PM2 para subir `netmeet-monitor` e `netmeet-dashboard` com um único comando, com reinício automático e logs gravados em `logs/`. |
| `logs/` | **Nova pasta.** Criada para receber os arquivos de log do PM2. |
| `package.json` | Adicionados scripts `diagnose` e `force-summary`. |

### v1.1.0 — 27/04/2026

| Arquivo | Alteração |
|---------|-----------|
| `src/graph.js` | `getUserEvents` migrado para `/calendarView` — corrige detecção de reuniões recorrentes (dailys, weeklys). Adicionado log de aviso para eventos sem `joinUrl`. |
| `src/monitor.js` | `processEndedMeetings` — lookback de reuniões encerradas configurável via `config.monitor.endedMeetingLookBackHours` (antes hardcoded em 2h). |
| `src/config.js` | Adicionado `endedMeetingLookBackHours`. Padrão `checkIntervalMinutes` alterado de 15 para 5. |

### v1.0.0 — 23/04/2026

Criação do projeto. MVP completo com autenticação MSAL, Graph API, geração de resumo OpenAI, envio de email, dashboard de opt-in e monitor contínuo.

---

*Última atualização: 28/04/2026 — v1.3.0*
