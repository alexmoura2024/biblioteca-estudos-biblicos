import { describe, expect, it } from "vitest";
import { normalizeLibraryDraftOutput } from "./libraryDraft";

describe("formato obrigatório do rascunho gerado", () => {
  it("converte títulos Markdown para seções entre asteriscos", () => {
    expect(
      normalizeLibraryDraftOutput(
        "## Introdução\n\nTexto\n\n### Desenvolvimento\n\nCorpo\n\n# Conclusão\n\nFim",
      ),
    ).toBe(
      "**Introdução**\n\nTexto\n\n**Desenvolvimento**\n\nCorpo\n\n**Conclusão**\n\nFim",
    );
  });

  it("remove seções consecutivas duplicadas", () => {
    expect(
      normalizeLibraryDraftOutput(
        "## Introdução\n\n**Introdução**\n\nTexto",
      ),
    ).toBe("**Introdução**\n\nTexto");
  });
});
