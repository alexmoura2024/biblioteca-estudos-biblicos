import { getSupabaseClient } from "@/lib/supabase/client";
import { mapSeriesRow } from "@/lib/repositories/supabase/mappers";
import type { SeriesRow } from "@/lib/repositories/supabase/rows";
import type { SeriesRepository } from "@/lib/repositories/types";

const SERIES_COLUMNS = "id, nome, slug, descricao";

/** Implementação Supabase de `SeriesRepository` — mesmo padrão de `SupabaseTopicRepository`. */
export class SupabaseSeriesRepository implements SeriesRepository {
  async listAll() {
    const { data, error } = await getSupabaseClient()
      .from("series")
      .select(SERIES_COLUMNS)
      .order("nome", { ascending: true });
    if (error) throw new Error(`SupabaseSeriesRepository.listAll: ${error.message}`);
    return ((data ?? []) as SeriesRow[]).map(mapSeriesRow);
  }

  async getBySlug(slug: string) {
    const { data, error } = await getSupabaseClient()
      .from("series")
      .select(SERIES_COLUMNS)
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw new Error(`SupabaseSeriesRepository.getBySlug: ${error.message}`);
    return data ? mapSeriesRow(data as SeriesRow) : undefined;
  }

  async countPublishedStudies() {
    const { data, error } = await getSupabaseClient().from("series_study_counts").select("series_id, total");
    if (error) throw new Error(`SupabaseSeriesRepository.countPublishedStudies: ${error.message}`);
    const counts: Record<string, number> = {};
    for (const row of (data ?? []) as Array<{ series_id: string; total: number }>) {
      counts[row.series_id] = row.total;
    }
    return counts;
  }
}
