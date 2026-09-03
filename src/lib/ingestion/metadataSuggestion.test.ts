import { describe, expect, it } from "vitest";
import { suggestKeywords, suggestSummary } from "@/lib/ingestion/metadataSuggestion";

describe("suggestSummary", () => {
  it("devolve o texto inteiro quando já é curto", () => {
    expect(suggestSummary("Um texto curto.")).toBe("Um texto curto.");
  });

  it("corta numa fronteira de palavra e nunca inventa conteúdo além do que o texto realmente diz", () => {
    const texto = "palavra ".repeat(50).trim();
    const resumo = suggestSummary(texto, 30);
    expect(resumo.length).toBeLessThanOrEqual(31); // 30 + "…"
    expect(texto.startsWith(resumo.replace("…", "").trim())).toBe(true);
  });
});

describe("suggestKeywords", () => {
  it("sugere as palavras mais frequentes, ignorando palavras comuns e preservando acentos", () => {
    const texto =
      "A salvação em Cristo é central. A salvação não depende de mérito, mas da graça. " +
      "Esta graça transforma o coração do crente.";
    const keywords = suggestKeywords(texto, 3);
    expect(keywords).toContain("salvação");
    expect(keywords).toContain("graça");
    expect(keywords.every((k) => k.length >= 4)).toBe(true);
  });

  it("nunca inclui palavras comuns curtas (stopwords)", () => {
    const texto = "Isto é para que todos vejam que Deus é fiel.";
    const keywords = suggestKeywords(texto, 10);
    expect(keywords).not.toContain("para");
    expect(keywords).not.toContain("todos");
  });
});
