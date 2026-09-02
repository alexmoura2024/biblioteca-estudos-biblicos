WORK\_STATUS — Biblioteca Virtual de Estudos Bíblicos

ESTADO ATUAL
Marco 1 (protótipo visual) em andamento. Projeto Next.js criado e funcional. Dados mockados, modelo de domínio, repositórios e motor de busca (lexical + parser de referências + filtros) concluídos e testados. Componentes de UI e páginas ainda pendentes (ver PENDÊNCIAS IMEDIATAS).

CONCLUÍDO (sessão de 2026-09-02)
- Camada de repositórios (`src/lib/repositories/`): interfaces `StudyRepository`/`BookRepository`/`TopicRepository`/`CharacterRepository`/`SeriesRepository` (`types.ts`), implementação em memória `Mock*Repository` (`mock.ts`), e ponto único de composição (`index.ts`) que páginas devem importar — é ali que a Fase 2 troca para Supabase. Todos os métodos são `async` mesmo sendo síncronos hoje, para já ter a assinatura definitiva.
- Parser de referências bíblicas (Fase B) em `src/lib/search/referenceParser.ts`: reconhece "João 3:16", "Jo 3.16", "João 3 16", "Lucas 22:47-52", livro sozinho, livro+capítulo, abreviações com/sem espaço ("1Sm 17:32"), case/acento-insensível. Resolve a ambiguidade real do cânon ("Jo" x "Jó") pela presença do acento (convenção padrão), com fallback estrutural para ambiguidade genuína caso surjam colisões futuras. Guarda contra falso-positivo de abreviações de 2 letras que coincidem com palavras comuns do português (ex.: "Os" de Oséias vs. artigo "os") — só interpreta como referência se vier seguida de número ou for a consulta inteira.
- Motor de busca (Fase A lexical + filtros Fase C) em `src/lib/search/search.ts`: combina referência (peso máximo) com título/tema/personagem/palavra-chave/resumo/conteúdo (pesos decrescentes, conforme docs/SEARCH_SPEC.md §5), aplica filtros por livro/testamento/tema/personagem/série, e suporta "navegação por filtro puro" (sem texto) quando ao menos um filtro está ativo.
- Testes: `referenceParser.test.ts` (14 casos, incluindo a desambiguação Jo/Jó e o guard-rail de falso-positivo), `search.test.ts` (14 casos: referência exata/capítulo/livro, tema, personagem, palavra-chave, ranking por título, todos os filtros, ambiguidade, consulta vazia). Total do projeto: 45 testes, todos passando. Lint e `tsc --noEmit` limpos.

CONCLUÍDO (checkpoint anterior, mesma sessão)
- Leitura integral de toda a documentação em docs/ (CLAUDE_START, ARCHITECTURE, DATA_MODEL, SEARCH_SPEC, INGESTION_SPEC, DECISIONS, ROADMAP).
- Repositório Git inicializado (branch `master`; commits a partir desta sessão).
- App Next.js 16 + TypeScript + Tailwind v4 + ESLint criado na raiz via `create-next-app` (App Router, `src/`, alias `@/*`).
- Stack de testes configurada: Vitest + jsdom + Testing Library (`vitest.config.ts`, `vitest.setup.ts`, scripts `test`/`test:watch`/`test:ui` no package.json).
- Modelo de domínio TypeScript criado em `src/lib/types.ts`, espelhando 1:1 as entidades de docs/DATA_MODEL.md (studies, books, passages, topics, characters, series, files, chunks, embeddings, ingestion_jobs), incluindo tipos ainda não usados (chunks/embeddings) para compatibilidade futura de esquema.
- Utilitários de normalização de texto criados em `src/lib/search/normalize.ts` (normalizeText, slugify, tokenize) e formatação de referência em `src/lib/search/reference.ts`.
- Dados mockados criados em `src/lib/data/`:
  - `books.ts`: os 66 livros do cânon, ordem canônica e total de capítulos.
  - `topics.ts`: 12 temas.
  - `characters.ts`: 12 personagens.
  - `series.ts`: 4 séries (Fundamentos da Fé, Vida de Davi, Cartas de Paulo, Parábolas de Jesus).
  - `studies.ts`: 20 estudos fictícios (19 PUBLISHED + 1 DRAFT, para validar filtragem editorial), cobrindo AT e NT, com passagens/temas/personagens/séries relacionados. `publishedStudies` é o array a ser usado por toda a UI/busca pública.
- Teste `src/lib/data/studies.test.ts` cobrindo contagem de estudos publicados (12–20), unicidade de slugs, integridade referencial (livros/temas existentes) e cobertura AT+NT. `npm run test` e `npx eslint` passam sem erros. `npx tsc --noEmit` sem erros.

