@AGENTS.md

# CLAUDE.md — Biblioteca Virtual de Estudos Bíblicos

Regras permanentes para qualquer sessão do Claude Code que trabalhe neste
repositório. Isto complementa (não substitui) `docs/CLAUDE_START.md`, que
é a especificação original do projeto.

## 1. Antes de escrever qualquer código

Leia, nesta ordem:

1. Este arquivo (`CLAUDE.md`).
2. `docs/WORK_STATUS.md` — estado atual, o que já foi feito, e a
   **primeira tarefa pendente** ("PENDÊNCIAS IMEDIATAS").
3. `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/SEARCH_SPEC.md`,
   `docs/INGESTION_SPEC.md`, `docs/DECISIONS.md`, `docs/ROADMAP.md`.

Depois, verifique o estado real do repositório (`git log --oneline`,
`git status`, `Glob`/`Grep` em `src/`) antes de assumir que algo falta.
**Nunca reconstrua do zero o que `WORK_STATUS.md` já registra como
concluído.**

## 2. Missão e estado do projeto

Biblioteca digital de estudos bíblicos: localizar, ler e relacionar
estudos por livro, capítulo, versículo, tema, personagem, série e
palavra-chave, com uma futura camada de IA subordinada às fontes do
acervo (nunca o contrário — ver DEC-005 em `docs/DECISIONS.md`).

O projeto avança por marcos incrementais (`docs/ROADMAP.md`). Concluídos:
Marco 1 (protótipo visual com dados mockados), Marco 1.1 (busca
desacoplada de `listPublished()`, parser de referências mais rigoroso,
prova das relações N:N do domínio, fonte de verdade da documentação) e
Marco 1.2 (DTO `StudySummary` separado de `Study` completo, remoção de
`listPublished()` da interface pública, validação canônica de limite de
versículos por capítulo com cobertura completa dos 66 livros, política
de segurança do Supabase registrada antes da conexão, README real).

A Fase 2 (banco real Supabase/PostgreSQL) está **concluída**: schema,
RLS, seed reproduzível e os repositórios Supabase foram validados
contra um Postgres real (migrations aplicando do zero, os 15 asserts
pgTAP de RLS passando, e o site rodando de fato via `Supabase*Repository`
com resultado equivalente ao Mock — ver `docs/WORK_STATUS.md`,
checkpoint 10).

**Docker (DEC-024): NÃO presuma disponível nem indisponível — revalide
com `docker info`/`npx supabase status` no início de cada sessão.** Este
ambiente específico (Claude Code) já mudou de "sem Docker" para "com
Docker funcional" entre sessões (checkpoint 12) — o inverso também pode
acontecer. Só depois de checar de verdade é que `supabase db reset`/
`test db` podem ser considerados bloqueados ou não.

A Fase 3 (piloto com acervo real, `src/lib/ingestion/`) já rodou uma
ingestão real (checkpoint 12): 14 dos 49 candidatos físicos únicos do
manifesto foram baixados/extraídos/transformados em `studies` de
verdade (12 REVIEW + 2 DRAFT, zero PUBLISHED, idempotência comprovada
com duas execuções reais) contra um Postgres local de verdade. Os
outros 35 falharam no FETCH de forma rastreável — não estão
sincronizados nesta cópia local do Drive (`LocalSyncedDriveSourceAdapter`,
DEC-031 — decisão do usuário de usar o Drive já sincronizado no Windows
em vez de credenciais da API). `GoogleDriveSourceAdapter` continua não
implementado por essa mesma decisão. Ver `docs/WORK_STATUS.md`
(checkpoint 12, "PENDÊNCIAS IMEDIATAS") para o que falta para os
outros 35 e a lista completa de achados reais corrigidos durante essa
ingestão (DEC-030 a DEC-035) — vale a pena ler antes de mexer em
`src/lib/ingestion/` de novo, para não reintroduzir um desses bugs já
corrigidos (ex.: `service_role` sem GRANT, colisão de `slug`, varredura
de referência).

## 3. Regras de arquitetura (não violar sem registrar uma decisão)

- **A Bíblia é o eixo de indexação** — livros/capítulos vêm de
  `src/lib/data/books.ts`, não são inventados por página.
