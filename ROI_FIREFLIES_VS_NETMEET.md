# ROI - Fireflies vs NetMeet Bot

Comparativo de custo para avaliar ROI entre contratar Fireflies para 200 usuarios e operar o NetMeet Bot interno usando Microsoft Teams + Microsoft Graph + OpenAI.

Valores consultados em 24/04/2026.

## Premissas

Empresa:

- 200 usuarios.
- Microsoft Teams/M365 ja existente.
- Transcricao do Teams ja disponivel no pacote atual.
- NetMeet Bot usa transcricao nativa do Teams e paga apenas a geracao do resumo por API.
- Cambio de referencia: US$ 1,00 = R$ 5,00.

Modelo atual do NetMeet:

```env
OPENAI_MODEL=gpt-4o-mini
```

Custo medio usado para o NetMeet:

```text
US$ 0.00150 por resumo medio
```

Esse valor considera uma reuniao media com aproximadamente 4.000 tokens de entrada e 1.500 tokens de saida.

## Fireflies - 200 Usuarios

Precos da pagina oficial do Fireflies:

| Plano | Preco por usuario/mes | Custo mensal - 200 usuarios | Custo anual |
|---|---:|---:|---:|
| Pro | US$ 10 | US$ 2.000 | US$ 24.000 |
| Business | US$ 19 | US$ 3.800 | US$ 45.600 |
| Enterprise | US$ 39 | US$ 7.800 | US$ 93.600 |

Valores aproximados em BRL:

| Plano | Custo mensal BRL | Custo anual BRL |
|---|---:|---:|
| Pro | R$ 10.000 | R$ 120.000 |
| Business | R$ 19.000 | R$ 228.000 |
| Enterprise | R$ 39.000 | R$ 468.000 |

Observacao: a pagina do Fireflies indica esses valores por usuario/mes quando cobrado anualmente.

## NetMeet Bot - 200 Usuarios

Estimativa por volume de resumos:

| Cenario | Reunioes por usuario/dia | Dias uteis | Resumos/mes | Custo OpenAI mensal | Custo OpenAI anual |
|---|---:|---:|---:|---:|---:|
| Baixo | 1 | 22 | 4.400 | US$ 6,60 | US$ 79,20 |
| Medio | 2 | 22 | 8.800 | US$ 13,20 | US$ 158,40 |
| Alto | 4 | 22 | 17.600 | US$ 26,40 | US$ 316,80 |

Valores aproximados em BRL:

| Cenario | Custo mensal BRL | Custo anual BRL |
|---|---:|---:|
| Baixo | R$ 33 | R$ 396 |
| Medio | R$ 66 | R$ 792 |
| Alto | R$ 132 | R$ 1.584 |

## Economia Estimada

Comparando Fireflies Business com NetMeet em cenario medio:

| Item | Custo anual USD | Custo anual BRL |
|---|---:|---:|
| Fireflies Business - 200 usuarios | US$ 45.600 | R$ 228.000 |
| NetMeet OpenAI - cenario medio | US$ 158,40 | R$ 792 |
| Economia estimada | US$ 45.441,60 | R$ 227.208 |

Comparando Fireflies Pro com NetMeet em cenario medio:

| Item | Custo anual USD | Custo anual BRL |
|---|---:|---:|
| Fireflies Pro - 200 usuarios | US$ 24.000 | R$ 120.000 |
| NetMeet OpenAI - cenario medio | US$ 158,40 | R$ 792 |
| Economia estimada | US$ 23.841,60 | R$ 119.208 |

Comparando Fireflies Enterprise com NetMeet em cenario medio:

| Item | Custo anual USD | Custo anual BRL |
|---|---:|---:|
| Fireflies Enterprise - 200 usuarios | US$ 93.600 | R$ 468.000 |
| NetMeet OpenAI - cenario medio | US$ 158,40 | R$ 792 |
| Economia estimada | US$ 93.441,60 | R$ 467.208 |

## Leitura de ROI

Pelo custo direto de API, o NetMeet Bot e muito mais barato.

Mesmo em cenario alto, com 17.600 resumos por mes:

```text
NetMeet OpenAI anual: ~US$ 316,80
Fireflies Business anual: ~US$ 45.600
```

A diferenca e grande porque o NetMeet aproveita:

- Calendario do Microsoft 365 ja existente.
- Transcricao nativa do Teams.
- Email/SMTP ja existente.
- API de IA apenas para resumir texto.

## Custos Que Ainda Precisam Entrar no ROI

O custo acima e apenas API. Para comparar com Fireflies de forma justa, considerar tambem:

- Horas de desenvolvimento.
- Manutencao do bot.
- Servidor/hosting.
- Persistencia de dados.
- Dashboard.
- Controle de acesso.
- Auditoria.
- Suporte interno.
- Governanca de gravacao/transcricao.
- Evolucao de features.

## Diferencas de Produto

Fireflies entrega produto pronto:

- Bot/notetaker maduro.
- Interface web.
- Historico pesquisavel.
- Apps e integracoes.
- Analises, comentarios e colaboracao.
- Controles administrativos.
- Planos com recursos de seguranca.

NetMeet Bot entrega hoje:

- Busca reunioes no Teams.
- Baixa transcricao via Graph.
- Gera resumo com OpenAI.
- Envia email.
- Escopo controlado por usuario/piloto.

Para virar substituto real do Fireflies, o NetMeet precisa evoluir:

- Dashboard com login.
- Historico de resumos.
- Evitar reprocessamento.
- Regras de envio.
- Permissoes por time.
- Auditoria.
- Busca em resumos.
- Melhor layout de email.
- Processo automatico/agendado.

## Recomendacao

Para ROI:

1. Fazer piloto com TI + diretoria por 2 a 4 semanas.
2. Medir:
   - Quantidade de reunioes processadas.
   - Custo real OpenAI.
   - Qualidade dos resumos.
   - Tempo economizado por usuario.
   - Falhas por ausencia de transcricao.
3. Estimar horas de desenvolvimento para aproximar features do Fireflies.
4. Comparar economia anual com custo interno de construcao/manutencao.

Conclusao inicial:

```text
Financeiramente, o NetMeet tem ROI muito forte se a empresa aceitar evoluir uma ferramenta interna.
Operacionalmente, Fireflies vence em maturidade de produto pronto.
```

## Fontes

- Fireflies Pricing: https://fireflies.ai/pt-BR/pricing
- OpenAI Pricing: https://platform.openai.com/docs/pricing/
- USD/BRL referencia historica de abril/2026: https://www.poundsterlinglive.com/history/USD-BRL-2026

