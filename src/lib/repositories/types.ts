import type {
  Book,
  Character,
  Series,
  Study,
  StudySummary,
  TestamentoBiblico,
  Topic,
} from "@/lib/types";

/**
 * Contratos de repositório do acervo.
 *
 * Cada interface descreve como a aplicação lê os dados, independentemente
 * de onde eles vêm. Nesta fase (Marco 1) só existe `MockStudyRepository`
 * (ver `mock.ts`), operando sobre os dados de `src/lib/data`. Na Fase 2 do
 * roadmap, uma `SupabaseStudyRepository` implementará a mesma interface
 * consultando o Postgres via Supabase — sem exigir mudanças em páginas,
 * componentes ou na lógica de busca, que dependem apenas destas interfaces.
 *
 * Regra (Marco 1.2 — DEC-017/DEC-018): métodos de listagem devolvem
 * `StudySummary`, nunca `Study` completo — cards e resultados de busca
 * não precisam de `conteudo` integral nem de todas as relações. Só
 * `getPublishedBySlug()` (a página de detalhe) devolve `Study` completo.
 * Não existe mais um método que devolva "todos os estudos publicados";
 * cada consumidor pede exatamente o que precisa (por livro, tema,
 * personagem, série, os mais recentes, contagens, ou só os slugs), o que
 * mapeia diretamente para consultas SQL com `WHERE`/`GROUP BY`/`LIMIT`
 * em vez de "trazer tudo e filtrar depois".
 */
export interface StudyRepository {
  /**
   * Os `limit` estudos publicados mais recentes (por `dataOrigem`,
   * decrescente), como `StudySummary`. Em Postgres isto vira `SELECT
   * <colunas enxutas> ... ORDER BY data_origem DESC LIMIT $1` — a
   * implementação mock ordena em memória porque hoje o "banco" é um
   * array, mas a assinatura já é a definitiva.
   */
  listRecent(limit: number): Promise<StudySummary[]>;
  /** Um estudo publicado pelo slug, com todas as relações — para a página de detalhe. `undefined` se não existir/não publicado. */
  getPublishedBySlug(slug: string): Promise<Study | undefined>;
  /**
   * Os slugs de todos os estudos publicados — nada além disso. Existe
   * só para `generateStaticParams()` (`src/app/estudo/[slug]/page.tsx`):
   * gerar as rotas estáticas do build não deve exigir carregar título,
   * resumo, relações nem conteúdo de cada estudo. Em Postgres isto é
   * `SELECT slug FROM studies WHERE status = 'PUBLISHED'`.
   */
  listPublishedSlugs(): Promise<string[]>;
  /** Estudos publicados que citam um livro (e opcionalmente um capítulo específico), como `StudySummary`. */
  listByBookSlug(bookSlug: string, capitulo?: number): Promise<StudySummary[]>;
  /** Estudos publicados vinculados a um tema, como `StudySummary`. */
  listByTopicSlug(topicSlug: string): Promise<StudySummary[]>;
  /** Estudos publicados vinculados a um personagem, como `StudySummary`. */
  listByCharacterSlug(characterSlug: string): Promise<StudySummary[]>;
  /** Estudos publicados vinculados a uma série, como `StudySummary`, ordenados por `ordem`. */
  listBySeriesSlug(seriesSlug: string): Promise<StudySummary[]>;
}

export interface BookRepository {
  listAll(): Promise<Book[]>;
  getBySlug(slug: string): Promise<Book | undefined>;
}

export interface TopicRepository {
  listAll(): Promise<Topic[]>;
  getBySlug(slug: string): Promise<Topic | undefined>;
  /**
   * Quantidade de estudos publicados por tema, indexada por `topic.id`
   * (temas sem nenhum estudo publicado simplesmente não aparecem —
   * trate como 0). Em Postgres: `SELECT topic_id, COUNT(DISTINCT
   * study_id) FROM study_topics st JOIN studies s ON s.id = st.study_id
   * WHERE s.status = 'PUBLISHED' GROUP BY topic_id`. Usado por
   * `/temas` para não precisar carregar todos os estudos só para contar.
   */
  countPublishedStudies(): Promise<Record<string, number>>;
}

export interface CharacterRepository {
  listAll(): Promise<Character[]>;
  getBySlug(slug: string): Promise<Character | undefined>;
  /** Mesmo contrato de `TopicRepository.countPublishedStudies()`, indexado por `character.id`. Usado por `/personagens`. */
  countPublishedStudies(): Promise<Record<string, number>>;
}