- **O Google Drive é fonte editorial, não mecanismo de busca em tempo
  real.** O site nunca deve consultar o Drive a cada pesquisa.
- **A aplicação não deve depender de IA para funcionar.** Busca lexical
  e parser de referências (Fases A/B) são determinísticos e já
  funcionam sem nenhuma chamada de modelo.
- **Toda leitura de dados passa pelos repositórios**
  (`src/lib/repositories/index.ts`), nunca importe `src/lib/data/*`
  diretamente de uma página ou componente. É esse indireto que permite
  trocar a implementação mock por Supabase na Fase 2 sem tocar em UI,
  rotas ou busca.
- **Busca é sempre via `searchRepository.search()`**, nunca
  `studyRepository.listPublished()` + filtrar/pontuar em JavaScript numa
  página (DEC-013). Extrair uma referência bíblica de texto livre é
  trabalho de `src/lib/search/queryParsing.ts` (Fase A/B), que entrega um
  `SearchQuery` já estruturado ao repositório — o repositório nunca lida
  com strings de busca ambíguas. Da mesma forma, "últimos estudos" usa
  `listRecent(limit)`, não `listPublished()+sort+slice`.
- **Referência bíblica estruturalmente impossível nunca é aceita**
  (ex.: "João 999:999", ou "João 3:37" — João 3 só tem 36 versículos) —
  `parseReference` retorna `{ type: "invalid", reason, ... }`; a UI
  mostra um aviso explícito, nunca "Referência reconhecida: João
  999:999" (DEC-014, DEC-019). A tabela de limites de versículo
  (`src/lib/data/bibleVerseLimits.ts`, `VERSE_COUNTS`) tem **cobertura
  completa dos 66 livros / ~1189 capítulos** (DEC-019 v2 — a primeira
  versão era parcial e foi corrigida por não fechar o gate do parser).
  Se algum dia precisar trocar a fonte desses números, vendorize de uma
  fonte verificável e documente no cabeçalho do arquivo (pacote, versão,
  hash) como já está feito — nunca vire uma tabela parcial de novo.
- **Listagens e resultados de busca usam `StudySummary`, nunca `Study`
  completo** (DEC-017) — sem `conteudo` integral, `palavrasChave`,
  `personagens` nem o array inteiro de `passagens`. Só
  `getPublishedBySlug()` (a página de detalhe) devolve `Study` completo.
- **Não existe `listPublished()`** (removido no Marco 1.2 — DEC-018).
  Contagens usam `countPublishedStudies()` de cada repositório de
  entidade (`TopicRepository`, `CharacterRepository`,
  `SeriesRepository`); a lista de slugs para `generateStaticParams()`
  usa `listPublishedSlugs()`. Se precisar de "todos os estudos
  publicados" para algo novo, pare e pergunte se isso não devia ser uma
  agregação/paginação dedicada em vez de carregar tudo.
- **Um estudo pode ter múltiplas passagens, temas, personagens e
  séries** — não simplifique o modelo de dados para 1:1.
- **Toda IA futura responde apenas com base em trechos recuperados do
  acervo e mostra as fontes** (RAG ancorado, DEC-005). Nunca gerar
  resposta livre sem citar a origem.
- **Revisão humana é obrigatória antes de publicar** (DEC-004): estudos
  mockados incluem um exemplo em `DRAFT` propositalmente
  (`src/lib/data/studies.ts`) para provar que `status !== PUBLISHED`
  nunca aparece nas rotas públicas nem na busca.
- **Referência bíblica ambígua nunca é resolvida silenciosamente**
  (`docs/SEARCH_SPEC.md` §4) — ver `src/lib/search/referenceParser.ts`
  para o padrão a seguir se adicionar mais livros/aliases.
- **Nenhum segredo no repositório.** Variáveis sensíveis vão em
  `.env.local` (nunca commitado); `.env.example` documenta o que existe.
