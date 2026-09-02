import {
  MockBookRepository,
  MockCharacterRepository,
  MockSeriesRepository,
  MockStudyRepository,
  MockTopicRepository,
} from "@/lib/repositories/mock";

/**
 * Ponto único de composição dos repositórios usados pela aplicação.
 *
 * Páginas e componentes devem importar as instâncias daqui, nunca
 * instanciar `MockStudyRepository` (ou uma futura `SupabaseStudyRepository`)
 * diretamente. Quando a Fase 2 (docs/ROADMAP.md) conectar o Supabase, troca-se
 * a implementação apenas neste arquivo.
 */
export const studyRepository = new MockStudyRepository();
export const bookRepository = new MockBookRepository();
export const topicRepository = new MockTopicRepository();
export const characterRepository = new MockCharacterRepository();
export const seriesRepository = new MockSeriesRepository();

export type {
  BookRepository,
  CharacterRepository,
  SeriesRepository,
  StudyRepository,
  TopicRepository,
} from "@/lib/repositories/types";
