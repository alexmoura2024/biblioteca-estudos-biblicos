import { describe, expect, it } from "vitest";
import {
  LIBRARY_DRAFT_SOURCE_CONTENT_LIMIT,
  buildLibraryDraftEvidence,
} from "./libraryDraft";

describe("evidências para o rascunho com IA", () => {
  it("identifica título, status, autor e conteúdo de cada fonte", () => {
    const evidence = buildLibraryDraftEvidence([
      {
        id: "11111111-1111-4111-8111-111111111111",
        title: "A força de Sansão",
        slug: "a-forca-de-sansao",
        summary: "Estudo sobre força e consagração.",
        content: "A força não estava nos cabelos.",
        status: "PUBLISHED",
        author: "Alex Sander de Moura",
        originDate: "2003-07-22",
      },
    ]);

    expect(evidence).toContain("[FONTE 1]");
    expect(evidence).toContain("TÍTULO: A força de Sansão");
    expect(evidence).toContain("STATUS: PUBLISHED");
    expect(evidence).toContain("AUTOR: Alex Sander de Moura");
    expect(evidence).toContain(
      "CONTEÚDO:\nA força não estava nos cabelos.",
    );
  });

  it("mantém separadas várias fontes selecionadas", () => {
    const evidence = buildLibraryDraftEvidence([
      {
        id: "11111111-1111-4111-8111-111111111111",
        title: "Sansão",
        slug: "sansao",
        summary: "",
        content: "Fonte sobre Sansão.",
        status: "DRAFT",
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        title: "Dalila",
        slug: "dalila",
        summary: "",
        content: "Fonte sobre Dalila.",
        status: "REVIEW",
      },
    ]);

    expect(evidence).toContain("[FONTE 1]");
    expect(evidence).toContain("[FONTE 2]");
    expect(evidence).toContain("Fonte sobre Sansão.");
    expect(evidence).toContain("Fonte sobre Dalila.");
  });

  it("limita o conteúdo enviado por fonte", () => {
    const evidence = buildLibraryDraftEvidence([
      {
        id: "11111111-1111-4111-8111-111111111111",
        title: "Fonte extensa",
        slug: "fonte-extensa",
        summary: "",
        content:
          "a".repeat(LIBRARY_DRAFT_SOURCE_CONTENT_LIMIT) +
          "TRECHO_FORA_DO_LIMITE",
        status: "PUBLISHED",
      },
    ]);

    expect(evidence).not.toContain("TRECHO_FORA_DO_LIMITE");
  });
});
