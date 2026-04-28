# PONTO DE RECUPERAÇÃO - NETMEET BOT (Node.js)

**Data:** 28/04/2026
**Versão:** 1.3.0
**Status:** Piloto ativo — 9 usuários monitorados, Application Access Policy aplicada globalmente

---

## Como Subir Tudo do Zero (Retomada Rápida)

```powershell
# 1. Entrar na pasta
cd "C:\Users\alan.moreira\Documents\00 - 2026\15 - PROJETO IA NETTURBO\08 - RESUMO DE REUNIÕES APP\TESTE"

# 2. Verificar se os processos já estão rodando
pm2 status

# 3. Se não estiverem rodando, subir com PM2
pm2 start ecosystem.config.js

# 4. Salvar estado (para o Windows reiniciar automaticamente no próximo boot)
pm2 save

# 5. Ver logs em tempo real
pm2 logs
```

Se o PM2 não estiver instalado ainda:
```powershell
npm install -g pm2
npm install -g pm2-windows-startup
pm2-startup install
```

---

## O Que Está Rodando (Dois Processos)

| Processo PM2 | Script | Porta | Para quê |
|---|---|---|---|
| `netmeet-monitor` | `src/monitor.js` | — | Detecta reuniões, busca transcrições, envia emails |
| `netmeet-dashboard` | `src/dashboard.js` | 3000 | Recebe cliques do botão de opt-in dos emails |

> ⚠️ **Ambos precisam estar online.** Se o dashboard cair, o botão "Quero receber o resumo" nos emails vai dar erro de conexão e o opt-in não será registrado.

---

## Fluxo Completo do Bot (Do Início ao Fim)

```
1. Monitor roda a cada 5 minutos
2. Para cada um dos 9 usuários do .env (PILOT_USERS):
   a. Busca reuniões Teams nos próximos 30 min (ou em andamento há até 60 min)
   b. Se encontrar reunião nova → envia email preventivo pedindo para ativar gravação/transcrição
      → email tem botão "Quero receber o resumo" (link para dashboard:3000/activate)
   c. Busca reuniões Teams encerradas nas últimas 8h
   d. Para cada reunião encerrada:
      - Se o usuário for ORGANIZADOR → processa automaticamente (sem precisar clicar)
      - Se for PARTICIPANTE → só processa se tiver clicado no botão de opt-in
      - Tenta buscar a transcrição na Graph API
      - Se encontrou transcrição → gera resumo com OpenAI → envia por email
      - Se não encontrou → tenta novamente nas próximas checagens (5 min)
```

---

## O Que Está Pronto (14 arquivos em src/)

### Código em `src/`

| Arquivo | Status | Última alteração |
|---------|--------|-----------------|
| `config.js` | ✅ | v1.1.0 |
| `logger.js` | ✅ | v1.0.0 |
| `auth.js` | ✅ | v1.0.0 |
| `graph.js` | ✅ | v1.1.0 |
| `email.js` | ✅ | v1.0.0 |
| `summarizer.js` | ✅ | **v1.2.0 — parser VTT, limite 80k chars, prompt com seção de participantes** |
| `index.js` | ✅ | v1.0.0 |
| `monitor.js` | ✅ | **v1.2.0 — logs detalhados, mostra por que cada reunião foi pulada** |
| `store.js` | ✅ | v1.0.0 |
| `dashboard.js` | ✅ | v1.0.0 |
| `test-auth.js` | ✅ | v1.0.0 |
| `test-email.js` | ✅ | v1.0.0 |
| `diagnose.js` | ✅ | **v1.2.0 — novo: diagnóstico do dia** |
| `force-summary.js` | ✅ | **v1.2.0 — novo: processa resumo manualmente** |

### Configuração e Infraestrutura

| Arquivo | Status |
|---------|--------|
| `.env` | ✅ Credenciais reais configuradas |
| `ecosystem.config.js` | ✅ **Novo — PM2 com monitor + dashboard** |
| `package.json` | ✅ 8 scripts npm |
| `logs/` | ✅ Pasta criada (monitor.log, dashboard.log) |
| `data/processed-meetings.json` | ✅ Estado persistido das reuniões |

