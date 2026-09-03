import { publishedStudies } from "@/lib/data/studies";
import { books, getBookBySlug } from "@/lib/data/books";
import { topics, getTopicBySlug } from "@/lib/data/topics";
import { characters, getCharacterBySlug } from "@/lib/data/characters";
import { seriesList, getSeriesBySlug } from "@/lib/data/series";
import { matchesFilters, scoreStudy } from "@/lib/search/search";
import type { Study, StudySummary } from "@/lib/types";
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
 * Projeta um `Study` completo para `StudySummary` (Marco 1.2 — DEC-017).
 *
 * Isto é um detalhe de implementação do repositório MOCK: como os dados
 * em memória já vêm com todas as relações resolvidas, a única forma de
 * "não carregar tudo" é recortar depois. Uma implementação Postgres não
 * precisa desta função — ela simplesmente faz um `SELECT` com menos
 * colunas/joins desde o início.
 */
function toStudySummary(study: Study): StudySummary {
  const principal = study.passagens.find((p) => p.tipoRelacao === "principal") ?? study.passagens[0];
  return {
    id: study.id,
    slug: study.slug,
    titulo: study.titulo,
    resumo: study.resumo,
    autor: study.autor,
    dataOrigem: study.dataOrigem,
    referenciaPrincipal: principal
      ? {
          referenciaNormalizada: principal.passage.referenciaNormalizada,
          bookSlug: principal.book.slug,
          capitulo: principal.passage.capitulo,
        }
      : undefined,
    temas: study.temas,
    series: study.series,
  };
}

/**
 * Implementação em memória dos repositórios, usada no Marco 1.
 *
 * Todos os métodos são `async` mesmo operando sobre arrays em memória, de
 * propósito: mantém a mesma assinatura que uma futura implementação com
 * Supabase (I/O real) terá, para que nenhum código que consome o
 * repositório precise mudar quando a Fase 2 trocar a implementação.
 */
export class MockStudyRepository implements StudyRepository {
  async listRecent(limit: number) {
    return [...publishedStudies]
      .sort((a, b) => (a.dataOrigem < b.dataOrigem ? 1 : a.dataOrigem > b.dataOrigem ? -1 : 0))
      .slice(0, limit)
      .map(toStudySummary);
  }

  async getPublishedBySlug(slug: string) {
    return publishedStudies.find((study) => study.slug === slug);
  }

  async listPublishedSlugs() {
    return publishedStudies.map((study) => study.slug);
  }

  async listByBookSlug(bookSlug: string, capitulo?: number) {
    return publishedStudies
      .filter((study) =>
        study.passagens.some(
          (p) => p.book.slug === bookSlug && (capitulo == null || p.passage.capitulo === capitulo),
        ),
      )
      .map(toStudySummary);
  }

  async listByTopicSlug(topicSlug: string) {
    return publishedStudies
      .filter((study) => study.temas.some((t) => t.topic.slug === topicSlug))
      .map(toStudySummary);
  }

  async listByCharacterSlug(characterSlug: string) {
    return publishedStudies
      .filter((study) => study.personagens.some((p) => p.character.slug === characterSlug))
      .map(toStudySummary);
  }

  async listBySeriesSlug(seriesSlug: string) {
    return publishedStudies
      .filter((study) => study.series.some((s) => s.series.slug === seriesSlug))
      .sort((a, b) => {
        const ordemA = a.series.find((s) => s.series.slug === seriesSlug)?.ordem ?? 0;
        const ordemB = b.series.find((s) => s.series.slug === seriesSlug)?.ordem ?? 0;
        return ordemA - ordemB;
      })
      .map(toStudySummary);
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

/** Conta, por id de tema, quantos estudos publicados o citam — implementação em memória de `countPublishedStudies()`. */
function countPublishedByTopic(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const study of publishedStudies) {
    for (const { topic } of study.temas) {
      counts[topic.id] = (counts[topic.id] ?? 0) + 1;
    }
  }
  return counts;
}

function countPublishedByCharacter(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const study of publishedStudies) {
    for (const { character } of study.personagens) {
      counts[character.id] = (counts[character.id] ?? 0) + 1;
    }
  }
  return counts;
}

function countPublishedBySeries(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const study of publishedStudies) {
    for (const { series } of study.series) {
      counts[series.id] = (counts[series.id] ?? 0) + 1;
    }
  }
  return counts;
}

export class MockTopicRepository implements TopicRepository {
  async listAll() {
    return topics;
  }
  async getBySlug(slug: string) {
    return getTopicBySlug(slug);
  }
  async countPublishedStudies() {
    return countPublishedByTopic();
  }
}

export class MockCharacterRepository implements CharacterRepository {
  async listAll() {
    return characters;
  }
  async getBySlug(slug: string) {
    return getCharacterBySlug(slug);
  }
  async countPublishedStudies() {
    return countPublishedByCharacter();
  }
}

export class MockSeriesRepository implements SeriesRepository {
  async listAll() {
    return seriesList;
  }
  async getBySlug(slug: string) {
    return getSeriesBySlug(slug);
  }
  async countPublishedStudies() {
    return countPublishedBySeries();
  }
}

/**
 * Implementação em memória de `SearchRepository` (ver o contrato e a
 * justificativa completa em `src/lib/repositories/types.ts`).
 *
 * Filtra e pontua (via `scoreStudy`, `src/lib/search/search.ts`) contra o
 * `Study` completo — a pontuação lexical precisa do texto integral
 * (título, resumo, conteúdo, palavras-chave) — mas o resultado exposto
 * ao chamador é sempre `StudySummary` (Marco 1.2 — DEC-017): a página de
 * busca renderiza cards, não o conteúdo inteiro de cada estudo. Uma
 * futura `SupabaseSearchRepository` faz o ranking dentro do próprio SQL
 * (full-text search) e só faz `SELECT` das colunas enxutas no resultado
 * final — nunca materializa `Study` completo na aplicação.
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
    const items = scored
      .slice(start, start + limit)
      .map(({ study, score, matchedOn }) => ({ study: toStudySummary(study), score, matchedOn }));

    return { items, total, page, limit };
  }
}
