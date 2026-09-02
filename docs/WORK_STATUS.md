WORK\_STATUS — Biblioteca Virtual de Estudos Bíblicos

ESTADO ATUAL
**MARCO 1 CONCLUÍDO.** MVP profissional e navegável, com Next.js 16 + TypeScript + Tailwind v4, dados 100% mockados, busca local funcional (lexical + parser de referências + filtros), navegação por Bíblia/temas/personagens/séries, página individual de estudo, arquitetura preparada para Supabase (camada de repositórios + stub), testes automatizados (61 testes) e `next build` limpo (123 páginas). Nenhuma das funcionalidades da lista "NÃO IMPLEMENTAR AINDA" foi tocada. Ver `docs/ROADMAP.md` — próximo é a FASE 2 (banco real).

CONCLUÍDO (sessão de 2026-09-02, checkpoint 4 — fechamento do Marco 1)
- Testes de página/rota (Testing Library) para home, `/busca` (referência reconhecida, filtro sem texto, estado vazio), `/estudo/[slug]` (renderização + 404 para slug inexistente e para estudo DRAFT), `/biblia`, `/biblia/[livro]` e `/biblia/[livro]/[capitulo]` (capítulo com/sem estudos, 404 para livro/capítulo inválido). Total do projeto: 61 testes, todos passando.
- Bug de acessibilidade encontrado pelo próprio teste da home e corrigido: os cards de "Navegar por" concatenavam título e descrição sem espaço para leitores de tela ("BíbliaNavegue..."); corrigido em `src/app/page.tsx`.
- `.env.example` criado com as 3 variáveis Supabase documentadas (não lidas por nenhum código ativo). Corrigido `.gitignore`: o padrão `.env*` estava também ignorando `.env.example`; adicionado `!.env.example`.
- `src/lib/supabase/client.ts`: stub não importado por nenhum código ativo, documentando o ponto de entrada exato que a Fase 2 vai preencher.
- `CLAUDE.md` definitivo criado na raiz (mantendo `@AGENTS.md` no topo, que o próprio `next dev` regenera): missão, ordem de leitura da documentação, regras de arquitetura, o que não implementar ainda, fluxo de qualidade obrigatório (tsc/eslint/vitest/build a cada mudança relevante), convenções de código e mapa do repositório.
- Checagem final: `npx tsc --noEmit`, `npx eslint`, `npx vitest run` (61 testes) e `npm run build` (123 páginas) todos limpos, executados após todas as mudanças acima.

CONCLUÍDO (sessão de 2026-09-02, checkpoint 3 — UI e páginas)
- Componentes em `src/components/`: `Header` (nav + busca), `Footer`, `SearchForm` (form GET reutilizável, funciona sem JS), `StudyCard` (título, referência principal, resumo, temas, série — conforme docs/SEARCH_SPEC.md §6), `Badge`, `Breadcrumbs`, `EmptyState`.
- `src/lib/site.ts` com config de navegação/metadados do site.
- Layout raiz (`src/app/layout.tsx`) com fonte serif (Lora) + sans (Geist), `lang="pt-BR"`, skip-link de acessibilidade, `<Header>`/`<Footer>` fixos.
- Todas as 12 rotas do Marco 1 implementadas: `/`, `/busca`, `/biblia`, `/biblia/[livro]`, `/biblia/[livro]/[capitulo]`, `/temas`, `/temas/[slug]`, `/personagens`, `/personagens/[slug]`, `/series`, `/series/[slug]`, `/estudo/[slug]`, `/admin` (placeholder, sem auth). Todas consomem os repositórios de `src/lib/repositories`, nunca os dados mockados diretamente. `not-found.tsx` global também criado.
- `/busca` usa `searchStudies` com formulário de filtros (livro/testamento/tema/personagem/série) via GET, e trata o caso de referência ambígua (mostra links de desambiguação) e referência reconhecida (banner informativo).
- `generateStaticParams` + `generateMetadata` em todas as rotas dinâmicas de entidade (livro, tema, personagem, série, estudo); `/biblia/[livro]/[capitulo]` fica dinâmica sob demanda de propósito (evita gerar ~1189 páginas estáticas).
- Bug encontrado e corrigido via inspeção visual no navegador: o CSS gerado pelo create-next-app tinha um bloco `@media (prefers-color-scheme: dark)` que trocava `--background`/`--foreground` globalmente, mas os componentes usam classes Tailwind fixas (text-stone-900 etc.) — em ambiente com tema escuro do sistema, isso quebrava o contraste (texto escuro sobre fundo escuro). Removido; o Marco 1 usa apenas tema claro por decisão (ver DEC-012 em docs/DECISIONS.md).
- `next.config.ts`: adicionado `turbopack.root` para eliminar aviso de workspace root ambíguo (havia um package-lock.json em pasta acima do repositório Git).
- `.claude/launch.json` criado para permitir rodar `npm run dev` via preview do Claude Code.
- Verificação visual manual no navegador: home, busca (com reconhecimento de referência "João 3:16"), página de estudo, navegação Bíblia→livro→capítulo, e layout mobile (375px) — todos corretos.
- `next build` limpo: 123 páginas (rotas estáticas + SSG para livros/temas/personagens/séries/estudos; `/busca` e `/biblia/[livro]/[capitulo]` dinâmicas sob demanda). `npx eslint`, `npx tsc --noEmit` e `npx vitest run` (45 testes) continuam limpos.

