import { describe, expect, it, vi } from "vitest";
import { createMockSupabaseClient } from "@/lib/repositories/supabase/testUtils";

const getSupabaseClientMock = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  getSupabaseClient: () => getSupabaseClientMock(),
}));

const { SupabaseCharacterRepository } = await import("@/lib/repositories/supabase/characters");

const CHARACTER_ROW = { id: "char-uuid-1", nome: "Davi", slug: "davi", descricao: "Rei de Israel." };

describe("SupabaseCharacterRepository", () => {
  it("listAll mapeia as linhas para Character", async () => {
    getSupabaseClientMock.mockReturnValue(
      createMockSupabaseClient({ tables: { characters: { data: [CHARACTER_ROW], error: null } } }),
    );
    expect(await new SupabaseCharacterRepository().listAll()).toEqual([
      { id: "char-uuid-1", nome: "Davi", slug: "davi", descricao: "Rei de Israel." },
    ]);
  });

  it("getBySlug mapeia a linha quando encontrada", async () => {
    getSupabaseClientMock.mockReturnValue(
      createMockSupabaseClient({ tables: { characters: { data: CHARACTER_ROW, error: null } } }),
    );
    expect((await new SupabaseCharacterRepository().getBySlug("davi"))?.nome).toBe("Davi");
  });

  it("countPublishedStudies lê a view character_study_counts e indexa por character_id", async () => {
    getSupabaseClientMock.mockReturnValue(
      createMockSupabaseClient({
        tables: { character_study_counts: { data: [{ character_id: "char-uuid-1", total: 4 }], error: null } },
      }),
    );
    expect(await new SupabaseCharacterRepository().countPublishedStudies()).toEqual({ "char-uuid-1": 4 });
  });

  it("propaga erro do Postgres", async () => {
    getSupabaseClientMock.mockReturnValue(
      createMockSupabaseClient({ tables: { characters: { data: null, error: { message: "timeout" } } } }),
    );
    await expect(new SupabaseCharacterRepository().listAll()).rejects.toThrow(/timeout/);
  });
});
