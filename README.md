# NetMeet Bot - Resumo Automatico de Reunioes Teams

> Sem Azure Bot Framework. Usa Entra ID + Microsoft Graph + OpenAI + SMTP.

## O Que Faz

1. Monitora calendarios via Graph API.
2. Detecta reunioes Teams proximas.
3. Envia email preventivo pedindo ativacao de gravacao/transcricao.
4. Depois da reuniao, busca a transcricao na Graph API.
5. Gera resumo profissional com IA.
6. Envia resumo por email.

## Estrutura

```text
TESTE/
|- .env
|- .env.example
|- .gitignore
|- package.json
|- README.md
`- src/
   |- index.js
   |- monitor.js
   |- dashboard.js
   |- config.js
   |- auth.js
   |- graph.js
   |- email.js
   |- summarizer.js
   |- logger.js
   |- store.js
   |- test-auth.js
   `- test-email.js
```

## Como Rodar

### Pre-requisitos

- Node.js 18+
- Credenciais do Entra ID
- Chave da OpenAI
- Conta SMTP

### Instalar dependencias

```bash
cd "C:\Users\alan.moreira\Documents\00 - 2026\15 - PROJETO IA NETTURBO\08 - RESUMO DE REUNIOES APP\TESTE"
npm install
```

### Configurar `.env`

```env
AZURE_CLIENT_SECRET=seu-segredo-do-entra-id
OPENAI_API_KEY=sk-sua-chave-openai
OPENAI_MODEL=gpt-4o-mini
SMTP_USER=seu-email
SMTP_PASS=sua-senha
PILOT_USERS=alan.moreira@netturbo.com.br,usuario2@netturbo.com.br
```

### Testes basicos

```bash
npm run test:auth
npm run test:email
```

### Execucao unica

```bash
node src/index.js alan.moreira@netturbo.com.br
```

Ou:

```bash
npm run start:user -- alan.moreira@netturbo.com.br
```

### Monitor continuo

```bash
npm run monitor
```

O monitor agora faz duas etapas:

1. Antes da reuniao:
   envia email preventivo para usuarios em `PILOT_USERS` com reunioes Teams nos proximos 30 minutos.
2. Depois da reuniao:
   aguarda `POST_MEETING_WAIT_MINUTES` apos o fim agendado, tenta buscar a transcricao da ocorrencia atual, gera o resumo e envia email.

Regra de envio do resumo:

- o organizador recebe automaticamente;
- participantes recebem somente se clicarem no link `Quero receber o resumo desta reuniao`;
- participantes sem opt-in nao recebem resumo, mesmo estando no calendario.
- reunioes recorrentes usam apenas transcricoes criadas apos o inicio daquela ocorrencia; se a transcricao de hoje ainda nao existir, o monitor tenta novamente depois.

### Dashboard

```bash
npm run dashboard
```

Hoje a dashboard e opcional. Ela serve para acompanhamento e historico, nao como etapa obrigatoria para o usuario final.

Para o opt-in dos participantes funcionar, a dashboard precisa estar rodando no endereco configurado em `DASHBOARD_URL`.

## Persistencia Local

O arquivo `data/processed-meetings.json` guarda:

- reunioes ja notificadas antes da call;
- reunioes ja processadas depois da call.

Isso evita reenvio de lembretes e resumos em reinicios do processo.

## Teste Recomendado do Monitor

Para validar o comportamento novo com 1 ou 2 usuarios do piloto:

```bash
cd "C:\Users\alan.moreira\Documents\00 - 2026\15 - PROJETO IA NETTURBO\08 - RESUMO DE REUNIOES APP\TESTE"
npm run monitor
```

Resultado esperado:

1. Antes da reuniao, o usuario recebe email pedindo para ativar gravacao/transcricao.
2. Participantes que quiserem receber o resumo clicam no link de opt-in.
3. Depois da reuniao e da janela `POST_MEETING_WAIT_MINUTES`, se a transcricao estiver pronta, o resumo e enviado para o organizador e para os participantes que fizeram opt-in.
4. Se a transcricao ainda nao estiver pronta, o monitor tenta novamente nas proximas checagens.

## Arquivos de Apoio

- `GUIA_TESTE_REUNIAO.md`
- `PILOTO_TI.md`
- `ESTIMATIVA_CUSTOS.md`
- `ROI_FIREFLIES_VS_NETMEET.md`
