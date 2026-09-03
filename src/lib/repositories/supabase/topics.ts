import { getSupabaseClient } from "@/lib/supabase/client";
import { mapTopicRow } from "@/lib/repositories/supabase/mappers";
import type { TopicRow } from "@/lib/repositories/supabase/rows";
import type { TopicRepository } from "@/lib/repositories/types";

const TOPIC_COLUMNS = "id, nome, slug, descricao";

/**
 * Implementação Supabase de `TopicRepository`. `countPublishedStudies()`
 * consulta a view `topic_study_counts`
 * (supabase/migrations/..._counts_views.sql — `security_invoker`, então
 * respeita a RLS de `studies`: só conta estudos PUBLISHED+publico) em
 * vez de carregar todos os estudos e contar em memória (DEC-018).
 */
export class SupabaseTopicRepository implements TopicRepository {
  async listAll() {
    const { data, error } = await getSupabaseClient()
      .from("topics")
      .select(TOPIC_COLUMNS)
      .order("nome", { ascending: true });
    if (error) throw new Error(`SupabaseTopicRepository.listAll: ${error.message}`);
    return ((data ?? []) as TopicRow[]).map(mapTopicRow);
  }

  async getBySlug(slug: string) {
    const { data, error } = await getSupabaseClient()
      .from("topics")
      .select(TOPIC_COLUMNS)
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw new Error(`SupabaseTopicRepository.getBySlug: ${error.message}`);
    return data ? mapTopicRow(data as TopicRow) : undefined;
  }

  async countPublishedStudies() {
    const { data, error } = await getSupabaseClient().from("topic_study_counts").select("topic_id, total");
    if (error) throw new Error(`SupabaseTopicRepository.countPublishedStudies: ${error.message}`);
    const counts: Record<string, number> = {};
    for (const row of (data ?? []) as Array<{ topic_id: string; total: number }>) {
      counts[row.topic_id] = row.total;
    }
    return counts;
  }
}
