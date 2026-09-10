import { describe, expect, it } from "vitest";
import { prepareLibraryQuestion } from "@/lib/search/libraryQuestion";

describe("prepareLibraryQuestion", () => {
  it("remove a moldura da pergunta e preserva os termos centrais", () => {
    expect(
      prepareLibraryQuestion(
        "O que os estudos dizem sobre o chamado de Moisés?",
      ),
    ).toBe("chamado Moisés");
  });

  it("preserva palavras curtas importantes", () => {
    expect(prepareLibraryQuestion("O que a Bíblia diz sobre fé?")).toBe("fé");
  });

  it("não inventa termos quando a pergunta é genérica demais", () => {
    expect(prepareLibraryQuestion("O que os estudos dizem?")).toBe("");
  });

  it("preserva acentos e termos relevantes", () => {
    expect(
      prepareLibraryQuestion("Quais estudos falam sobre graça e salvação?"),
    ).toBe("graça salvação");
  });
});
