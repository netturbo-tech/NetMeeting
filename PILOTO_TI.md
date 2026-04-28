# Piloto TI - NetMeet Bot

Documento de operacao inicial para testar o NetMeet Bot com o time de TI e a diretoria.

## Objetivo do Piloto

Validar o NetMeet Bot como alternativa interna ao Fireflies para reunioes do Microsoft Teams.

O piloto deve confirmar:

1. O bot encontra reunioes Teams futuras e encerradas.
2. O bot envia o lembrete preventivo antes da reuniao.
3. O bot acessa transcricoes via Microsoft Graph.
4. O resumo gerado e util para o time.
5. O processo e simples para os usuarios.
6. A operacao respeita privacidade, permissao e governanca interna.

## Escopo Inicial

Publico:

- Time de TI: 9 pessoas
- Dono/diretoria: 1 pessoa

Total inicial: 10 usuarios.

## Configuracao dos Usuarios Piloto

No `.env`, preencher `PILOT_USERS`:

```env
PILOT_USERS=alan.moreira@netturbo.com.br,usuario2@netturbo.com.br,usuario3@netturbo.com.br
```

## Liberacao no Teams

Cada usuario do piloto precisa estar liberado na `Application Access Policy`.

Exemplo:

```powershell
Grant-CsApplicationAccessPolicy -PolicyName "NetMeetBotPolicy" -Identity "alan.moreira@netturbo.com.br"
Grant-CsApplicationAccessPolicy -PolicyName "NetMeetBotPolicy" -Identity "usuario2@netturbo.com.br"
```

## Regras Para os Usuarios

Para o bot gerar resumo:

- a reuniao precisa ser do Teams;
- o usuario precisa estar autorizado;
- a gravacao/transcricao precisa ser ativada;
- a transcricao precisa ser processada pelo Teams.

Importante: o bot precisa da transcricao. Gravacao sozinha nao basta.

## Estado Atual do Piloto

O fluxo atual e:

```text
usuario tem reuniao Teams hoje
        ->
NetMeet envia lembrete preventivo antes da reuniao
        ->
usuario ativa gravacao/transcricao se quiser resumo
        ->
participantes confirmam opt-in se quiserem receber o resumo
        ->
NetMeet processa automaticamente depois que a reuniao terminar
```

A dashboard nao deve ser tratada como etapa obrigatoria para o usuario final. Ela roda uma vez no servidor, ou provisoriamente na maquina do operador do piloto, e recebe os cliques de opt-in dos emails.

Importante sobre `DASHBOARD_URL`:

- `http://localhost:3000` funciona apenas para testes na propria maquina onde a dashboard esta rodando.
- Para outros usuarios clicarem no link do email, configure `DASHBOARD_URL` com um endereco acessivel na rede, por exemplo `http://IP-DA-MAQUINA:3000` ou uma URL publicada em servidor.
- Os usuarios nao precisam manter dashboard aberta; apenas o processo `npm run dashboard` precisa estar rodando no endereco configurado.

Regra de envio:

- organizador recebe automaticamente;
- participantes recebem somente se confirmarem interesse pelo link do email preventivo;
- participantes sem opt-in nao recebem resumo.

## Texto Para Avisar o Time

```text
Pessoal, vamos iniciar um piloto interno do NetMeet Bot, nosso assistente de resumo de reunioes do Teams.

Durante o piloto, algumas reunioes poderao gerar resumo automatico por email, desde que a reuniao tenha gravacao/transcricao habilitada.

Para participar:
1. Em reunioes importantes, ativem a gravacao/transcricao no Teams.
2. Avisem os participantes no inicio da reuniao que ela sera gravada/transcrita para geracao de resumo interno.
3. Ao final, aguardem alguns minutos para o Teams processar a transcricao.
4. O resumo sera enviado por email quando o bot conseguir processar a reuniao.
```

## Operacao Diaria do Piloto

1. Confirmar que os usuarios estao em `PILOT_USERS`.
2. Confirmar que os usuarios receberam `Grant-CsApplicationAccessPolicy`.
3. Manter a dashboard em execucao no servidor ou maquina do operador para receber os opt-ins:

```powershell
npm run dashboard
```

4. Manter o monitor em execucao:

```powershell
npm run monitor
```

5. Confirmar que o usuario recebeu o email preventivo antes da reuniao.
6. Confirmar que participantes interessados clicaram no link de opt-in.
7. Depois da reuniao, acompanhar o processamento automatico.
8. Verificar no terminal sinais como:

```text
Notificando usuario sobre a reuniao
Transcricao encontrada
Resumo enviado
```

9. Confirmar que a reuniao entrou em `data/processed-meetings.json`.
10. Coletar feedback do usuario sobre a qualidade do resumo.

## Indicadores do Piloto

Acompanhar:

- quantidade de lembretes enviados;
- quantidade de reunioes encontradas;
- quantidade de transcricoes encontradas;
- quantidade de resumos enviados;
- falhas por permissao;
- falhas por ausencia de transcricao;
- feedback de qualidade;
- tempo medio entre fim da reuniao e envio do resumo.

## Proximas Melhorias

- dashboard com login;
- historico de resumos;
- busca por reuniao;
- regras de envio;
- configuracao por time/grupo;
- auditoria;
- melhor layout de email.
