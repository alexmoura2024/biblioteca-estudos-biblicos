import { publishedStudies } from "@/lib/data/studies";
import { books, getBookBySlug } from "@/lib/data/books";
import { topics, getTopicBySlug } from "@/lib/data/topics";
import { characters, getCharacterBySlug } from "@/lib/data/characters";
import { seriesList, getSeriesBySlug } from "@/lib/data/series";
import type {
  BookRepository,
  CharacterRepository,
  SeriesRepository,
  StudyRepository,
  TopicRepository,
} from "@/lib/repositories/types";

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
