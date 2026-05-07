# Story: Travar participantes do resumo aos metadados da reuniao

## Contexto

Em 06/05/2026, a reuniao "Alinhamento IA" estava marcada apenas para Alan, Marcos e Patrik, mas o resumo gerado incluiu muitos nomes que foram citados na transcricao como se fossem participantes. A causa provavel e o prompt pedir para a IA listar todos os participantes que falaram, permitindo inferencia indevida a partir do conteudo transcrito.

## Acceptance Criteria

- [x] A secao "Participantes" do resumo deve usar apenas organizador e convidados vindos dos metadados do evento do calendario.
- [x] Nomes apenas citados na transcricao nao devem ser adicionados como participantes.
- [x] A IA nao deve ser responsavel por montar a secao "Participantes".
- [x] O processamento automatico e o processamento forcado devem enviar os metadados da reuniao ao gerador de resumo.
- [x] Testes automatizados devem cobrir a montagem deterministica da lista de participantes.

## Tasks

- [x] Ajustar `src/summarizer.js` para receber metadados da reuniao e prefixar participantes confiaveis.
- [x] Atualizar chamadas em `src/index.js`, `src/monitor.js` e `src/force-summary.js`.
- [x] Adicionar testes para evitar participantes alucinados.
- [x] Rodar quality gates.

## File List

- `docs/stories/2026-05-07-travar-participantes-resumo.md`
- `src/summarizer.js`
- `src/index.js`
- `src/monitor.js`
- `src/force-summary.js`
- `tests/summarizer-participants.test.js`
- `tests/run-tests.js`

## Quality Gates

- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm test`
