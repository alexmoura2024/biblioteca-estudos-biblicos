import { getSupabaseClient } from "@/lib/supabase/client";
import type {
  StudyCharacterJoinRow,
  StudyPassageJoinRow,
  StudySeriesJoinRow,
  StudyTopicJoinRow,
} from "@/lib/repositories/supabase/rows";

/**
 * Consultas das quatro tabelas de junção (`study_passages`/`study_topics`/
 * `study_characters`/`study_series`) para um lote de `studyIds`, extraídas
 * como funções independentes (Fase 2, Etapa 11) para serem reaproveitadas
 * por qualquer repositório que precise montar `StudySummary`/`Study` a
 * partir de um conjunto de ids — hoje `SupabaseStudyRepository`
 * (`studies.ts`) e `SupabaseSearchRepository` (`search.ts`), que antes da
 * Etapa 11 devolvia resultados de busca sem `temas`/`series` resolvidos
 * (limitação documentada; corrigida reaproveitando exatamente este código,
 * em vez de duplicá-lo). Sempre uma consulta por relação para o lote
 * inteiro — nunca uma consulta por estudo (sem N+1).
 */

const PASSAGE_JOIN_SELECT =
  "study_id, tipo_relacao, prioridade, passages(id, book_id, capitulo, versiculo_inicio, versiculo_fim, referencia_normalizada, books(id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos))";
const TOPIC_JOIN_SELECT = "study_id, peso, topics(id, nome, slug, descricao)";
const CHARACTER_JOIN_SELECT = "study_id, papel, characters(id, nome, slug, descricao)";
const SERIES_JOIN_SELECT = "study_id, ordem, series(id, nome, slug, descricao)";

export async function fetchPassageJoins(studyIds: string[]): Promise<StudyPassageJoinRow[]> {
  if (studyIds.length === 0) return [];
  const { data, error } = await getSupabaseClient().from("study_passages").select(PASSAGE_JOIN_SELECT).in("study_id", studyIds);
  if (error) throw new Error(`fetchPassageJoins: ${error.message}`);
  return (data ?? []) as unknown as StudyPassageJoinRow[];
}

export async function fetchTopicJoins(studyIds: string[]): Promise<StudyTopicJoinRow[]> {
  if (studyIds.length === 0) return [];
  const { data, error } = await getSupabaseClient().from("study_topics").select(TOPIC_JOIN_SELECT).in("study_id", studyIds);
  if (error) throw new Error(`fetchTopicJoins: ${error.message}`);
  return (data ?? []) as unknown as StudyTopicJoinRow[];
}

export async function fetchCharacterJoins(studyIds: string[]): Promise<StudyCharacterJoinRow[]> {
  if (studyIds.length === 0) return [];
  const { data, error } = await getSupabaseClient().from("study_characters").select(CHARACTER_JOIN_SELECT).in("study_id", studyIds);
  if (error) throw new Error(`fetchCharacterJoins: ${error.message}`);
  return (data ?? []) as unknown as StudyCharacterJoinRow[];
}

export async function fetchSeriesJoins(studyIds: string[]): Promise<StudySeriesJoinRow[]> {
  if (studyIds.length === 0) return [];
  const { data, error } = await getSupabaseClient().from("study_series").select(SERIES_JOIN_SELECT).in("study_id", studyIds);
  if (error) throw new Error(`fetchSeriesJoins: ${error.message}`);
  return (data ?? []) as unknown as StudySeriesJoinRow[];
}
