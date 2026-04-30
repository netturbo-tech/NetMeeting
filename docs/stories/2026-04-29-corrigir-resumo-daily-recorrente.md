# Story: Corrigir resumo da Daily TI recorrente

## Contexto

Em 29/04/2026, a Daily TI estava marcada das 09:30 as 10:00, mas terminou as 10:15. O monitor tentou processar as 10:03, quando a transcricao da ocorrencia atual ainda nao estava pronta. Como fallback, ele usou a transcricao mais recente disponivel, que era de 28/04/2026. Alem disso, usuarios recorrentes podiam ficar bloqueados porque o store tambem marcava o `onlineMeeting.id`, compartilhado entre ocorrencias da daily.

## Acceptance Criteria

- [x] O monitor respeita `POST_MEETING_WAIT_MINUTES` antes de buscar transcricao de reuniao encerrada pelo calendario.
- [x] Reuniao recorrente nao usa transcricao anterior quando nao existe transcricao apos o inicio da ocorrencia atual.
- [x] Resumo processado passa a ser marcado pela ocorrencia do calendario (`meeting.id`), nao pelo `onlineMeeting.id` compartilhado.
- [x] Diagnostico e processamento manual nao reportam transcricao antiga como se fosse atual.
- [x] Testes automatizados cobrem a janela pos-reuniao e a selecao de transcricao.

## Checklist

- [x] Investigar logs e estado local.
- [x] Ajustar selecao de transcricao.
- [x] Ajustar agendamento de processamento pos-reuniao.
- [x] Ajustar persistencia de reunioes processadas.
- [x] Atualizar documentacao.
- [x] Rodar gates de qualidade.

## File List

- `src/graph.js`
- `src/index.js`
- `src/monitor.js`
- `src/diagnose.js`
- `src/force-summary.js`
- `src/meeting-time.js`
- `scripts/check-js-syntax.js`
- `tests/graph-transcripts.test.js`
- `tests/harness.js`
- `tests/meeting-time.test.js`
- `tests/run-tests.js`
- `package.json`
- `.env.example`
- `README.md`
- `DOCUMENTACAO_TECNICA.md`
- `docs/stories/2026-04-29-corrigir-resumo-daily-recorrente.md`
