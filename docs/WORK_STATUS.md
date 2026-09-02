WORK\_STATUS — Biblioteca Virtual de Estudos Bíblicos

ESTADO ATUAL
Marco 1 (protótipo visual) em andamento. Projeto Next.js criado e funcional. Camada de dados mockados e modelo de domínio concluídos. Repositórios, busca e páginas ainda pendentes (ver PENDÊNCIAS IMEDIATAS).

CONCLUÍDO (sessão de 2026-09-02)
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
1. Criar camada de repositórios em `src/lib/repositories/` (interfaces + implementação mock hoje; mesma interface será implementada com Supabase na Fase 2) para studies/books/topics/characters/series, todos filtrando por `status=PUBLISHED` e `visibilidade=publico` por padrão.
2. Implementar parser de referências bíblicas (Fase B) em `src/lib/search/referenceParser.ts` + testes (formatos: "João 3:16", "Jo 3.16", "João 3 16", "Lucas 22:47-52", abreviações, acentos).
3. Implementar busca lexical + ranking (Fase A/C) em `src/lib/search/search.ts` (título > tema > personagem > palavra-chave > resumo; referência exata tem prioridade máxima) + testes.
4. Construir componentes de UI (Header/nav, SearchBar, StudyCard, Breadcrumbs, EmptyState, Footer) em `src/components/`.
5. Construir as rotas do App Router: `/`, `/busca`, `/biblia`, `/biblia/[livro]`, `/biblia/[livro]/[capitulo]`, `/temas`, `/temas/[slug]`, `/personagens`, `/personagens/[slug]`, `/series`, `/series/[slug]`, `/estudo/[slug]`, `/admin` (placeholder "em construção", sem autenticação real).
6. Testes de página/rota (Testing Library) para home, busca e página de estudo.
7. Criar `.env.example` com variáveis Supabase comentadas/não usadas (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) e um stub `src/lib/supabase/client.ts` não importado por nada ativo, só para preparar a Fase 2.
8. Rodar lint + testes + build ao final e corrigir eventuais erros.
9. Criar `CLAUDE.md` na raiz com as regras permanentes de continuidade.
10. Commits pequenos a cada etapa concluída (1 já feito: scaffold + dados mockados).

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

TESTES EXECUTADOS
- `npx tsc --noEmit` → sem erros.
- `npx eslint` → sem erros/avisos.
- `npx vitest run` → 1 arquivo, 5 testes, todos passando (src/lib/data/studies.test.ts).

PROTOCOLO DE CONTINUIDADE PARA CLAUDE
No início de cada nova sessão, ler CLAUDE.md (raiz), ARCHITECTURE, DATA_MODEL, SEARCH_SPEC, INGESTION_SPEC, DECISIONS, ROADMAP e este WORK_STATUS.md, nesta ordem.
Antes de repetir trabalho, verificar o estado real do repositório (`git log`, `git status`, estrutura de `src/`).
Fazer commits pequenos e frequentes — a cada arquivo ou pequeno grupo de arquivos concluído, não apenas ao final da sessão.
Após cada etapa relevante, atualizar este documento com tarefas concluídas, pendentes, erros, decisões e o próximo passo exato antes de seguir para a etapa seguinte.
Se houver interrupção por limite de créditos ou contexto, a próxima sessão deve retomar exatamente pela primeira pendência listada em "PENDÊNCIAS IMEDIATAS" acima, sem reconstruir o que já existe.
