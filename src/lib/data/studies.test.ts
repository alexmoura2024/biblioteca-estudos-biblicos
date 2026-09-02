import { describe, expect, it } from "vitest";
import { allStudies, publishedStudies } from "@/lib/data/studies";
import { books } from "@/lib/data/books";

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
});
