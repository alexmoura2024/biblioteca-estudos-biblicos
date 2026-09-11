import { describe, expect, it } from "vitest";
import {
  rankLibrarySourceCandidates,
  type LibrarySourceCandidate,
} from "./libraryDraft";

function source(
  id: string,
  title: string,
  matchedTerms: string[],
  summary = "",
): LibrarySourceCandidate {
  return {
    id,
    title,
    slug: id,
    summary,
    status: "PUBLISHED",
    matchedTerms,
  };
}

describe("relevância da busca de fontes", () => {
  it("prioriza o termo raro sobre uma palavra genérica", () => {
    const ranked = rankLibrarySourceCandidates(
      [
        source("forca", "A força que vem do Senhor", ["força"]),
        source("sansao", "O chamado do nazireu", ["sansão"]),
      ],
      {
        força: 700,
        sansão: 8,
      },
    );

    expect(ranked[0].id).toBe("sansao");
  });

  it("prioriza fontes que correspondem a vários termos do pedido", () => {
    const ranked = rankLibrarySourceCandidates(
      [
        source("apenas-sansao", "Sansão", ["sansão"]),
        source(
          "completo",
          "A força de Sansão",
          ["força", "sansão"],
        ),
      ],
      {
        força: 700,
        sansão: 8,
      },
    );

    expect(ranked[0].id).toBe("completo");
  });

  it("valoriza correspondência no título e no resumo", () => {
    const ranked = rankLibrarySourceCandidates(
      [
        source("conteudo", "Outro estudo", ["dalila"]),
        source(
          "titulo",
          "Dalila e suas escolhas",
          ["dalila"],
          "Relacionamento com Sansão.",
        ),
      ],
      {
        dalila: 12,
      },
    );

    expect(ranked[0].id).toBe("titulo");
  });
});
