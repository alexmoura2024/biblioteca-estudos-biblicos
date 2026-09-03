import { describe, expect, it, vi } from "vitest";
import { createMockSupabaseClient } from "@/lib/repositories/supabase/testUtils";
import type { Book } from "@/lib/types";

const getSupabaseClientMock = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  getSupabaseClient: () => getSupabaseClientMock(),
}));

const { SupabaseSearchRepository } = await import("@/lib/repositories/supabase/search");

const JOAO: Book = {
  id: "book-joao",
  nome: "João",
  abreviacao: "Jo",
  slug: "joao",
  testamento: "NT",
  ordemCanonica: 43,
  totalCapitulos: 21,
};

const RPC_ROW = {
  id: "study-1",
  slug: "nicodemos-e-o-novo-nascimento",
  titulo: "Nicodemos e o novo nascimento",
  resumo: "resumo",
  autor: "Pr. José Ricardo Alves",
  data_origem: "2024-07-22",
  score: 1000,
  total_count: 1,
};

describe("SupabaseSearchRepository.search", () => {
  it("chama a RPC search_studies traduzindo SearchQuery para os parâmetros da função", async () => {
    const client = createMockSupabaseClient({ rpc: { data: [RPC_ROW], error: null } });
    getSupabaseClientMock.mockReturnValue(client);

    await new SupabaseSearchRepository().search({
      texto: "novo nascimento",
      referencia: { book: JOAO, capitulo: 3, versiculoInicio: 16 },
      livro: "joao",
      testamento: "NT",
      tema: "fe",
      personagem: "jesus",
      serie: undefined,
      page: 2,
      limit: 10,
    });

    expect(client.rpc).toHaveBeenCalledWith("search_studies", {
      p_texto: "novo nascimento",
      p_ref_book_slug: "joao",
      p_ref_capitulo: 3,
      p_ref_versiculo_inicio: 16,
      p_ref_versiculo_fim: null,
      p_livro_slug: "joao",
      p_testamento: "NT",
      p_tema_slug: "fe",
      p_personagem_slug: "jesus",
      p_serie_slug: null,
      p_include_zero_score: false,
      p_page: 2,
      p_limit: 10,
    });
  });

  it("mapeia as linhas da RPC para SearchOutcome (StudySummary + score) e extrai total de total_count", async () => {
    getSupabaseClientMock.mockReturnValue(createMockSupabaseClient({ rpc: { data: [RPC_ROW], error: null } }));

    const outcome = await new SupabaseSearchRepository().search({ texto: "novo nascimento" });

    expect(outcome.total).toBe(1);
    expect(outcome.page).toBe(1);
    expect(outcome.limit).toBe(24);
    expect(outcome.items).toHaveLength(1);
    expect(outcome.items[0].score).toBe(1000);
    expect(outcome.items[0].study.slug).toBe("nicodemos-e-o-novo-nascimento");
  });

  it("total é 0 quando a RPC não devolve nenhuma linha", async () => {
    getSupabaseClientMock.mockReturnValue(createMockSupabaseClient({ rpc: { data: [], error: null } }));
    const outcome = await new SupabaseSearchRepository().search({ texto: "xablauzinho" });
    expect(outcome.total).toBe(0);
    expect(outcome.items).toEqual([]);
  });

  it("include_zero_score é true só quando não há texto/referência mas há algum filtro ativo (mesma regra do motor em memória)", async () => {
    const client = createMockSupabaseClient({ rpc: { data: [], error: null } });
    getSupabaseClientMock.mockReturnValue(client);

    await new SupabaseSearchRepository().search({ tema: "fe" });
    expect(client.rpc).toHaveBeenCalledWith("search_studies", expect.objectContaining({ p_include_zero_score: true }));

    vi.mocked(client.rpc).mockClear();
    await new SupabaseSearchRepository().search({});
    expect(client.rpc).toHaveBeenCalledWith("search_studies", expect.objectContaining({ p_include_zero_score: false }));
  });

  it("propaga o erro da RPC", async () => {
    getSupabaseClientMock.mockReturnValue(
      createMockSupabaseClient({ rpc: { data: null, error: { message: "function search_studies does not exist" } } }),
    );
    await expect(new SupabaseSearchRepository().search({ texto: "fé" })).rejects.toThrow(/does not exist/);
  });
});