CONCLUÍDO (sessão de 2026-09-02, checkpoint 2)
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
Ver docs/DECISIONS.md — DEC-008 (camada de repositório para preparar Supabase), DEC-009 (Vitest como framework de testes), DEC-010 (busca 100% local/em memória no Marco 1), DEC-011 (dados mockados versionados como código TypeScript, não JSON solto), DEC-012 (Marco 1 usa apenas tema claro — sem dark mode automático).

PENDÊNCIAS IMEDIATAS (próximo passo exato — início da FASE 2 do roadmap)
1. Ler docs/ROADMAP.md (Fase 2 — Banco real) e docs/DATA_MODEL.md antes de tocar em código.
2. Decidir e documentar em docs/DECISIONS.md: schema/migrations do Supabase (tabelas espelhando `src/lib/types.ts`), estratégia de migrations (SQL puro vs. Supabase CLI), e como popular o banco inicial (reaproveitar `src/lib/data/*` como seed?).
3. `npm install @supabase/supabase-js` e implementar `getSupabaseClient` em `src/lib/supabase/client.ts` (hoje um stub que lança erro de propósito).
4. Implementar `Supabase*Repository` para cada interface em `src/lib/repositories/types.ts`, trocar as instâncias em `src/lib/repositories/index.ts` (esse é o único arquivo que UI/rotas/busca dependem — não deve ser necessário tocar em `src/app/**` nem `src/components/**`).
5. Preencher `.env.local` a partir de `.env.example` (nunca commitar `.env.local`).
6. Manter os testes de `src/lib/repositories/mock.test.ts` como estão (cobrem a implementação mock) e adicionar testes equivalentes para a implementação Supabase quando ela existir (idealmente contra um banco de teste, não mockando o cliente).
7. Repetir o fluxo de qualidade (tsc/eslint/vitest/build) e atualizar este arquivo a cada etapa concluída — não esperar a Fase 2 inteira terminar para o primeiro commit.

NOTA TÉCNICA (testes de página, útil para a Fase 2 também): as páginas em `src/app/**/page.tsx` são Server Components `async` que chamam os repositórios diretamente. Testar com Testing Library exige `render(await PageComponent({ params: ..., searchParams: ... }))` (chamando a função e aguardando a Promise antes de passar a `render`), já que Vitest/RTL não executa o pipeline de Server Components do Next. Ver exemplos em `src/app/page.test.tsx`, `src/app/busca/page.test.tsx`, `src/app/estudo/[slug]/page.test.tsx` e `src/app/biblia/biblia.test.tsx`.

NÃO IMPLEMENTAR AINDA
RAG. Embeddings. Chatbot. pgvector operacional. Ingestão automática do Google Drive. Importação do acervo real. Publicação automática. Autenticação pública. Pagamentos.

