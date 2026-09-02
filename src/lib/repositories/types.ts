import type { Book, Character, Series, Study, Topic } from "@/lib/types";

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
  /** Todos os estudos publicados e públicos, para busca e listagens. */
  listPublished(): Promise<Study[]>;
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
