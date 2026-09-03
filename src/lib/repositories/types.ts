import type { Book, Character, Series, Study, TestamentoBiblico, Topic } from "@/lib/types";

/**
 * Contratos de repositório do acervo.
 *
 * Cada interface descreve como a aplicação lê os dados, independentemente
 * de onde eles vêm. Nesta fase (Marco 1) só existe `MockStudyRepository`
 * (ver `mock.ts`), operando sobre os dados de `src/lib/data`. Na Fase 2 do
 * roadmap, uma `SupabaseStudyRepository` implementará a mesma interface
 * consultando o Postgres via Supabase — sem exigir mudanças em páginas,
 * componentes ou na lógica de busca, que dependem apenas destas interfaces.
 */
export interface StudyRepository {
  /**
   * Todos os estudos publicados e públicos.
   *
   * ATENÇÃO (Marco 1.1 — DEC-013): este método existe para casos que
   * genuinamente precisam do conjunto inteiro (ex.: os testes de
   * integridade de dados em `src/lib/data/studies.test.ts`). Ele NÃO é
   * a interface definitiva para busca, contagens ou "últimos estudos" —
   * usá-lo para isso significa carregar tudo na memória da aplicação e
   * filtrar/ordenar/paginar em JavaScript, o que não escala para um
   * banco real. Para busca, use `SearchRepository.search()`. Para os
   * estudos mais recentes, use `listRecent()`. Se precisar de contagens
   * por tema/personagem/série no futuro, adicione um método dedicado
   * (`countByTopicSlug` etc.) em vez de reaproveitar este.
   */
  listPublished(): Promise<Study[]>;
  /**
   * Os `limit` estudos publicados mais recentes (por `dataOrigem`,
   * decrescente). Em Postgres isto vira `ORDER BY data_origem DESC
   * LIMIT $1` — a implementação mock ordena em memória porque hoje o
   * "banco" é um array, mas a assinatura já é a definitiva.
   */
  listRecent(limit: number): Promise<Study[]>;
  /** Um estudo publicado pelo slug, ou undefined se não existir/não publicado. */
  getPublishedBySlug(slug: string): Promise<Study | undefined>;
  /** Estudos publicados que citam um livro (e opcionalmente um capítulo específico). */
  listByBookSlug(bookSlug: string, capitulo?: number): Promise<Study[]>;
  /** Estudos publicados vinculados a um tema. */
  listByTopicSlug(topicSlug: string): Promise<Study[]>;
  /** Estudos publicados vinculados a um personagem. */
  listByCharacterSlug(characterSlug: string): Promise<Study[]>;
  /** Estudos publicados vinculados a uma série, ordenados por `ordem`. */
  listBySeriesSlug(seriesSlug: string): Promise<Study[]>;
}

export interface BookRepository {
  listAll(): Promise<Book[]>;
  getBySlug(slug: string): Promise<Book | undefined>;
}

export interface TopicRepository {
  listAll(): Promise<Topic[]>;
  getBySlug(slug: string): Promise<Topic | undefined>;
}

export interface CharacterRepository {
  listAll(): Promise<Character[]>;
  getBySlug(slug: string): Promise<Character | undefined>;
}

export interface SeriesRepository {
  listAll(): Promise<Series[]>;
  getBySlug(slug: string): Promise<Series | undefined>;
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
  study: Study;
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