ARQUIVOS CRIADOS/ALTERADOS NA SESSÃO DE 2026-09-02 (acumulado; ver `git log` para detalhe por checkpoint/commit)
- Scaffold completo do create-next-app + vitest.config.ts/vitest.setup.ts.
- src/lib/types.ts, src/lib/search/{normalize,reference,referenceParser,search}.ts (+ .test.ts).
- src/lib/data/{books,topics,characters,series,studies}.ts (+ studies.test.ts).
- src/lib/repositories/{types,mock,index}.ts (+ mock.test.ts).
- src/lib/site.ts, src/lib/supabase/client.ts (stub, Fase 2).
- src/components/{Header,Footer,SearchForm,StudyCard,Badge,Breadcrumbs,EmptyState}.tsx.
- src/app/layout.tsx, globals.css, not-found.tsx, page.tsx (+ page.test.tsx).
- src/app/busca/page.tsx (+ page.test.tsx).
- src/app/biblia/page.tsx, biblia/[livro]/page.tsx, biblia/[livro]/[capitulo]/page.tsx (+ biblia.test.tsx).
- src/app/temas/page.tsx, temas/[slug]/page.tsx.
- src/app/personagens/page.tsx, personagens/[slug]/page.tsx.
- src/app/series/page.tsx, series/[slug]/page.tsx.
- src/app/estudo/[slug]/page.tsx (+ page.test.tsx).
- src/app/admin/page.tsx.
- next.config.ts (turbopack.root), .claude/launch.json, .env.example, .gitignore (exceção para .env.example).
- CLAUDE.md (raiz, definitivo).
- docs/WORK_STATUS.md (este arquivo), docs/DECISIONS.md (DEC-008 a DEC-012).

ERROS ENCONTRADOS
Nenhum erro pendente ao final da sessão. `npx tsc --noEmit`, `npx eslint`, `npx vitest run` (61 testes) e `npm run build` (123 páginas) passam limpos.
Bugs encontrados e corrigidos durante o desenvolvimento (nenhum pendente): (1) busca por filtro sem texto retornava lista vazia — corrigido; (2) teste do parser assumia que "jo" sem acento deveria ser ambíguo — corrigido o teste, pois o comportamento correto é resolver por convenção de acento; (3) tema escuro automático do sistema quebrava contraste na home — corrigido (DEC-012); (4) `.env.example` estava sendo ignorado pelo `.gitignore` (`padrão .env*`) — corrigido com exceção; (5) cards da home concatenavam texto sem espaço para leitores de tela — corrigido.

TESTES EXECUTADOS (estado final da sessão)
- `npx tsc --noEmit` → sem erros.
- `npx eslint` → sem erros/avisos.
- `npx vitest run` → 8 arquivos, 61 testes, todos passando: studies.test.ts, mock.test.ts, referenceParser.test.ts, search.test.ts, page.test.tsx (home), busca/page.test.tsx, estudo/[slug]/page.test.tsx, biblia/biblia.test.tsx.
- `npm run build` → sucesso, 123 páginas geradas, sem erros nem avisos.
- Verificação visual manual (Claude Browser): home, /busca?q=João 3:16, /estudo/nicodemos-e-o-novo-nascimento, /biblia/joao/3, viewport mobile (375px) — todos corretos.

PROTOCOLO DE CONTINUIDADE PARA CLAUDE
No início de cada nova sessão, ler CLAUDE.md (raiz), ARCHITECTURE, DATA_MODEL, SEARCH_SPEC, INGESTION_SPEC, DECISIONS, ROADMAP e este WORK_STATUS.md, nesta ordem.
Antes de repetir trabalho, verificar o estado real do repositório (`git log`, `git status`, estrutura de `src/`).
Fazer commits pequenos e frequentes — a cada arquivo ou pequeno grupo de arquivos concluído, não apenas ao final da sessão.
Após cada etapa relevante, atualizar este documento com tarefas concluídas, pendentes, erros, decisões e o próximo passo exato antes de seguir para a etapa seguinte.
Se houver interrupção por limite de créditos ou contexto, a próxima sessão deve retomar exatamente pela primeira pendência listada em "PENDÊNCIAS IMEDIATAS" acima, sem reconstruir o que já existe.
