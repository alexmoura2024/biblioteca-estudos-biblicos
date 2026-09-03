# Biblioteca Virtual de Estudos Bíblicos

Biblioteca digital para localizar, ler e relacionar estudos bíblicos do
acervo por livro, capítulo, versículo, tema, personagem, série,
palavras-chave e (no futuro) pergunta em linguagem natural.

> **Fonte de verdade:** toda a especificação técnica deste projeto vive
> em [`docs/`](docs/) e no arquivo [`CLAUDE.md`](CLAUDE.md) — este
> README é só uma porta de entrada. Em caso de dúvida ou divergência,
> `docs/` vence (ver DEC-016).

## Finalidade

O site não é um blog de estudos avulsos: a Bíblia é o eixo de indexação
de tudo. Um estudo pode ter múltiplas passagens (em livros diferentes),
múltiplos temas, múltiplos personagens e múltiplas séries — o modelo de
dados reflete isso desde o início (ver
[`docs/DATA_MODEL.md`](docs/DATA_MODEL.md)). Uma futura camada de IA
(RAG) vai responder perguntas em linguagem natural, mas **somente**
ancorada em trechos recuperados do próprio acervo, sempre mostrando as
fontes — nunca gerando resposta livre (DEC-005). A aplicação pública
nunca depende de IA para funcionar: a busca por referência bíblica e
por palavra-chave é 100% determinística.

## Arquitetura

```
Next.js (App Router) + TypeScript + Tailwind v4
        │
        ▼
Repositórios (src/lib/repositories) ── única porta de entrada para dados
        │
        ▼
Hoje: dados mockados em memória (src/lib/data)
Fase 2: Supabase/PostgreSQL (ainda não conectado)
```

- **Camada de repositórios** (`src/lib/repositories/`): interfaces
  (`StudyRepository`, `BookRepository`, `TopicRepository`,
  `CharacterRepository`, `SeriesRepository`, `SearchRepository`) que
  toda página consome — nunca importe `src/lib/data/*` diretamente de
  uma página ou componente. Isso é o que permite trocar a implementação
  mock por Supabase (Fase 2) sem tocar em UI, rotas ou busca.
- **Busca local** (`src/lib/search/`): parser de referências bíblicas
  determinístico (`referenceParser.ts` — reconhece "João 3:16", "Jo
  3.16", "Lucas 22:47-52", valida capítulo/versículo contra o cânon e
  contra uma tabela completa de limites de versículo — 66 livros, fonte
  documentada, ver DEC-019),
  ponte texto→consulta estruturada (`queryParsing.ts`) e o motor de
  ranking em memória (`search.ts`). Tudo isso roda sem nenhuma chamada
  de IA.
- **DTOs**: listagens e resultados de busca usam `StudySummary` (campos
  enxutos: título, resumo, referência principal, temas, séries), nunca
  o `Study` completo com conteúdo integral e todas as relações — isso
  fica reservado para a página de detalhe do estudo. Ver DEC-017.
- **Google Drive** é acervo editorial, nunca mecanismo de busca em
  tempo real (DEC-001) — o site nunca consulta o Drive por pesquisa.

Decisões arquiteturais completas, com motivo, estão em
[`docs/DECISIONS.md`](docs/DECISIONS.md) (DEC-001 a DEC-020 até o Marco
1.2).

## Estado atual

**Marco 1.2 (pré-Supabase hardening) concluído.** Protótipo funcional
com dados 100% mockados — nenhum conteúdo real do acervo foi
importado. Nada de Supabase, RAG, embeddings, chatbot ou autenticação
pública existe ainda; ver [`docs/WORK_STATUS.md`](docs/WORK_STATUS.md)
para o estado exato, o histórico de marcos e o próximo passo.

