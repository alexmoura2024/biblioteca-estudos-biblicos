import { describe, expect, it } from "vitest";
import {
  MAX_LIBRARY_DRAFT_REQUEST_LENGTH,
  buildLibrarySourceSearchFilter,
  libraryDraftSearchTerms,
  normalizeLibraryDraftRequest,
  normalizeLibraryDraftSourceIds,
  parseLibraryDraftInput,
  selectLibraryDraftSources,
} from "./libraryDraft";

const IDS = [
  "11111111-1111-4111-8111-111111111111",
  "22222222-2222-4222-8222-222222222222",
  "33333333-3333-4333-8333-333333333333",
  "44444444-4444-4444-8444-444444444444",
  "55555555-5555-4555-8555-555555555555",
  "66666666-6666-4666-8666-666666666666",
  "77777777-7777-4777-8777-777777777777",
];

describe("geração de estudo baseada no acervo", () => {
  it("normaliza e limita o pedido editorial", () => {
    expect(
      normalizeLibraryDraftRequest(
        "  Um estudo   sobre a força de Sansão  ",
      ),
    ).toBe("Um estudo sobre a força de Sansão");

    expect(
      normalizeLibraryDraftRequest(
        "a".repeat(MAX_LIBRARY_DRAFT_REQUEST_LENGTH + 20),
      ),
    ).toHaveLength(MAX_LIBRARY_DRAFT_REQUEST_LENGTH);
  });

  it("extrai os assuntos relevantes de um pedido natural", () => {
    expect(
      libraryDraftSearchTerms(
        "Quero um estudo sobre a força de Sansão",
      ),
    ).toEqual(["força", "sansão"]);

    expect(
      libraryDraftSearchTerms(
        "Dalila e seu relacionamento com Sansão",
      ),
    ).toEqual(["dalila", "relacionamento", "sansão"]);
  });

  it("gera filtros somente com termos normalizados", () => {
    expect(
      buildLibrarySourceSearchFilter(
        "Quero um estudo sobre Sansão!",
      ),
    ).toBe(
      "titulo.ilike.%sansão%,resumo.ilike.%sansão%,conteudo.ilike.%sansão%",
    );
  });

  it("aceita somente UUIDs, remove duplicatas e limita seis fontes", () => {
    expect(
      normalizeLibraryDraftSourceIds([
        ...IDS,
        IDS[0],
        "id-inválido",
      ]),
    ).toEqual(IDS.slice(0, 6));
  });

  it("recusa geração sem descrição", () => {
    expect(() =>
      parseLibraryDraftInput({
        request: "   ",
        source_ids: [IDS[0]],
      }),
    ).toThrow("Descreva o estudo que deseja criar.");
  });

  it("recusa geração sem fonte válida selecionada", () => {
    expect(() =>
      parseLibraryDraftInput({
        request: "A força de Sansão",
        source_ids: ["inválido"],
      }),
    ).toThrow("Selecione pelo menos uma fonte do acervo.");
  });

  it("leva adiante exclusivamente as fontes selecionadas", () => {
    const available = [
      { id: IDS[0], title: "Sansão" },
      { id: IDS[1], title: "Dalila" },
      { id: IDS[2], title: "Gideão" },
    ];

    expect(
      selectLibraryDraftSources(available, [
        IDS[1],
        IDS[0],
      ]),
    ).toEqual([
      { id: IDS[1], title: "Dalila" },
      { id: IDS[0], title: "Sansão" },
    ]);
  });
});