import { getSupabaseClient } from "@/lib/supabase/client";
import { mapCharacterRow } from "@/lib/repositories/supabase/mappers";
import type { CharacterRow } from "@/lib/repositories/supabase/rows";
import type { CharacterRepository } from "@/lib/repositories/types";

const CHARACTER_COLUMNS = "id, nome, slug, descricao";

/** Implementação Supabase de `CharacterRepository` — mesmo padrão de `SupabaseTopicRepository`. */
export class SupabaseCharacterRepository implements CharacterRepository {
  async listAll() {
    const { data, error } = await getSupabaseClient()
      .from("characters")
      .select(CHARACTER_COLUMNS)
      .order("nome", { ascending: true });
    if (error) throw new Error(`SupabaseCharacterRepository.listAll: ${error.message}`);
    return ((data ?? []) as CharacterRow[]).map(mapCharacterRow);
  }

  async getBySlug(slug: string) {
    const { data, error } = await getSupabaseClient()
      .from("characters")
      .select(CHARACTER_COLUMNS)
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw new Error(`SupabaseCharacterRepository.getBySlug: ${error.message}`);
    return data ? mapCharacterRow(data as CharacterRow) : undefined;
  }

  async countPublishedStudies() {
    const { data, error } = await getSupabaseClient().from("character_study_counts").select("character_id, total");
    if (error) throw new Error(`SupabaseCharacterRepository.countPublishedStudies: ${error.message}`);
    const counts: Record<string, number> = {};
    for (const row of (data ?? []) as Array<{ character_id: string; total: number }>) {
      counts[row.character_id] = row.total;
    }
    return counts;
  }
}