DECISÕES TOMADAS NESTA SESSÃO
Ver docs/DECISIONS.md — DEC-008 (camada de repositório para preparar Supabase), DEC-009 (Vitest como framework de testes), DEC-010 (busca 100% local/em memória no Marco 1), DEC-011 (dados mockados versionados como código TypeScript, não JSON solto).

PENDÊNCIAS IMEDIATAS (próximo passo exato)
1. Construir componentes de UI reutilizáveis em `src/components/` (Header/nav com busca, SearchBar, StudyCard, Breadcrumbs, EmptyState, Footer, Badge para tema/personagem/série).
2. Construir as rotas do App Router, nesta ordem: `/` (home + busca) → `/busca` (usa `searchStudies`) → `/biblia` → `/biblia/[livro]` → `/biblia/[livro]/[capitulo]` → `/temas` → `/temas/[slug]` → `/personagens` → `/personagens/[slug]` → `/series` → `/series/[slug]` → `/estudo/[slug]` → `/admin` (placeholder "em construção", sem autenticação real). Todas devem consumir os repositórios de `src/lib/repositories`, nunca os dados mockados diretamente.
3. Testes de página/rota (Testing Library) para home, busca (inclusive caso de referência bíblica e caso de ambiguidade) e página de estudo.
4. Criar `.env.example` com variáveis Supabase comentadas/não usadas (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) e um stub `src/lib/supabase/client.ts` não importado por nada ativo, só para preparar a Fase 2.
5. Rodar lint + testes + `next build` ao final e corrigir eventuais erros (build ainda não foi executado nesta sessão).
6. Criar `CLAUDE.md` na raiz com as regras permanentes de continuidade (substituindo o CLAUDE.md genérico gerado pelo create-next-app, que hoje só contém `@AGENTS.md`).
7. Continuar fazendo commits pequenos a cada etapa concluída (2 já feitos: scaffold+dados mockados; repositórios+motor de busca).

NÃO IMPLEMENTAR AINDA
RAG. Embeddings. Chatbot. pgvector operacional. Ingestão automática do Google Drive. Importação do acervo real. Publicação automática. Autenticação pública. Pagamentos.

ARQUIVOS CRIADOS/ALTERADOS NESTA SESSÃO
- Scaffold completo do create-next-app (package.json, tsconfig.json, next.config.ts, eslint.config.mjs, src/app/layout.tsx, src/app/page.tsx, src/app/globals.css, public/*).
- vitest.config.ts, vitest.setup.ts
- src/lib/types.ts
- src/lib/search/normalize.ts
- src/lib/search/reference.ts
- src/lib/data/books.ts, topics.ts, characters.ts, series.ts, studies.ts, studies.test.ts
- docs/WORK_STATUS.md (este arquivo)
- docs/DECISIONS.md (DEC-008 a DEC-011)

ERROS ENCONTRADOS
Nenhum erro pendente. `npx tsc --noEmit`, `npx eslint` e `npm run test` passam limpos neste checkpoint.
Durante o desenvolvimento, dois bugs de lógica foram encontrados e corrigidos pelos próprios testes antes do commit: (1) busca por filtro sem texto retornava lista vazia — corrigido para tratar filtro ativo sem texto como navegação válida; (2) teste do parser assumia que "jo" sem acento deveria ser ambíguo — corrigido o teste, pois o comportamento real (resolver por convenção de acento) é o correto.

TESTES EXECUTADOS
- `npx tsc --noEmit` → sem erros.
- `npx eslint` → sem erros/avisos.
- `npx vitest run` → 4 arquivos, 45 testes, todos passando (studies.test.ts, mock.test.ts, referenceParser.test.ts, search.test.ts).
- `next build` ainda NÃO foi executado nesta sessão — só há uma página placeholder até aqui. Deixar para depois de construir as rotas reais (próximo passo).

PROTOCOLO DE CONTINUIDADE PARA CLAUDE
No início de cada nova sessão, ler CLAUDE.md (raiz), ARCHITECTURE, DATA_MODEL, SEARCH_SPEC, INGESTION_SPEC, DECISIONS, ROADMAP e este WORK_STATUS.md, nesta ordem.
Antes de repetir trabalho, verificar o estado real do repositório (`git log`, `git status`, estrutura de `src/`).
Fazer commits pequenos e frequentes — a cada arquivo ou pequeno grupo de arquivos concluído, não apenas ao final da sessão.
Após cada etapa relevante, atualizar este documento com tarefas concluídas, pendentes, erros, decisões e o próximo passo exato antes de seguir para a etapa seguinte.
Se houver interrupção por limite de créditos ou contexto, a próxima sessão deve retomar exatamente pela primeira pendência listada em "PENDÊNCIAS IMEDIATAS" acima, sem reconstruir o que já existe.
