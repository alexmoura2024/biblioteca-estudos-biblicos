import { describe, expect, it } from "vitest";
import { VERSE_COUNTS, getMaxVerse } from "@/lib/data/bibleVerseLimits";
import { books } from "@/lib/data/books";

describe("VERSE_COUNTS (Marco 1.2 — cobertura canônica completa)", () => {
  it("cobre exatamente os 66 livros de src/lib/data/books.ts", () => {
    expect(Object.keys(VERSE_COUNTS)).toHaveLength(66);
    for (const book of books) {
      expect(VERSE_COUNTS[book.slug]).toBeDefined();
    }
  });

  it("o total de capítulos de cada livro bate exatamente com book.totalCapitulos", () => {
    for (const book of books) {
      expect(VERSE_COUNTS[book.slug].length).toBe(book.totalCapitulos);
    }
  });

  it("soma 1189 capítulos ao todo (o número tradicionalmente citado para a Bíblia inteira)", () => {
    const totalCapitulos = Object.values(VERSE_COUNTS).reduce((sum, chapters) => sum + chapters.length, 0);
    expect(totalCapitulos).toBe(1189);
  });

  it("todo capítulo tem pelo menos 1 versículo", () => {
    for (const chapters of Object.values(VERSE_COUNTS)) {
      for (const count of chapters) {
        expect(count).toBeGreaterThan(0);
      }
    }
  });

  it("getMaxVerse cobre todo capítulo real de todo livro (sem undefined dentro do intervalo válido)", () => {
    for (const book of books) {
      for (let capitulo = 1; capitulo <= book.totalCapitulos; capitulo++) {
        expect(getMaxVerse(book.slug, capitulo)).toBeGreaterThan(0);
      }
    }
  });

  it("getMaxVerse retorna undefined para livro inexistente ou capítulo fora do intervalo do livro", () => {
    expect(getMaxVerse("livro-que-nao-existe", 1)).toBeUndefined();
    expect(getMaxVerse("joao", 0)).toBeUndefined();
    expect(getMaxVerse("joao", 999)).toBeUndefined();
  });

  it("pontos de referência conhecidos (conferência independente dos números)", () => {
    expect(getMaxVerse("genesis", 1)).toBe(31);
    expect(getMaxVerse("salmos", 119)).toBe(176); // o maior capítulo da Bíblia
    expect(getMaxVerse("salmos", 117)).toBe(2); // o menor capítulo da Bíblia
    expect(getMaxVerse("isaias", 53)).toBe(12);
    expect(getMaxVerse("joao", 3)).toBe(36);
    expect(getMaxVerse("apocalipse", 22)).toBe(21);
    expect(getMaxVerse("judas", 1)).toBe(25);
    expect(getMaxVerse("filemom", 1)).toBe(25);
    expect(getMaxVerse("romanos", 8)).toBe(39);
    expect(getMaxVerse("obadias", 1)).toBe(21); // livro de 1 capítulo só
  });
});
