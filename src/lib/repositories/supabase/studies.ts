import { getSupabaseClient } from "@/lib/supabase/client";
import { assembleStudy, assembleStudySummary } from "@/lib/repositories/supabase/mappers";
import { fetchCharacterJoins, fetchPassageJoins, fetchSeriesJoins, fetchTopicJoins } from "@/lib/repositories/supabase/relations";
import type { StudyRow } from "@/lib/repositories/supabase/rows";
import type { StudyRepository } from "@/lib/repositories/types";
import type { StudySummary } from "@/lib/types";

const STUDY_SUMMARY_COLUMNS = "id, titulo, slug, resumo, conteudo, status, visibilidade, autor, data_origem, palavras_chave, created_at, updated_at";

/**
 * Implementação Supabase de `StudyRepository` (Fase 2, Etapa 8).
 *
 * Toda leitura pública filtra explicitamente por
 * `status='PUBLISHED' AND visibilidade='publico'` — em duplicidade
 * proposital com a RLS de `public.studies`: a RLS é a garantia real
 * (funciona mesmo se este código tiver um bug), o filtro aqui é defesa
 * em profundidade e também reduz o volume de dados trafegado. Nunca
 * remova um dos dois achando o outro redundante.
 *
 * `listRecent`/`listByBookSlug`/`listByTopicSlug`/`listByCharacterSlug`/
 * `listBySeriesSlug` devolvem `StudySummary` (DEC-017) e nunca carregam
 * `conteudo` nem todas as relações de cada estudo — só
 * `getPublishedBySlug` (a página de detalhe) faz isso.
 */
export class SupabaseStudyRepository implements StudyRepository {
  async listRecent(limit: number): Promise<StudySummary[]> {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from("studies")
      .select("id")
      .eq("status", "PUBLISHED")
      .eq("visibilidade", "publico")
      .order("data_origem", { ascending: false })
      .limit(limit);
    if (error) throw new Error(`SupabaseStudyRepository.listRecent: ${error.message}`);

    const ids = (data ?? []).map((row) => row.id as string);
    return this.buildSummariesInOrder(ids);
  }

  async getPublishedBySlug(slug: string) {
    const client = getSupabaseClient();
    const { data: studyRow, error: studyError } = await client
      .from("studies")
      .select(STUDY_SUMMARY_COLUMNS)
      .eq("slug", slug)
      .eq("status", "PUBLISHED")
      .eq("visibilidade", "publico")
      .maybeSingle();
    if (studyError) throw new Error(`SupabaseStudyRepository.getPublishedBySlug: ${studyError.message}`);
    if (!studyRow) return undefined;

    const study = studyRow as StudyRow;
    const [passages, topics, characters, series] = await Promise.all([
      fetchPassageJoins([study.id]),
      fetchTopicJoins([study.id]),
      fetchCharacterJoins([study.id]),
      fetchSeriesJoins([study.id]),
    ]);

    return assembleStudy(study, passages, topics, characters, series);
  }

  async listPublishedSlugs(): Promise<string[]> {
    const { data, error } = await getSupabaseClient()
      .from("studies")
      .select("slug")
      .eq("status", "PUBLISHED")
      .eq("visibilidade", "publico");
    if (error) throw new Error(`SupabaseStudyRepository.listPublishedSlugs: ${error.message}`);
    return (data ?? []).map((row) => row.slug as string);
  }

  async listByBookSlug(bookSlug: string, capitulo?: number): Promise<StudySummary[]> {
    const client = getSupabaseClient();
    let query = client
      .from("study_passages")
      .select("study_id, passages!inner(capitulo, books!inner(slug))")
      .eq("passages.books.slug", bookSlug);
    if (capitulo != null) query = query.eq("passages.capitulo", capitulo);

    const { data, error } = await query;
    if (error) throw new Error(`SupabaseStudyRepository.listByBookSlug: ${error.message}`);

    const ids = [...new Set((data ?? []).map((row) => row.study_id as string))];
    return this.buildSummaries(ids);
  }

