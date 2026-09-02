import { describe, expect, it } from "vitest";
import { searchStudies } from "@/lib/search/search";
import { publishedStudies } from "@/lib/data/studies";

describe("searchStudies", () => {
  it("encontra estudo por referência bíblica exata: João 3:16", () => {
    const result = searchStudies(publishedStudies, "João 3:16");
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items[0].study.titulo).toContain("Nicodemos");
    expect(result.items[0].matchedOn).toContain("referência bíblica");
  });

  it("referência apenas de capítulo retorna estudos daquele capítulo", () => {
    const result = searchStudies(publishedStudies, "Lucas 15");
    expect(result.items.some((i) => i.study.titulo.includes("filho pródigo"))).toBe(true);
  });

  it("referência de livro inteiro retorna todos os estudos daquele livro", () => {
    const result = searchStudies(publishedStudies, "Lucas");
    const titles = result.items.map((i) => i.study.titulo);
    expect(titles.some((t) => t.includes("filho pródigo"))).toBe(true);
    expect(titles.some((t) => t.includes("bom samaritano"))).toBe(true);
  });

  it("busca por tema existente (palavra livre): perdão", () => {
    const result = searchStudies(publishedStudies, "perdão");
    expect(result.items.some((i) => i.matchedOn.includes("tema"))).toBe(true);
  });

  it("busca por personagem: Davi", () => {
    const result = searchStudies(publishedStudies, "Davi");
    expect(result.items.length).toBeGreaterThanOrEqual(3);
    expect(result.items.every((i) => i.matchedOn.includes("personagem"))).toBe(true);
  });

  it("busca por palavra-chave: gigante", () => {
    const result = searchStudies(publishedStudies, "gigante");
    expect(result.items[0].study.titulo).toContain("Golias");
  });

  it("prioriza título sobre resumo/conteúdo no ranking", () => {
    const result = searchStudies(publishedStudies, "pastor");
    // "O Senhor é o meu pastor" tem "pastor" no título.
    expect(result.items[0].study.titulo).toBe("O Senhor é o meu pastor");
  });

  it("aplica filtro por livro (slug)", () => {
    const result = searchStudies(publishedStudies, "esperança", { livro: "romanos" });
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items.every((i) => i.study.passagens.some((p) => p.book.slug === "romanos"))).toBe(true);
  });

  it("aplica filtro por tema (slug)", () => {
    const result = searchStudies(publishedStudies, "", { tema: "fe" });
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items.every((i) => i.study.temas.some((t) => t.topic.slug === "fe"))).toBe(true);
  });

  it("aplica filtro por personagem (slug)", () => {
    const result = searchStudies(publishedStudies, "", { personagem: "paulo" });
    expect(result.items.every((i) => i.study.personagens.some((p) => p.character.slug === "paulo"))).toBe(true);
  });

  it("aplica filtro por série (slug)", () => {
    const result = searchStudies(publishedStudies, "", { serie: "vida-de-davi" });
    expect(result.items.length).toBe(2);
  });

  it("retorna candidatos quando a referência é ambígua", () => {
    const result = searchStudies(publishedStudies, "jó 1:1"); // acentuado -> não ambíguo de fato
    expect(result.ambiguousReference).toBeUndefined();
  });

  it("consulta vazia sem filtros não retorna resultados", () => {
    const result = searchStudies(publishedStudies, "");
    expect(result.items).toEqual([]);
  });

  it("consulta sem correspondência retorna lista vazia", () => {
    const result = searchStudies(publishedStudies, "xablauzinho borboleta inexistente");
    expect(result.items).toEqual([]);
  });
});
