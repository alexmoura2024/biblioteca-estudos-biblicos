import { describe, expect, it, vi } from "vitest";
import { createMockSupabaseClient } from "@/lib/repositories/supabase/testUtils";

const getSupabaseClientMock = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  getSupabaseClient: () => getSupabaseClientMock(),
}));

const { SupabaseTopicRepository } = await import("@/lib/repositories/supabase/topics");

const TOPIC_ROW = { id: "topic-uuid-1", nome: "Fé", slug: "fe", descricao: "Confiança em Deus." };

describe("SupabaseTopicRepository", () => {
  it("listAll mapeia as linhas para Topic", async () => {
    getSupabaseClientMock.mockReturnValue(
      createMockSupabaseClient({ tables: { topics: { data: [TOPIC_ROW], error: null } } }),
    );
    const topics = await new SupabaseTopicRepository().listAll();
    expect(topics).toEqual([{ id: "topic-uuid-1", nome: "Fé", slug: "fe", descricao: "Confiança em Deus." }]);
  });

  it("getBySlug devolve undefined quando não encontrado", async () => {
    getSupabaseClientMock.mockReturnValue(
      createMockSupabaseClient({ tables: { topics: { data: null, error: null } } }),
    );
    expect(await new SupabaseTopicRepository().getBySlug("inexistente")).toBeUndefined();
  });

  it("countPublishedStudies lê a view topic_study_counts e indexa por topic_id", async () => {
    getSupabaseClientMock.mockReturnValue(
      createMockSupabaseClient({
        tables: {
          topic_study_counts: {
            data: [
              { topic_id: "topic-uuid-1", total: 10 },
              { topic_id: "topic-uuid-2", total: 3 },
            ],
            error: null,
          },
        },
      }),
    );

    const counts = await new SupabaseTopicRepository().countPublishedStudies();
    expect(counts).toEqual({ "topic-uuid-1": 10, "topic-uuid-2": 3 });
  });

  it("countPublishedStudies devolve mapa vazio quando a view não tem linhas (nenhum tema com estudo publicado)", async () => {
    getSupabaseClientMock.mockReturnValue(
      createMockSupabaseClient({ tables: { topic_study_counts: { data: [], error: null } } }),
    );
    expect(await new SupabaseTopicRepository().countPublishedStudies()).toEqual({});
  });
});
