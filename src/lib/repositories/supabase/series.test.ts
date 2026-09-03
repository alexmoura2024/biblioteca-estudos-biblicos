import { describe, expect, it, vi } from "vitest";
import { createMockSupabaseClient } from "@/lib/repositories/supabase/testUtils";

const getSupabaseClientMock = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  getSupabaseClient: () => getSupabaseClientMock(),
}));

const { SupabaseSeriesRepository } = await import("@/lib/repositories/supabase/series");

const SERIES_ROW = { id: "series-uuid-1", nome: "Vida de Davi", slug: "vida-de-davi", descricao: "Do campo ao trono." };

describe("SupabaseSeriesRepository", () => {
  it("listAll mapeia as linhas para Series", async () => {
    getSupabaseClientMock.mockReturnValue(
      createMockSupabaseClient({ tables: { series: { data: [SERIES_ROW], error: null } } }),
    );
    expect(await new SupabaseSeriesRepository().listAll()).toEqual([
      { id: "series-uuid-1", nome: "Vida de Davi", slug: "vida-de-davi", descricao: "Do campo ao trono." },
    ]);
  });

  it("getBySlug devolve undefined quando não encontrada", async () => {
    getSupabaseClientMock.mockReturnValue(
      createMockSupabaseClient({ tables: { series: { data: null, error: null } } }),
    );
    expect(await new SupabaseSeriesRepository().getBySlug("inexistente")).toBeUndefined();
  });

  it("countPublishedStudies lê a view series_study_counts e indexa por series_id", async () => {
    getSupabaseClientMock.mockReturnValue(
      createMockSupabaseClient({
        tables: { series_study_counts: { data: [{ series_id: "series-uuid-1", total: 2 }], error: null } },
      }),
    );
    expect(await new SupabaseSeriesRepository().countPublishedStudies()).toEqual({ "series-uuid-1": 2 });
  });
});
