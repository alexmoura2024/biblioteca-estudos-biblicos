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
checkpoint 10). Este ambiente específico (Claude Code) continua sem
Docker (DEC-024) — a validação acima foi feita rodando os comandos numa
máquina com Docker e conferindo o resultado; não presuma que esse
bloqueio de ambiente sumiu só porque a fase foi concluída. Próximo
passo: Fase 3 (piloto com um recorte do acervo real), ver
`docs/WORK_STATUS.md` ("PENDÊNCIAS IMEDIATAS").

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
- **Docker não está disponível neste ambiente** (DEC-024) — por isso
  `supabase start`/`db reset`/`test db` nunca rodaram nesta máquina.
  Se uma sessão futura tiver Docker disponível, essa é a próxima
  validação pendente (não presuma que já passou só porque o SQL foi
  escrito e revisado).
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
src/lib/supabase/client.ts   Cliente real (@supabase/supabase-js) + isSupabaseConfigured() — Fase 2 (política de segurança: DEC-020)
supabase/migrations/         Schema, índices, função search_studies, views de contagem, RLS/policies (SQL versionado, nesta ordem cronológica)
supabase/seed.sql            Gerado por `npm run db:generate-seed` a partir de src/lib/data/*.ts — não editar à mão
supabase/tests/              Testes pgTAP de RLS (não executados nesta máquina — falta Docker, DEC-024)
scripts/generate-supabase-seed.ts  Gera supabase/seed.sql a partir dos dados mockados
src/components/              Componentes de UI reutilizáveis
src/app/                     Rotas (App Router)
```

## 8. Idioma de resposta

Responda ao usuário em português (pt-BR), como no restante desta sessão.
