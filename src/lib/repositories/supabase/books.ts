import { getSupabaseClient } from "@/lib/supabase/client";
import { mapBookRow } from "@/lib/repositories/supabase/mappers";
import type { BookRow } from "@/lib/repositories/supabase/rows";
import type { BookRepository } from "@/lib/repositories/types";

const BOOK_COLUMNS = "id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos";

/**
 * Implementação Supabase de `BookRepository`. `books` é metadado
 * público (sem estado editorial) — RLS permite `select` livre para
 * `anon`/`authenticated` (ver supabase/migrations/..._rls_policies.sql).
 */
export class SupabaseBookRepository implements BookRepository {
  async listAll() {
    const { data, error } = await getSupabaseClient()
      .from("books")
      .select(BOOK_COLUMNS)
      .order("ordem_canonica", { ascending: true });
    if (error) throw new Error(`SupabaseBookRepository.listAll: ${error.message}`);
    return ((data ?? []) as BookRow[]).map(mapBookRow);
  }

  async getBySlug(slug: string) {
    const { data, error } = await getSupabaseClient()
      .from("books")
      .select(BOOK_COLUMNS)
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw new Error(`SupabaseBookRepository.getBySlug: ${error.message}`);
    return data ? mapBookRow(data as BookRow) : undefined;
  }
}