---

## Todos os Scripts Disponíveis

```powershell
npm run test:auth        # Testa conexão com Entra ID e Graph API
npm run test:email       # Envia email de teste para si mesmo
npm run monitor          # Sobe só o monitor (sem PM2)
npm run dashboard        # Sobe só o dashboard (sem PM2)
npm run diagnose         # Diagnóstico do dia para o 1o usuário do .env
npm run force-summary    # Força processamento manual do resumo
```

### Comandos com argumentos (uso direto no node)

```powershell
# Diagnóstico de um usuário específico
node src/diagnose.js alan.moreira@netturbo.com.br

# Forçar resumo das últimas 10h (padrão)
node src/force-summary.js alan.moreira@netturbo.com.br

# Forçar resumo das últimas 13h (reunião mais antiga no dia)
node src/force-summary.js alan.moreira@netturbo.com.br 13
```

### Comandos PM2 do dia a dia

```powershell
pm2 status              # Ver se os dois processos estão online
pm2 logs                # Ver logs em tempo real (Ctrl+C para sair)
pm2 logs netmeet-monitor    # Só os logs do monitor
pm2 logs netmeet-dashboard  # Só os logs do dashboard
pm2 restart all         # Reiniciar após mudança de código
pm2 stop all            # Parar tudo
pm2 start ecosystem.config.js  # Subir tudo novamente
```

---

## Piloto — 9 Usuários Monitorados

```
alan.moreira@netturbo.com.br
ana.laureano@netturbo.com.br
gileno.rocha@netturbo.com.br
kassima.rossetti@netturbo.com.br
lucas.camarotto@netturbo.com.br
marcos.santos@netturbo.com.br
mikeias.silva@netturbo.com.br
patrik.oliveira@netturbo.com.br
thiago.soares@netturbo.com.br
```

---

## Pendências em Aberto

### 1. Migrar para o servidor dedicado

O bot ainda roda no notebook do Alan. O dashboard (`http://10.200.16.107:3000`) só é acessível quando o notebook está na rede da empresa. Quando o servidor estiver configurado, atualizar `DASHBOARD_URL` no `.env` para o IP fixo do servidor e rodar `pm2 restart all`.

### 2. Confirmar PM2 no Boot

Verificar se `pm2 status` mostra os dois processos `online` automaticamente após reiniciar o computador.

---

## Dados do Entra ID

| Campo | Valor |
|-------|-------|
| Client ID | `b1c9406b-6cc4-4419-9a14-2430c8a44133` |
| Tenant ID | `945bd206-3f96-49d3-903f-06bd1f80c935` |
| Dashboard URL | `http://10.200.16.107:3000` |
| Email remetente | `alankardecm@gmail.com` |

---

## Evoluções Futuras Planejadas

- Persistência em SQLite (substituir `data/processed-meetings.json` que se perde se o arquivo corromper)
- Deploy em servidor dedicado (não depender do PC de Alan ficar ligado)
- Autenticação no Dashboard web (hoje qualquer um com o link consegue fazer opt-in)
- Fallback Groq/Claude para a IA (reduz custo OpenAI)
- Integração Power Automate — notificação no Teams além do email
- Expandir piloto para toda a empresa após validação

---

## Histórico de Versões

| Data | Versão | O que mudou |
|------|--------|-------------|
| 23/04/2026 | v1.0.0 | Criação do projeto, MVP completo |
| 27/04/2026 | v1.1.0 | Piloto iniciado; fix reuniões recorrentes (`calendarView`); lookback configurável; intervalo 5 min |
| 27/04/2026 | v1.2.0 | Parser VTT no summarizer (80k chars); prompt com seção de participantes; logs detalhados no monitor; `diagnose.js`; `force-summary.js`; `ecosystem.config.js` (PM2); `pm2-windows-startup` |
| 28/04/2026 | v1.3.0 | Fix transcrição reunião recorrente: `getMeetingTranscript` agora filtra por `meetingStartTime` (evita pegar transcrição de ocorrência anterior da Daily); Application Access Policy aplicada globalmente (`-Global`) — resolve 403 para todos os organizadores do tenant |

*Última atualização: 28/04/2026.*
