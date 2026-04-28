# Estimativa de Custos - NetMeet Bot

Documento para estimar custos do NetMeet Bot usando API de IA para gerar resumos a partir de transcricoes do Microsoft Teams.

Valores de referencia consultados em 24/04/2026.

## Modelo Atual

O projeto esta configurado para usar:

```env
OPENAI_MODEL=gpt-4o-mini
```

Preco oficial OpenAI para `gpt-4o-mini`:

- Entrada: US$ 0.15 por 1 milhao de tokens.
- Saida: US$ 0.60 por 1 milhao de tokens.

## Como o Custo Acontece

O Microsoft Teams gera a transcricao. O NetMeet Bot envia o texto da transcricao para a API de IA e recebe um resumo.

Custos principais:

1. Tokens de entrada: transcricao + prompt.
2. Tokens de saida: resumo gerado.

No codigo atual, a transcricao enviada para a IA e limitada:

```javascript
transcript.substring(0, 12000)
```

Isso limita o custo por reuniao e evita enviar transcricoes muito grandes nesta fase de piloto.

## Estimativa Por Reuniao

Estimativa media usando `gpt-4o-mini`:

| Cenario | Tokens entrada | Tokens saida | Custo USD/reuniao | Custo BRL/reuniao aproximado* |
|---|---:|---:|---:|---:|
| Reuniao curta | 2.000 | 800 | US$ 0.00078 | R$ 0.0039 |
| Reuniao media | 4.000 | 1.500 | US$ 0.00150 | R$ 0.0075 |
| Reuniao maior, no limite atual | 5.000 | 2.500 | US$ 0.00225 | R$ 0.0113 |

*BRL aproximado usando cambio de referencia de R$ 5,00 por US$ 1,00.

## Estimativa Mensal - Piloto TI

Publico inicial:

- 9 pessoas do TI.
- 1 dono/diretoria.
- Total: 10 usuarios.

| Uso | Reunioes/dia | Dias uteis | Reunioes/mes | Custo USD/mes | Custo BRL/mes aprox. |
|---|---:|---:|---:|---:|---:|
| Baixo | 10 | 22 | 220 | US$ 0.33 | R$ 1.65 |
| Medio | 30 | 22 | 660 | US$ 0.99 | R$ 4.95 |
| Alto | 60 | 22 | 1.320 | US$ 1.98 | R$ 9.90 |

Base de calculo: reuniao media com custo de US$ 0.00150.

## Estimativa Mensal - Empresa

| Uso | Reunioes/mes | Custo USD/mes | Custo BRL/mes aprox. |
|---|---:|---:|---:|
| 1.000 resumos/mes | 1.000 | US$ 1.50 | R$ 7.50 |
| 5.000 resumos/mes | 5.000 | US$ 7.50 | R$ 37.50 |
| 10.000 resumos/mes | 10.000 | US$ 15.00 | R$ 75.00 |

Esses valores consideram apenas a geracao do resumo pela OpenAI.

## Comparativo de Modelos OpenAI

| Modelo | Entrada / 1M tokens | Saida / 1M tokens | Observacao |
|---|---:|---:|---|
| `gpt-4o-mini` | US$ 0.15 | US$ 0.60 | Melhor custo para piloto e alto volume simples |
| `gpt-4.1-mini` | US$ 0.40 | US$ 1.60 | Mais caro, pode melhorar qualidade |
| `gpt-4o` | US$ 2.50 | US$ 10.00 | Muito melhor, mas bem mais caro |

Para o caso atual, `gpt-4o-mini` e suficiente para testar resumos corporativos.

## O Que Pode Aumentar Custo

- Remover o limite de `12000` caracteres da transcricao.
- Gerar varios tipos de saida por reuniao.
- Reprocessar a mesma reuniao varias vezes.
- Enviar resumo individual diferente para cada participante.
- Usar modelo maior, como `gpt-4o`.
- Guardar historico e gerar perguntas/respostas sobre reunioes antigas.

## Controle de Custo Recomendado

Para o piloto:

- Manter `OPENAI_MODEL=gpt-4o-mini`.
- Manter limite de transcricao.
- Evitar reprocessar a mesma reuniao.
- Processar apenas `PILOT_USERS`.
- Registrar quantos resumos foram enviados por dia.

Para producao:

- Criar persistencia para reunioes ja processadas.
- Criar limite diario por usuario/time.
- Criar dashboard de consumo.
- Separar ambientes: teste e producao.

## Alternativa Gratuita de API

### Opcao Recomendada Para Testes Gratis: Google Gemini API

O Google Gemini Developer API possui tier gratuito com tokens de entrada e saida gratuitos, acesso via Google AI Studio e limites por modelo.

Modelos candidatos:

- `gemini-2.5-flash-lite`: bom para alto volume e baixo custo.
- `gemini-2.5-flash`: melhor qualidade, ainda com free tier.
- `gemini-2.0-flash-lite`: alternativa leve e barata.

Pontos positivos:

- Pode ser usado gratis no inicio.
- Bom para prototipar resumos.
- API simples.
- Tem modelos rapidos e baratos.

Pontos de atencao:

- Free tier tem limites de RPM/TPM/RPD.
- No free tier, o conteudo pode ser usado para melhorar produtos do Google, conforme a pagina de precos da Gemini API.
- Para reunioes corporativas sensiveis, o ideal e usar tier pago/enterprise ou manter OpenAI com governanca.

### Opcao Gratuita Alternativa: OpenRouter Free

O OpenRouter possui um roteador `openrouter/free` com custo US$ 0 por tokens de entrada/saida.

Pontos positivos:

- Custo zero para testes.
- API parecida com OpenAI.
- Permite testar varios modelos.

Pontos de atencao:

- O modelo pode variar.
- Nao e a melhor opcao para padronizar qualidade de resumo.
- Deve ser avaliado com cuidado para dados corporativos.

## Recomendacao

Para o piloto TI:

1. Continuar com OpenAI `gpt-4o-mini`.
2. Medir custo real por 1 ou 2 semanas.
3. Em paralelo, testar Gemini API como fallback gratuito.
4. Nao usar API gratuita para reunioes sensiveis sem validar termos, privacidade e governanca.

Para substituir Fireflies em producao:

1. Priorizar previsibilidade, qualidade e governanca.
2. Usar OpenAI `gpt-4o-mini` ou `gpt-4.1-mini`.
3. Manter Gemini como fallback/opcao de economia, se aprovado pela empresa.

## Fontes

- OpenAI API Pricing: https://platform.openai.com/docs/pricing/
- Google Gemini Developer API Pricing: https://ai.google.dev/pricing
- Google Gemini API Rate Limits: https://ai.google.dev/gemini-api/docs/rate-limits
- OpenRouter Free Models Router: https://openrouter.ai/openrouter/free