Rotas implementadas: `/`, `/busca`, `/biblia`, `/biblia/[livro]`,
`/biblia/[livro]/[capitulo]`, `/temas`, `/temas/[slug]`,
`/personagens`, `/personagens/[slug]`, `/series`, `/series/[slug]`,
`/estudo/[slug]`, `/admin` (placeholder, sem autenticação).

## Uso dos dados mockados

Todo o conteúdo do acervo hoje é fictício, escrito só para validar a
arquitetura — nunca confunda com material real. Fica em
`src/lib/data/`:

- `books.ts` — os 66 livros do cânon, ordem canônica, total de capítulos.
- `topics.ts`, `characters.ts`, `series.ts` — temas, personagens e séries.
- `studies.ts` — ~20 estudos fictícios (a maioria `PUBLISHED`, um
  deliberadamente `DRAFT` para provar que a revisão editorial funciona
  — nunca aparece em rota pública nem em busca). Um estudo tem
  propositalmente 4 passagens em livros diferentes e 2 séries, para
  provar as relações N:N do modelo (ver DEC-015).

Esses arquivos são TypeScript tipado (não JSON solto — DEC-011), então
qualquer inconsistência (livro/tema/personagem/série inexistente) é um
erro de compilação, não um bug silencioso em runtime.

## Comandos

```bash
npm run dev        # servidor de desenvolvimento (http://localhost:3000)
npm run build      # build de produção (Next.js)
npm run start      # serve o build de produção
npm run lint       # ESLint
npm run test       # Vitest (roda uma vez)
npm run test:watch # Vitest em modo watch
npm run test:ui    # Vitest com UI
```

Antes de considerar qualquer mudança pronta, os quatro comandos abaixo
devem passar sem erro (nesta ordem):

```bash
npx tsc --noEmit
npx eslint
npx vitest run
npm run build
```

## Estrutura do repositório

```
docs/                         Especificação técnica — fonte de verdade (DEC-016)
CLAUDE.md                     Regras permanentes para sessões de desenvolvimento assistido
src/
  app/                        Rotas (Next.js App Router)
  components/                 Componentes de UI reutilizáveis (Header, StudyCard, Badge, ...)
  lib/
    types.ts                  Modelo de domínio (espelha docs/DATA_MODEL.md) + StudySummary
    data/                     Dados mockados (livros, temas, personagens, séries, estudos)
    repositories/             Interfaces de repositório + implementação mock
    search/                   normalize, referenceParser (Fase B), queryParsing, search (Fase A/C)
    supabase/client.ts        Stub não usado — documenta o ponto de entrada da Fase 2
    site.ts                   Config de navegação/metadados do site
```

## Testes

Vitest + Testing Library. Arquivos `*.test.ts(x)` ficam ao lado do
código que testam. Cobrem: integridade dos dados mockados, o parser de
referências (incluindo casos de fronteira e referências inválidas), o
motor de busca e ranking, os repositórios (incluindo paginação e
agregações) e a renderização das páginas principais (home, busca,
página de estudo, navegação por Bíblia). Rode `npx vitest run` para o
número atual de testes.

## Fases futuras

O projeto avança por marcos incrementais — ver
[`docs/ROADMAP.md`](docs/ROADMAP.md) para a lista completa (Fase 2:
banco real → Fase 3: piloto com acervo real → Fase 4: parser bíblico
determinístico → Fase 5: busca temática → Fase 6: busca semântica →
Fase 7: busca híbrida → Fase 8: assistente do acervo (RAG) → Fase 9:
integração contínua com o Drive → Fase 10: escala do acervo).

A política de segurança que a Fase 2 deve seguir ao conectar o Supabase
(RLS, acesso público restrito a estudos publicados, chaves privilegiadas
exclusivamente server-side, etc.) já está registrada em DEC-020, antes
de qualquer código de conexão existir.

## Licença / natureza do conteúdo

Este repositório contém apenas código e dados fictícios de
demonstração. Nenhum conteúdo do acervo real de estudos bíblicos foi
importado nesta fase.