- **A Fase 2 (Supabase) segue a política de segurança já registrada em
  DEC-020** antes de escrever qualquer migration: RLS obrigatória em
  toda tabela pública, leitura anônima restrita a
  `status='PUBLISHED' AND visibilidade='publico'` (inclusive nas
  tabelas de relacionamento, via `EXISTS`/join — não só em `studies`),
  nenhuma policy pública de `INSERT`/`UPDATE`/`DELETE`,
  `SUPABASE_SERVICE_ROLE_KEY` só server-side, e as policies testadas
  contra um projeto de staging antes de produção. Não conecte o
  Supabase sem reler DEC-020 primeiro.
- **A escolha entre repositório mock e Supabase é automática por
  variável de ambiente** (DEC-023, `src/lib/repositories/index.ts`):
  `isSupabaseConfigured()` (`src/lib/supabase/client.ts`) checa
  `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`; se
  ausentes, usa `Mock*Repository` (comportamento do Marco 1); se
  presentes, usa `Supabase*Repository`
  (`src/lib/repositories/supabase/`). Página/componente nunca escolhe
  a implementação — sempre importa de `src/lib/repositories/index.ts`.
  Ao alterar um contrato em `src/lib/repositories/types.ts`, as duas
  implementações (mock e Supabase) precisam continuar satisfazendo a
  mesma interface.
- **Toda query Supabase fica dentro de `src/lib/repositories/supabase/`**
  — nunca em página/componente, mesmo que pareça "só uma consulta
  simples" (mantém a fronteira que já existia para o mock). Busca usa a
  função SQL `search_studies` (`SECURITY INVOKER`, nunca `DEFINER` —
  DEC-022) via `.rpc()`, nunca monta filtro livre em JavaScript sobre
  todos os estudos.
- **Migrations em `supabase/migrations/` são a única forma de alterar o
  schema/policies** — nunca edite o Dashboard do Supabase manualmente
  sem criar a migration correspondente. `supabase/seed.sql` é gerado
  (`npm run db:generate-seed`, script em
  `scripts/generate-supabase-seed.ts`) a partir de
  `src/lib/data/*.ts` — não edite `seed.sql` à mão, edite o script ou os
  dados-fonte e regenere.
- **Disponibilidade do Docker (DEC-024) já mudou de estado nesta
  máquina** — revalide com `docker info`/`npx supabase status` a cada
  sessão nova antes de assumir que `supabase start`/`db reset`/`test db`
  estão bloqueados ou não. Não presuma nenhum dos dois sem checar.
- **Nenhum estudo real (Fase 3+) pode nascer `PUBLISHED`** — a ingestão
  (`src/lib/ingestion/pipeline.ts`) só cria `DRAFT`/`REVIEW`; isso é
  garantido pelo TIPO de `UpsertStudyInput.status`
  (`src/lib/ingestion/repository.ts`, `Extract<StatusEditorial,
  "DRAFT"|"REVIEW">`), não só por disciplina de código — se um dia
  precisar de publicação automática de conteúdo ingerido, isso exige
  mudar esse tipo deliberadamente e registrar a decisão em
  `docs/DECISIONS.md` primeiro, nunca só adicionar `"PUBLISHED"` a um
  `as` silencioso em algum lugar.
- **O cliente `service_role` fica em `src/lib/supabase/serviceClient.ts`,
  separado de `src/lib/supabase/client.ts` de propósito** (DEC-027) —
  nunca importe `serviceClient.ts` de `src/app/**`, `src/components/**`
  nem de `src/lib/repositories/**` (só de `src/lib/ingestion/` e de
  scripts em `scripts/`, sempre server-only). `files`/`ingestion_jobs`
  não têm NENHUMA policy de RLS para `anon`/`authenticated` (nega tudo
  por padrão) — nunca crie uma policy "temporária" nelas para depurar.
- **A pipeline de ingestão (`src/lib/ingestion/`) é inteiramente
  determinística, sem IA** (mesma regra de `src/lib/search/`) — varredura
  de referências, sugestão de resumo/palavras-chave/tema/personagem e
  diagnóstico de duplicidade são algoritmos explícitos e testáveis, nunca
  uma chamada de modelo. Diagnóstico de duplicidade nunca funde/exclui
  automaticamente (`DUPLICATE_EXACT` só com `drive_file_id`/hash
  idênticos; o resto é sempre `POSSIBLE_DUPLICATE`, nunca `DISTINCT` por
  suposição) — decisão de mesclar/descartar é sempre humana.
