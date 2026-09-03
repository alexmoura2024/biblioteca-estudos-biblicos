import { describe, expect, it } from "vitest";
import { WEIGHTS, matchesFilters, scoreStudy } from "@/lib/search/search";
import { publishedStudies } from "@/lib/data/studies";
import { getBookBySlug } from "@/lib/data/books";

const joao = getBookBySlug("joao")!;
const romanos = getBookBySlug("romanos")!;

const nicodemos = publishedStudies.find((s) => s.titulo.includes("Nicodemos"))!;
const feQueAtravessa = publishedStudies.find((s) => s.titulo.startsWith("Fé que atravessa"))!;
const golias = publishedStudies.find((s) => s.titulo.includes("Golias"))!;

describe("WEIGHTS (pesos do ranking, docs/SEARCH_SPEC.md §5 e DEC-014)", () => {
  it("mantém a ordem de prioridade documentada: referência > lexical", () => {
    expect(WEIGHTS.referenceExactVerse).toBeGreaterThan(WEIGHTS.referenceChapter);
    expect(WEIGHTS.referenceChapter).toBeGreaterThan(WEIGHTS.referenceBook);
    expect(WEIGHTS.referenceBook).toBeGreaterThan(WEIGHTS.title);
    expect(WEIGHTS.title).toBeGreaterThan(WEIGHTS.topic);
    expect(WEIGHTS.topic).toBeGreaterThan(WEIGHTS.character);
    expect(WEIGHTS.character).toBeGreaterThan(WEIGHTS.keyword);
    expect(WEIGHTS.keyword).toBeGreaterThan(WEIGHTS.summary);
    expect(WEIGHTS.summary).toBeGreaterThan(WEIGHTS.content);
  });
});

describe("scoreStudy — referência bíblica (três níveis)", () => {
  it("dá o score máximo (referenceExactVerse) a uma passagem que contém exatamente o versículo pedido", () => {
    const { score, matchedOn } = scoreStudy(nicodemos, {
      referencia: { book: joao, capitulo: 3, versiculoInicio: 16 },
    });
    expect(score).toBe(WEIGHTS.referenceExactVerse);
    expect(matchedOn).toContain("referência bíblica");
  });

  it("dá um score menor (referenceChapter) a um estudo classificado só no capítulo, para a mesma busca por versículo", () => {
    // "Fé que atravessa as Escrituras" cita João 3 sem especificar
    // versículo (ver src/lib/data/studies.ts) — deve aparecer para
    // "João 3:16", mas com prioridade menor que o match exato.
    const { score } = scoreStudy(feQueAtravessa, {
      referencia: { book: joao, capitulo: 3, versiculoInicio: 16 },
    });
    expect(score).toBe(WEIGHTS.referenceChapter);
    expect(score).toBeLessThan(WEIGHTS.referenceExactVerse);
    expect(score).toBeGreaterThan(0);
  });

  it("nunca pontua um estudo sem nenhuma passagem no livro/capítulo pedido", () => {
    const { score, matchedOn } = scoreStudy(golias, {
      referencia: { book: joao, capitulo: 3, versiculoInicio: 16 },
    });
    expect(score).toBe(0);
    expect(matchedOn).not.toContain("referência bíblica");
  });

  it("dá referenceChapter a uma passagem no mesmo capítulo cujo versículo não sobrepõe o pedido", () => {
    const { score } = scoreStudy(nicodemos, {
      // Nicodemos cobre João 3:1-21; pedir João 3:99 não sobrepõe, mas é o mesmo capítulo.
      referencia: { book: joao, capitulo: 3, versiculoInicio: 99 },
    });
    expect(score).toBe(WEIGHTS.referenceChapter);
  });

  it("dá referenceChapter para consulta de livro+capítulo (sem versículo) contra passagem exata", () => {
    const { score } = scoreStudy(nicodemos, { referencia: { book: joao, capitulo: 3 } });
    expect(score).toBe(WEIGHTS.referenceChapter);
  });

  it("dá referenceBook para consulta só do livro, e conta qualquer capítulo desse livro", () => {
    const { score } = scoreStudy(feQueAtravessa, { referencia: { book: romanos } });
    expect(score).toBe(WEIGHTS.referenceBook);
  });
});

describe("scoreStudy — busca lexical (Fase A)", () => {
  it("pontua e sinaliza match de título", () => {
    const { score, matchedOn } = scoreStudy(nicodemos, { texto: "novo nascimento" });
    // "novo" está no título; "nascimento" também.
    expect(score).toBeGreaterThanOrEqual(WEIGHTS.title);
    expect(matchedOn).toContain("título");
  });

  it("pontua e sinaliza match de tema", () => {
    const { matchedOn } = scoreStudy(nicodemos, { texto: "graça" });
    expect(matchedOn).toContain("tema");
  });

  it("pontua e sinaliza match de personagem", () => {
    const { matchedOn } = scoreStudy(golias, { texto: "davi" });
    expect(matchedOn).toContain("personagem");
  });

  it("pontua e sinaliza match de palavra-chave", () => {
    const { matchedOn } = scoreStudy(golias, { texto: "gigante" });
    expect(matchedOn).toContain("palavra-chave");
  });

  it("consulta sem texto nem referência tem score zero", () => {
    const { score, matchedOn } = scoreStudy(nicodemos, {});
    expect(score).toBe(0);
    expect(matchedOn).toEqual([]);
  });

  it("combina score de referência e de texto quando ambos casam", () => {
    const comReferencia = scoreStudy(nicodemos, { referencia: { book: joao, capitulo: 3, versiculoInicio: 16 } });
    const combinado = scoreStudy(nicodemos, {
      referencia: { book: joao, capitulo: 3, versiculoInicio: 16 },
      texto: "nicodemos",
    });
    expect(combinado.score).toBeGreaterThan(comReferencia.score);
  });
});

describe("matchesFilters (Fase C)", () => {
  it("filtra por livro (slug)", () => {
    expect(matchesFilters(nicodemos, { livro: "joao" })).toBe(true);
    expect(matchesFilters(nicodemos, { livro: "romanos" })).toBe(false);
  });

  it("filtra por testamento", () => {
    expect(matchesFilters(nicodemos, { testamento: "NT" })).toBe(true);
    expect(matchesFilters(nicodemos, { testamento: "AT" })).toBe(false);
  });

  it("filtra por tema (slug)", () => {
    expect(matchesFilters(nicodemos, { tema: "graca" })).toBe(true);
    expect(matchesFilters(nicodemos, { tema: "lideranca" })).toBe(false);
  });

  it("filtra por personagem (slug)", () => {
    expect(matchesFilters(golias, { personagem: "davi" })).toBe(true);
    expect(matchesFilters(golias, { personagem: "paulo" })).toBe(false);
  });

  it("filtra por série (slug)", () => {
    expect(matchesFilters(golias, { serie: "vida-de-davi" })).toBe(true);
    expect(matchesFilters(golias, { serie: "cartas-de-paulo" })).toBe(false);
  });

  it("um estudo com múltiplas séries passa no filtro de qualquer uma delas (N:N)", () => {
    expect(matchesFilters(feQueAtravessa, { serie: "fundamentos-da-fe" })).toBe(true);
    expect(matchesFilters(feQueAtravessa, { serie: "cartas-de-paulo" })).toBe(true);
  });

  it("sem filtros, tudo passa", () => {
    expect(matchesFilters(nicodemos, {})).toBe(true);
  });
});
