import { describe, expect, it } from "vitest";
import { parseSearchQuery } from "@/lib/search/queryParsing";

describe("parseSearchQuery - referencias em frases", () => {
  it("reconhece uma referencia no meio da consulta", () => {
    const parsed = parseSearchQuery(
      "estudos sobre Lucas 22:47-52 e perdão",
    );

    expect(parsed.referencia?.book.slug).toBe("lucas");
    expect(parsed.referencia?.capitulo).toBe(22);
    expect(parsed.referencia?.versiculoInicio).toBe(47);
    expect(parsed.referencia?.versiculoFim).toBe(52);
    expect(parsed.texto).toBe("estudos sobre e perdão");
  });

  it("nao transforma nome de livro isolado no meio de uma frase em referencia", () => {
    const parsed = parseSearchQuery("amor em João e fé");

    expect(parsed.referencia).toBeUndefined();
    expect(parsed.texto).toBe("amor em João e fé");
  });
});