- Qualquer mudança arquitetural relevante é registrada em
  `docs/DECISIONS.md` **antes ou junto** da implementação, não depois.

## 4. O que NÃO implementar ainda

RAG · Chatbot · Embeddings · pgvector operacional · ingestão automática
do Google Drive · importação do acervo real · publicação automática ·
autenticação pública · pagamentos.

Essas fases têm lugar reservado no modelo de dados e no roadmap, mas
código real só entra quando o roadmap chegar lá (ver `docs/ROADMAP.md`).
Se a tentação for grande, prefira deixar um comentário `// Fase N:` no
lugar certo em vez de implementar adiantado.

## 5. Fluxo de trabalho obrigatório

Para qualquer alteração não trivial:

1. Implemente em passos pequenos e coerentes (não um "big bang").
2. Rode, nesta ordem, e corrija falhas antes de seguir:
   ```bash
   npx tsc --noEmit
   npx eslint
   npx vitest run
   npm run build
   ```
3. Atualize `docs/WORK_STATUS.md` com: o que foi feito, arquivos
   alterados, testes executados, erros encontrados/corrigidos, decisões
   tomadas e o **próximo passo exato**.
4. Registre em `docs/DECISIONS.md` qualquer decisão arquitetural nova.
5. Faça um commit pequeno e descritivo (git, mensagens em português,
   sem `--no-verify`).

Não acumule trabalho grande sem checkpoint: commit e atualize
`WORK_STATUS.md` em intervalos curtos, especialmente antes de iniciar
uma tarefa grande — não apenas no fim da sessão. Se a sessão for
interrompida por limite de créditos/contexto a qualquer momento, a
próxima sessão deve conseguir continuar exatamente daí sem repetir
trabalho.

## 6. Convenções do código

- **Português** para nomes de domínio (campos do modelo de dados,
  conteúdo, comentários de regra de negócio) — espelha
  `docs/DATA_MODEL.md`. Inglês é aceitável para nomes técnicos genéricos
  (`SearchResult`, `props`, etc.) onde não há ambiguidade.
- TypeScript estrito (`strict: true` já configurado); não introduza `any`
  sem justificar em comentário.
- Componentes de página em `src/app/**/page.tsx` são Server Components
  `async` que leem dados via `src/lib/repositories`. `params` e
  `searchParams` são `Promise` (Next.js 15+/16) — sempre `await`.
  **Antes de assumir qualquer API do Next.js pelo que você já sabe,
  confira `node_modules/next/dist/docs/` neste projeto** — o
  `AGENTS.md` gerado pelo próprio `next dev` avisa que esta versão pode
  ter mudanças que não estão no seu treinamento.
- Testes com Vitest + Testing Library, arquivo `*.test.ts(x)` ao lado do
  código testado. Para testar uma página async, resolva a função antes
  de passar a `render`: `render(await MinhaPage({ params, searchParams }))`.
- Estilo visual: Tailwind v4 (config via `@theme` em
  `src/app/globals.css`, sem `tailwind.config.js`). Tema **claro apenas**
  por decisão (DEC-012) — não reintroduza `prefers-color-scheme: dark`
  sem antes adaptar todos os componentes para os dois temas.
- Dados fictícios do MVP ficam em `src/lib/data/*.ts` (TypeScript
  tipado, não JSON solto — DEC-011) e nunca devem ser confundidos com
  conteúdo real do acervo.

## 7. Onde as coisas estão

