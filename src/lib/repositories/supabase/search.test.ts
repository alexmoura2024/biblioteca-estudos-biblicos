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

/**
 * A busca resolve referência principal/temas/séries numa segunda etapa,
 * fora da RPC (Fase 2, Etapa 11 — ver comentário de SupabaseSearchRepository).
 * Sempre que a RPC devolver ao menos 1 linha, o repositório também chama
 * `.from("study_passages"/"study_topics"/"study_series")` — os testes que
 * simulam RPC não-vazia precisam configurar essas três tabelas também,
 * senão o mock (`testUtils.ts`) devolve o erro padrão de "tabela não
 * configurada".
 */
const EMPTY_RELATION_TABLES = {
  study_passages: { data: [], error: null },
  study_topics: { data: [], error: null },
  study_series: { data: [], error: null },
};

describe("SupabaseSearchRepository.search", () => {
  it("chama a RPC search_studies traduzindo SearchQuery para os parâmetros da função", async () => {
    const client = createMockSupabaseClient({ rpc: { data: [RPC_ROW], error: null }, tables: EMPTY_RELATION_TABLES });
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
    getSupabaseClientMock.mockReturnValue(createMockSupabaseClient({ rpc: { data: [RPC_ROW], error: null }, tables: EMPTY_RELATION_TABLES }));

    const outcome = await new SupabaseSearchRepository().search({ texto: "novo nascimento" });

    expect(outcome.total).toBe(1);
    expect(outcome.page).toBe(1);
    expect(outcome.limit).toBe(24);
    expect(outcome.items).toHaveLength(1);
    expect(outcome.items[0].score).toBe(1000);
    expect(outcome.items[0].study.slug).toBe("nicodemos-e-o-novo-nascimento");
  });

  it("resolve referenciaPrincipal/temas/series dos resultados numa segunda etapa (Etapa 11 — fechando a paridade com o Mock)", async () => {
    const passageRow = {
      study_id: "study-1",
      tipo_relacao: "MAIN",
      prioridade: 1,
      passages: {
        id: "passage-1",
        book_id: "book-joao",
        capitulo: 3,
        versiculo_inicio: 1,
        versiculo_fim: 21,
        referencia_normalizada: "João 3:1-21",
        books: JOAO,
      },
    };
    const topicRow = { study_id: "study-1", peso: 2, topics: { id: "topic-fe", nome: "Fé", slug: "fe", descricao: "d" } };
    const seriesRow = { study_id: "study-1", ordem: 1, series: { id: "serie-1", nome: "Fundamentos da Fé", slug: "fundamentos-da-fe", descricao: "d" } };

    getSupabaseClientMock.mockReturnValue(
      createMockSupabaseClient({
        rpc: { data: [RPC_ROW], error: null },
        tables: {
          study_passages: { data: [passageRow], error: null },
          study_topics: { data: [topicRow], error: null },
          study_series: { data: [seriesRow], error: null },
        },
      }),
    );

    const outcome = await new SupabaseSearchRepository().search({ texto: "novo nascimento" });

    expect(outcome.items[0].study.referenciaPrincipal).toEqual({
      referenciaNormalizada: "João 3:1-21",
      bookSlug: "joao",
      capitulo: 3,
    });
    expect(outcome.items[0].study.temas).toEqual([{ topic: { id: "topic-fe", nome: "Fé", slug: "fe", descricao: "d" }, peso: 2 }]);
    expect(outcome.items[0].study.series).toEqual([
      { series: { id: "serie-1", nome: "Fundamentos da Fé", slug: "fundamentos-da-fe", descricao: "d" }, ordem: 1 },
    ]);
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
