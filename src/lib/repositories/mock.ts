import { publishedStudies } from "@/lib/data/studies";
import { books, getBookBySlug } from "@/lib/data/books";
import { topics, getTopicBySlug } from "@/lib/data/topics";
import { characters, getCharacterBySlug } from "@/lib/data/characters";
import { seriesList, getSeriesBySlug } from "@/lib/data/series";
import { matchesFilters, scoreStudy } from "@/lib/search/search";
import type {
  BookRepository,
  CharacterRepository,
  SearchOutcome,
  SearchQuery,
  SearchRepository,
  SeriesRepository,
  StudyRepository,
  TopicRepository,
} from "@/lib/repositories/types";

/** Página/limite padrão quando a consulta não especifica (ver `SearchQuery`). */
const DEFAULT_SEARCH_PAGE = 1;
const DEFAULT_SEARCH_LIMIT = 24;

/**
 * Implementação em memória dos repositórios, usada no Marco 1.
 *
 * Todos os métodos são `async` mesmo operando sobre arrays em memória, de
 * propósito: mantém a mesma assinatura que uma futura implementação com
 * Supabase (I/O real) terá, para que nenhum código que consome o
 * repositório precise mudar quando a Fase 2 trocar a implementação.
 */
export class MockStudyRepository implements StudyRepository {
  async listPublished() {
    return publishedStudies;
  }

  async listRecent(limit: number) {
    return [...publishedStudies]
      .sort((a, b) => (a.dataOrigem < b.dataOrigem ? 1 : a.dataOrigem > b.dataOrigem ? -1 : 0))
      .slice(0, limit);
  }

  async getPublishedBySlug(slug: string) {
    return publishedStudies.find((study) => study.slug === slug);
  }

  async listByBookSlug(bookSlug: string, capitulo?: number) {
    return publishedStudies.filter((study) =>
      study.passagens.some(
        (p) => p.book.slug === bookSlug && (capitulo == null || p.passage.capitulo === capitulo),
      ),
    );
  }

  async listByTopicSlug(topicSlug: string) {
    return publishedStudies.filter((study) =>
      study.temas.some((t) => t.topic.slug === topicSlug),
    );
  }

  async listByCharacterSlug(characterSlug: string) {
    return publishedStudies.filter((study) =>
      study.personagens.some((p) => p.character.slug === characterSlug),
    );
  }

  async listBySeriesSlug(seriesSlug: string) {
    return publishedStudies
      .filter((study) => study.series.some((s) => s.series.slug === seriesSlug))
      .sort((a, b) => {
        const ordemA = a.series.find((s) => s.series.slug === seriesSlug)?.ordem ?? 0;
        const ordemB = b.series.find((s) => s.series.slug === seriesSlug)?.ordem ?? 0;
        return ordemA - ordemB;
      });
  }
}

export class MockBookRepository implements BookRepository {
  async listAll() {
    return books;
  }
  async getBySlug(slug: string) {
    return getBookBySlug(slug);
  }
}

export class MockTopicRepository implements TopicRepository {
  async listAll() {
    return topics;
  }
  async getBySlug(slug: string) {
    return getTopicBySlug(slug);
  }
}

export class MockCharacterRepository implements CharacterRepository {
  async listAll() {
    return characters;
  }
  async getBySlug(slug: string) {
    return getCharacterBySlug(slug);
  }
}

export class MockSeriesRepository implements SeriesRepository {
  async listAll() {
    return seriesList;
  }
  async getBySlug(slug: string) {
    return getSeriesBySlug(slug);
  }
}

/**
 * Implementação em memória de `SearchRepository` (ver o contrato e a
 * justificativa completa em `src/lib/repositories/types.ts`).
 *
 * Filtra, pontua (via `scoreStudy`, `src/lib/search/search.ts`), ordena
 * e pagina — nesta ordem — sobre `publishedStudies`. Uma futura
 * `SupabaseSearchRepository` faz o mesmo trabalho com uma única consulta
 * SQL (WHERE + ORDER BY + LIMIT/OFFSET), sem alterar esta interface nem
 * `src/app/busca/page.tsx`.
 */
export class MockSearchRepository implements SearchRepository {
  async search(query: SearchQuery): Promise<SearchOutcome> {
    const page = query.page && query.page > 0 ? Math.floor(query.page) : DEFAULT_SEARCH_PAGE;
    const limit = query.limit && query.limit > 0 ? Math.floor(query.limit) : DEFAULT_SEARCH_LIMIT;

    const hasQuery = Boolean(query.referencia || (query.texto && query.texto.trim().length > 0));
    const hasActiveFilter = Boolean(query.livro || query.testamento || query.tema || query.personagem || query.serie);

    const scored = publishedStudies
      .filter((study) => matchesFilters(study, query))
      .map((study) => ({ study, ...scoreStudy(study, query) }))
      // Sem nenhum texto/referência de busca, mas com ao menos um filtro
      // ativo (ex.: combo de tema/livro na página de busca), todo estudo
      // que passou pelos filtros é um resultado válido — filtro puro sem
      // texto ainda é uma navegação legítima. Sem filtro e sem consulta,
      // não há nada a mostrar.
      .filter((item) => item.score > 0 || (!hasQuery && hasActiveFilter))
      .sort((a, b) => b.score - a.score || a.study.titulo.localeCompare(b.study.titulo, "pt-BR"));

    const total = scored.length;
    const start = (page - 1) * limit;
    const items = scored.slice(start, start + limit);

    return { items, total, page, limit };
  }
}