  async listByTopicSlug(topicSlug: string): Promise<StudySummary[]> {
    const { data, error } = await getSupabaseClient()
      .from("study_topics")
      .select("study_id, topics!inner(slug)")
      .eq("topics.slug", topicSlug);
    if (error) throw new Error(`SupabaseStudyRepository.listByTopicSlug: ${error.message}`);

    const ids = [...new Set((data ?? []).map((row) => row.study_id as string))];
    return this.buildSummaries(ids);
  }

  async listByCharacterSlug(characterSlug: string): Promise<StudySummary[]> {
    const { data, error } = await getSupabaseClient()
      .from("study_characters")
      .select("study_id, characters!inner(slug)")
      .eq("characters.slug", characterSlug);
    if (error) throw new Error(`SupabaseStudyRepository.listByCharacterSlug: ${error.message}`);

    const ids = [...new Set((data ?? []).map((row) => row.study_id as string))];
    return this.buildSummaries(ids);
  }

  async listBySeriesSlug(seriesSlug: string): Promise<StudySummary[]> {
    const { data, error } = await getSupabaseClient()
      .from("study_series")
      .select("study_id, ordem, series!inner(slug)")
      .eq("series.slug", seriesSlug)
      .order("ordem", { ascending: true });
    if (error) throw new Error(`SupabaseStudyRepository.listBySeriesSlug: ${error.message}`);

    const orderedIds = (data ?? []).map((row) => row.study_id as string);
    return this.buildSummariesInOrder(orderedIds);
  }

  // ------------------------------------------------------------
  // Helpers privados — nenhum é parte do contrato StudyRepository.
  // As consultas das quatro tabelas de junção vivem em
  // src/lib/repositories/supabase/relations.ts (Fase 2, Etapa 11) —
  // compartilhadas com SupabaseSearchRepository, que também precisa
  // montar StudySummary a partir de um lote de ids.
  // ------------------------------------------------------------

  /**
   * Busca os dados de `studyIds` e monta `StudySummary[]`, em quatro
   * consultas paralelas (estudos + as três relações que um resumo
   * precisa — passagens só para achar a principal), nunca uma consulta
   * por estudo (sem N+1). Ordem do array de saída não é garantida —
   * use `buildSummariesInOrder` quando a ordem importar.
   */
  private async buildSummaries(studyIds: string[]): Promise<StudySummary[]> {
    if (studyIds.length === 0) return [];
    const client = getSupabaseClient();

    const [studiesResult, passages, topics, series] = await Promise.all([
      client
        .from("studies")
        .select(STUDY_SUMMARY_COLUMNS)
        .in("id", studyIds)
        .eq("status", "PUBLISHED")
        .eq("visibilidade", "publico"),
      fetchPassageJoins(studyIds),
      fetchTopicJoins(studyIds),
      fetchSeriesJoins(studyIds),
    ]);
    if (studiesResult.error) throw new Error(`SupabaseStudyRepository (studies): ${studiesResult.error.message}`);

    const studyRows = (studiesResult.data ?? []) as StudyRow[];
    return studyRows.map((studyRow) =>
      assembleStudySummary(
        studyRow,
        passages.filter((p) => p.study_id === studyRow.id),
        topics.filter((t) => t.study_id === studyRow.id),
        series.filter((s) => s.study_id === studyRow.id),
      ),
    );
  }

  /** Como `buildSummaries`, mas preserva a ordem de `studyIds` no array de saída. */
  private async buildSummariesInOrder(studyIds: string[]): Promise<StudySummary[]> {
    const summaries = await this.buildSummaries(studyIds);
    const position = new Map(studyIds.map((id, index) => [id, index]));
    return [...summaries].sort((a, b) => (position.get(a.id) ?? 0) - (position.get(b.id) ?? 0));
  }
}