export interface SeriesRepository {
  listAll(): Promise<Series[]>;
  getBySlug(slug: string): Promise<Series | undefined>;
  /** Mesmo contrato de `TopicRepository.countPublishedStudies()`, indexado por `series.id`. Usado por `/series`. */
  countPublishedStudies(): Promise<Record<string, number>>;
}

/**
 * Uma referência bíblica já normalizada e validada (ver
 * `src/lib/search/referenceParser.ts`), pronta para ser usada como
 * critério de busca — nunca texto livre. `capitulo`/`versiculoInicio`
 * ausentes significam "livro inteiro" / "capítulo inteiro",
 * respectivamente.
 */
export interface NormalizedReference {
  book: Book;
  capitulo?: number;
  versiculoInicio?: number;
  versiculoFim?: number;
}

/**
 * Critérios de busca aceitos por `SearchRepository.search()`.
 *
 * Este é o contrato pensado para sobreviver à troca do motor em memória
 * (Marco 1) por uma consulta real no Postgres (Fase 2): `texto` vira um
 * `to_tsquery`/`websearch_to_tsquery`, `referencia` vira `WHERE book_id
 * = $1 AND capitulo = $2 ...`, os slugs viram `WHERE ... IN (...)` via
 * joins, e `page`/`limit` viram `LIMIT`/`OFFSET` (ou keyset pagination)
 * — tudo executado no banco, sem carregar a tabela inteira para a
 * aplicação. Nada aqui deve depender de como os dados são armazenados.
 */
export interface SearchQuery {
  /** Texto livre remanescente após qualquer referência bíblica ser extraída da consulta original. */
  texto?: string;
  /** Referência bíblica já normalizada (ver `NormalizedReference`) — nunca uma string crua. */
  referencia?: NormalizedReference;
  /** Slug do livro (filtro Fase C). */
  livro?: string;
  testamento?: TestamentoBiblico;
  /** Slug do tema (filtro Fase C). */
  tema?: string;
  /** Slug do personagem (filtro Fase C). */
  personagem?: string;
  /** Slug da série (filtro Fase C). */
  serie?: string;
  /** Página, 1-based. Padrão: 1. */
  page?: number;
  /** Itens por página. Padrão definido pela implementação (ver `DEFAULT_SEARCH_LIMIT`). */
  limit?: number;
}

export interface SearchResultItem {
  /** `StudySummary`, não `Study` completo (Marco 1.2 — DEC-017): a lista de resultados é um card, não a página de detalhe. */
  study: StudySummary;
  /** Pontuação de relevância — ver pesos documentados em `src/lib/search/search.ts`. */
  score: number;
  /** Motivos do match (referência, título, tema, personagem, palavra-chave, resumo, conteúdo). */
  matchedOn: string[];
}

export interface SearchOutcome {
  items: SearchResultItem[];
  /** Total de resultados que casam com a consulta, ANTES da paginação — necessário para montar paginação real. */
  total: number;
  page: number;
  limit: number;
}

/**
 * Fronteira de busca da aplicação (Marco 1.1 — DEC-013).
 *
 * Antes desta versão, `/busca` chamava `studyRepository.listPublished()`
 * (carregando todo o acervo publicado) e passava o array inteiro para
 * uma função pura de busca. Isso funcionava para ~20 estudos mockados,
 * mas não é a arquitetura correta: um banco real nunca deve trazer
 * todas as linhas para filtrar em memória na aplicação. `SearchRepository`
 * é o único ponto de entrada para busca textual/por referência/filtrada;
 * a implementação mock (`MockSearchRepository`) ainda faz o trabalho em
 * memória, mas atrás desta mesma interface — que uma futura
 * implementação Postgres (Fase 2) preenche com uma consulta real
 * (full-text search + índices), sem exigir mudanças na página `/busca`
 * nem em nenhum outro consumidor.
 *
 * Parsing de texto livre (detectar se a consulta contém uma referência
 * bíblica) é responsabilidade de `src/lib/search/queryParsing.ts`, uma
 * camada acima desta — `SearchRepository` só recebe critérios já
 * estruturados e nunca lida com strings de busca ambíguas.
 */
export interface SearchRepository {
  search(query: SearchQuery): Promise<SearchOutcome>;
}