```
docs/                        Especificação oficial do projeto (fonte da verdade — DEC-016; nunca o Drive)
src/lib/types.ts             Modelo de domínio (espelha DATA_MODEL.md) + StudySummary (DTO de listagem, DEC-017)
src/lib/data/                Dados mockados (livros, temas, personagens, séries, estudos)
src/lib/data/bibleVerseLimits.ts  Tabela COMPLETA (66 livros) de limites de versículo por capítulo, fonte documentada (DEC-019)
src/lib/repositories/        Interfaces (incl. SearchRepository) + implementação mock
src/lib/repositories/index.ts     Seleção mock/Supabase por variável de ambiente (DEC-023) — ponto único de importação
src/lib/repositories/supabase/    Implementação Supabase de cada repositório (rows.ts, mappers.ts, books/topics/characters/series/studies/search.ts, relations.ts — fetchPassageJoins/fetchTopicJoins/fetchCharacterJoins/fetchSeriesJoins compartilhadas entre studies.ts e search.ts, nunca duplicadas)
src/lib/search/normalize.ts       Normalização de texto (acentos, slugs, tokens)
src/lib/search/referenceParser.ts Fase B: texto -> referência bíblica (ou "ambiguous"/"invalid"/"none")
src/lib/search/queryParsing.ts    Ponte Fase A/B: texto livre -> SearchQuery estruturado
src/lib/search/search.ts          Motor de busca puro (scoreStudy, matchesFilters, WEIGHTS) — usado por MockSearchRepository
src/lib/supabase/client.ts   Cliente `anon` (@supabase/supabase-js) + isSupabaseConfigured() — Fase 2 (política de segurança: DEC-020)
src/lib/supabase/serviceClient.ts  Cliente `service_role`, server-only, separado de client.ts de propósito (Fase 3, DEC-027)
supabase/migrations/         Schema, índices, função search_studies, views de contagem, RLS/policies + proveniência da Fase 3 (files/ingestion_jobs) — SQL versionado, nesta ordem cronológica
supabase/seed.sql            Gerado por `npm run db:generate-seed` a partir de src/lib/data/*.ts — não editar à mão
supabase/tests/              Testes pgTAP de RLS — 15/15 PASS confirmado nesta máquina (checkpoint 12); Docker pode não estar disponível numa sessão futura, revalide (DEC-024)
scripts/generate-supabase-seed.ts  Gera supabase/seed.sql a partir dos dados mockados
scripts/fase3-validate-manifest.ts Valida o manifesto do piloto da Fase 3 (contagens/aliases/issues) e diagnostica os 12 duplicados possíveis
scripts/fase3-ingest-piloto.ts     Orquestra a ingestão real dos candidatos não-alias contra o Postgres local (idempotente — seguro rodar de novo)
scripts/fase3-validate-db.ts       Consulta o banco real e comprova as invariantes (zero PUBLISHED, zero drive_file_id duplicado, casos editoriais)
scripts/fase3-review-report.ts     Gera o relatório de revisão humana (Etapa 10) a partir do banco real — nunca uma página pública
docs/fase3-piloto/           Manifesto real do piloto da Fase 3 (50 candidatos) — entregue pelo usuário, não gerado por código; fonte única para src/lib/ingestion/manifest.ts
src/lib/ingestion/           Pipeline de ingestão determinística da Fase 3 (sem IA) — ver DEC-028
src/lib/ingestion/manifest.ts      Lê/valida o manifesto do piloto (docs/fase3-piloto/) — nunca corrige duplicidade/contagem sozinho
src/lib/ingestion/referenceScan.ts Varre um documento INTEIRO por referências bíblicas (diferente de search/referenceParser.ts, que só olha o início de uma consulta curta)
src/lib/ingestion/extract/        Adaptadores de extração por formato (docx/legacyDoc/pdf/pptx) + roteador por MIME type
src/lib/ingestion/duplicates.ts   Diagnóstico conservador de duplicidade — nunca funde/exclui automaticamente
src/lib/ingestion/repository.ts   Fronteira pipeline -> persistência (implementações: repository.inMemory.ts para teste, supabaseIngestionRepository.ts para produção)
src/lib/ingestion/pipeline.ts     Orquestrador (ingestFile) — idempotente, nunca cria PUBLISHED
src/lib/ingestion/sources/        Origem do arquivo — localSyncedDriveAdapter.ts (usado de fato, Drive sincronizado local), googleDriveAdapter.ts ainda NÃO implementado (decisão do usuário, sem credenciais)
src/components/              Componentes de UI reutilizáveis
src/app/                     Rotas (App Router)
```

## 8. Idioma de resposta

Responda ao usuário em português (pt-BR), como no restante desta sessão.
