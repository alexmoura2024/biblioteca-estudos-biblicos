import { describe, expect, it } from "vitest";
import {
  findMentionedCharacter,
  isFactualLibraryQuestion,
  prepareLibraryQuestion,
  shouldUseAiFallback,
} from "@/lib/search/libraryQuestion";

describe("prepareLibraryQuestion", () => {
  it("remove a moldura da pergunta e preserva os termos centrais", () => {
    expect(
      prepareLibraryQuestion(
        "O que os estudos dizem sobre o chamado de Moisés?",
      ),
    ).toBe("chamado Moisés");
  });

  it("remove termos conversacionais adicionais descobertos na bateria", () => {
    expect(
      prepareLibraryQuestion(
        "O que o acervo apresenta sobre a sarça e o preparo do servo?",
      ),
    ).toBe("sarça preparo");
  });

  it("prepara uma pergunta factual sem exigir a resposta desconhecida", () => {
    expect(prepareLibraryQuestion("Quantos anos Davi reinou?")).toBe(
      "Davi reinou",
    );
  });

  it("remove moldura factual de quem era", () => {
    expect(prepareLibraryQuestion("Quem era nazireu na Bíblia?")).toBe(
      "nazireu",
    );
  });

  it("preserva palavras curtas importantes", () => {
    expect(prepareLibraryQuestion("O que a Bíblia diz sobre fé?")).toBe("fé");
  });

  it("não inventa termos quando a pergunta é genérica demais", () => {
    expect(prepareLibraryQuestion("O que os estudos dizem?")).toBe("");
  });
});

describe("findMentionedCharacter", () => {
  const characters = [
    { nome: "José", slug: "jose" },
    { nome: "Josias", slug: "josias" },
    { nome: "Moisés", slug: "moises" },
  ];

  it("prefere o nome exato e evita José x Josias", () => {
    expect(
      findMentionedCharacter("O que os estudos dizem sobre José?", characters)
        ?.slug,
    ).toBe("jose");
  });

  it("detecta personagem em uma pergunta maior", () => {
    expect(
      findMentionedCharacter(
        "O que os estudos dizem sobre o chamado de Moisés?",
        characters,
      )?.slug,
    ).toBe("moises");
  });
});

describe("isFactualLibraryQuestion", () => {
  it("detecta perguntas quantitativas", () => {
    expect(isFactualLibraryQuestion("Quantos anos Davi reinou?")).toBe(true);
  });

  it("não transforma toda consulta temática em síntese de IA", () => {
    expect(
      isFactualLibraryQuestion(
        "O que os estudos dizem sobre o chamado de Moisés?",
      ),
    ).toBe(false);
  });
});

describe("shouldUseAiFallback", () => {
  it("usa fallback quando não há resultados", () => {
    expect(shouldUseAiFallback([])).toBe(true);
  });

  it("não usa IA quando o resultado principal é forte", () => {
    expect(
      shouldUseAiFallback([
        { score: 276, matchedOn: ["título", "resumo", "conteúdo"] },
      ]),
    ).toBe(false);
  });

  it("permite fallback para um único match muito fraco", () => {
    expect(
      shouldUseAiFallback([{ score: 10, matchedOn: ["conteúdo"] }]),
    ).toBe(true);
  });
});
