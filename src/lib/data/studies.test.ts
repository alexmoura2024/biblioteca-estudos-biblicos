import { describe, expect, it } from "vitest";
import { allStudies, publishedStudies } from "@/lib/data/studies";
import { books } from "@/lib/data/books";
import { getMaxVerse } from "@/lib/data/bibleVerseLimits";

describe("dados mockados de estudos", () => {
  it("tem entre 12 e 20 estudos publicados publicamente", () => {
    expect(publishedStudies.length).toBeGreaterThanOrEqual(12);
    expect(publishedStudies.length).toBeLessThanOrEqual(20);
  });

  it("inclui pelo menos um estudo não publicado para validar filtragem editorial", () => {
    expect(allStudies.length).toBeGreaterThan(publishedStudies.length);
    expect(allStudies.some((study) => study.status !== "PUBLISHED")).toBe(true);
  });

  it("todo estudo publicado possui slug único", () => {
    const slugs = publishedStudies.map((study) => study.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("todo estudo referencia pelo menos uma passagem, um tema e um livro válido", () => {
    for (const study of allStudies) {
      expect(study.passagens.length).toBeGreaterThan(0);
      expect(study.temas.length).toBeGreaterThan(0);
      for (const { book } of study.passagens) {
        expect(books.some((b) => b.id === book.id)).toBe(true);
      }
    }
  });

  it("livros cobrem tanto o Antigo quanto o Novo Testamento", () => {
    const testamentos = new Set(
      publishedStudies.flatMap((study) => study.passagens.map((p) => p.book.testamento)),
    );
    expect(testamentos.has("AT")).toBe(true);
    expect(testamentos.has("NT")).toBe(true);
  });

  it("nenhuma passagem mockada excede o limite canônico de versículos do capítulo (quando documentado)", () => {
    // Rede de segurança: se src/lib/data/bibleVerseLimits.ts documentar um
    // capítulo que também aparece em um estudo mockado, os dois precisam
    // concordar — um conflito aqui pegaria um erro de transcrição em
    // qualquer um dos dois lados antes que ele virasse um bug de produto.
    for (const study of allStudies) {
      for (const { book, passage } of study.passagens) {
        const maxVerse = getMaxVerse(book.slug, passage.capitulo);
        if (maxVerse === undefined) continue;
        const versiculoFinal = passage.versiculoFim ?? passage.versiculoInicio;
        if (versiculoFinal === undefined) continue;
        expect(versiculoFinal).toBeLessThanOrEqual(maxVerse);
      }
    }
  });
});
