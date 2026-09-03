import {
  MockBookRepository,
  MockCharacterRepository,
  MockSearchRepository,
  MockSeriesRepository,
  MockStudyRepository,
  MockTopicRepository,
} from "@/lib/repositories/mock";
import {
  SupabaseBookRepository,
  SupabaseCharacterRepository,
  SupabaseSearchRepository,
  SupabaseSeriesRepository,
  SupabaseStudyRepository,
  SupabaseTopicRepository,
} from "@/lib/repositories/supabase";
import { isSupabaseConfigured } from "@/lib/supabase/client";

/**
 * Ponto único de composição dos repositórios usados pela aplicação.
 *
 * Páginas e componentes devem importar as instâncias daqui, nunca
 * instanciar `MockStudyRepository`/`SupabaseStudyRepository` diretamente
 * (CLAUDE.md §3). A escolha entre mock e Supabase é decidida uma única
 * vez, aqui, por variável de ambiente:
 *
 * - `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` ambas
 *   definidas (ver `.env.example`) -> repositórios Supabase (Fase 2).
 * - Caso contrário (o padrão hoje neste ambiente de desenvolvimento,
 *   sem projeto Supabase configurado) -> repositórios mock (Marco 1),
 *   exatamente como antes desta fase.
 *
 * Isso é o que permite "o mesmo site rodar contra um banco Supabase sem
 * alterar a arquitetura das páginas" (docs/WORK_STATUS.md, Fase 2): a
 * troca é 100% configuração, nenhuma página precisa saber qual
 * implementação está ativa.
 */
const useSupabase = isSupabaseConfigured();

export const studyRepository = useSupabase ? new SupabaseStudyRepository() : new MockStudyRepository();
export const bookRepository = useSupabase ? new SupabaseBookRepository() : new MockBookRepository();
export const topicRepository = useSupabase ? new SupabaseTopicRepository() : new MockTopicRepository();
export const characterRepository = useSupabase ? new SupabaseCharacterRepository() : new MockCharacterRepository();
export const seriesRepository = useSupabase ? new SupabaseSeriesRepository() : new MockSeriesRepository();
export const searchRepository = useSupabase ? new SupabaseSearchRepository() : new MockSearchRepository();

export type {
  BookRepository,
  CharacterRepository,
  NormalizedReference,
  SearchOutcome,
  SearchQuery,
  SearchRepository,
  SearchResultItem,
  SeriesRepository,
  StudyRepository,
  TopicRepository,
} from "@/lib/repositories/types";
