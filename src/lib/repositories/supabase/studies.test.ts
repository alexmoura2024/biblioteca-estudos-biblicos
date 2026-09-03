import { describe, expect, it, vi } from "vitest";
import { createMockSupabaseClient } from "@/lib/repositories/supabase/testUtils";

const getSupabaseClientMock = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  getSupabaseClient: () => getSupabaseClientMock(),
}));

const { SupabaseStudyRepository } = await import("@/lib/repositories/supabase/studies");

const BOOK_ROMANOS = {
  id: "book-romanos",
  nome: "Romanos",
  abreviacao: "Rm",
  slug: "romanos",
  testamento: "NT",
  ordem_canonica: 45,
  total_capitulos: 16,
};

function studyRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "study-1",
    titulo: "Nenhuma condenação: Romanos 8",
    slug: "nenhuma-condenacao-romanos-8",
    resumo: "resumo",
    conteudo: "conteúdo completo",
    status: "PUBLISHED",
    visibilidade: "publico",
    autor: "Equipe Editorial",
    data_origem: "2024-08-15",
    palavras_chave: ["condenação"],
    created_at: "2024-08-15T09:00:00.000Z",
    updated_at: "2024-08-15T09:00:00.000Z",
    ...overrides,
  };
}

describe("SupabaseStudyRepository.getPublishedBySlug", () => {
  it("monta o Study completo a partir das 5 consultas (studies + 4 relações)", async () => {
    getSupabaseClientMock.mockReturnValue(
      createMockSupabaseClient({
        tables: {
          studies: { data: studyRow(), error: null },
          study_passages: {
            data: [
              {
                study_id: "study-1",
                tipo_relacao: "MAIN",
                prioridade: 1,
                passages: {
                  id: "passage-1",
                  book_id: "book-romanos",
                  capitulo: 8,
                  versiculo_inicio: 28,
                  versiculo_fim: 39,
                  referencia_normalizada: "Romanos 8:28-39",
                  books: BOOK_ROMANOS,
                },
              },
            ],
            error: null,
          },
          study_topics: { data: [{ study_id: "study-1", peso: 3, topics: { id: "t1", nome: "Esperança", slug: "esperanca", descricao: "" } }], error: null },
          study_characters: { data: [{ study_id: "study-1", papel: "autor", characters: { id: "c1", nome: "Paulo", slug: "paulo", descricao: "" } }], error: null },
          study_series: { data: [], error: null },
        },
      }),
    );

    const study = await new SupabaseStudyRepository().getPublishedBySlug("nenhuma-condenacao-romanos-8");

    expect(study?.titulo).toBe("Nenhuma condenação: Romanos 8");
    expect(study?.conteudo).toBe("conteúdo completo");
    expect(study?.passagens).toHaveLength(1);
    expect(study?.passagens[0].passage.referenciaNormalizada).toBe("Romanos 8:28-39");
    expect(study?.temas[0].topic.slug).toBe("esperanca");
    expect(study?.personagens[0].character.slug).toBe("paulo");
    expect(study?.series).toEqual([]);
  });

  it("devolve undefined quando o slug não existe ou não é PUBLISHED+publico (a query já filtra os dois)", async () => {
    getSupabaseClientMock.mockReturnValue(
      createMockSupabaseClient({ tables: { studies: { data: null, error: null } } }),
    );
    const study = await new SupabaseStudyRepository().getPublishedBySlug("draft-slug");
    expect(study).toBeUndefined();
  });

  it("propaga o erro do Postgres em vez de devolver undefined silenciosamente", async () => {
    getSupabaseClientMock.mockReturnValue(
      createMockSupabaseClient({ tables: { studies: { data: null, error: { message: "relation does not exist" } } } }),
    );
    await expect(new SupabaseStudyRepository().getPublishedBySlug("qualquer")).rejects.toThrow(/relation does not exist/);
  });
});

describe("SupabaseStudyRepository.listPublishedSlugs", () => {
  it("devolve só os slugs, sem nenhum outro campo", async () => {
    getSupabaseClientMock.mockReturnValue(
      createMockSupabaseClient({ tables: { studies: { data: [{ slug: "a" }, { slug: "b" }], error: null } } }),
    );
    expect(await new SupabaseStudyRepository().listPublishedSlugs()).toEqual(["a", "b"]);
  });
});

describe("SupabaseStudyRepository — listagens devolvem StudySummary e preservam ordem quando o contrato exige", () => {
  it("listBySeriesSlug preserva a ordem de 'ordem' mesmo quando a segunda consulta (studies) devolve as linhas em outra ordem", async () => {
    // study_series (1ª consulta) diz: B vem antes de A (ordem 1 e 2).
    // studies (2ª consulta, via .in(ids)) devolve na ordem inversa —
    // simula o Postgres não garantindo ordem de .in(). O repositório
    // precisa reordenar pelo resultado da 1ª consulta antes de devolver.
    getSupabaseClientMock.mockReturnValue(
      createMockSupabaseClient({
        tables: {
          study_series: {
            data: [
              { study_id: "study-B", ordem: 1, series: { slug: "vida-de-davi" } },
              { study_id: "study-A", ordem: 2, series: { slug: "vida-de-davi" } },
            ],
            error: null,
          },
          studies: {
            data: [studyRow({ id: "study-A", slug: "estudo-a" }), studyRow({ id: "study-B", slug: "estudo-b" })],
            error: null,
          },
          study_passages: { data: [], error: null },
          study_topics: { data: [], error: null },
        },
      }),
    );

    const summaries = await new SupabaseStudyRepository().listBySeriesSlug("vida-de-davi");
    expect(summaries.map((s) => s.id)).toEqual(["study-B", "study-A"]);
  });

  it("listByBookSlug filtra via study_passages/passages/books e devolve StudySummary (sem conteudo)", async () => {
    getSupabaseClientMock.mockReturnValue(
      createMockSupabaseClient({
        tables: {
          study_passages: [
            // 1ª chamada: resolve os study_id que citam o livro.
            { data: [{ study_id: "study-1" }], error: null },
            // 2ª chamada: dentro de buildSummaries, busca as passagens completas.
            {
              data: [
                {
                  study_id: "study-1",
                  tipo_relacao: "MAIN",
                  prioridade: 1,
                  passages: {
                    id: "p1",
                    book_id: "book-romanos",
                    capitulo: 8,
                    versiculo_inicio: 28,
                    versiculo_fim: 39,
                    referencia_normalizada: "Romanos 8:28-39",
                    books: BOOK_ROMANOS,
                  },
                },
              ],
              error: null,
            },
          ],
          studies: { data: [studyRow()], error: null },
          study_topics: { data: [], error: null },
          study_series: { data: [], error: null },
        },
      }),
    );

    const summaries = await new SupabaseStudyRepository().listByBookSlug("romanos");
    expect(summaries).toHaveLength(1);
    expect(summaries[0]).not.toHaveProperty("conteudo");
    expect(summaries[0].referenciaPrincipal?.referenciaNormalizada).toBe("Romanos 8:28-39");
  });

  it("listByTopicSlug/listByCharacterSlug devolvem [] sem tentar buscar estudos quando nenhum vínculo existe", async () => {
    getSupabaseClientMock.mockReturnValue(
      createMockSupabaseClient({ tables: { study_topics: { data: [], error: null }, study_characters: { data: [], error: null } } }),
    );
    const repo = new SupabaseStudyRepository();
    expect(await repo.listByTopicSlug("tema-sem-estudos")).toEqual([]);
    expect(await repo.listByCharacterSlug("personagem-sem-estudos")).toEqual([]);
  });
});
