export interface BibleSourceBook {
  abbrev: string | string[];
  book: string;
  chapters: string[][];
}

export function parseBibleSource(payload: unknown): BibleSourceBook[] {
  if (!Array.isArray(payload)) {
    throw new Error("A fonte bíblica não é uma lista de livros.");
  }

  return payload.map((item, bookIndex) => {
    if (!item || typeof item !== "object") {
      throw new Error(`Livro ${bookIndex + 1} inválido na fonte.`);
    }

    const record = item as Record<string, unknown>;
    const book =
      typeof record.book === "string"
        ? record.book.trim()
        : typeof record.name === "string"
          ? record.name.trim()
          : "";
    const abbrev =
      typeof record.abbrev === "string" || Array.isArray(record.abbrev)
        ? (record.abbrev as string | string[])
        : "";
    const chapters = record.chapters;

    if (!book) {
      throw new Error(`Livro ${bookIndex + 1} sem nome.`);
    }

    if (!Array.isArray(chapters)) {
      throw new Error(`${book}: capítulos inválidos.`);
    }

    const normalizedChapters = chapters.map((chapter, chapterIndex) => {
      if (!Array.isArray(chapter)) {
        throw new Error(
          `${book} ${chapterIndex + 1}: lista de versículos inválida.`,
        );
      }

      return chapter.map((verse, verseIndex) => {
        if (typeof verse !== "string" || !verse.trim()) {
          throw new Error(
            `${book} ${chapterIndex + 1}:${verseIndex + 1}: texto inválido.`,
          );
        }

        return verse.trim();
      });
    });

    return {
      abbrev,
      book,
      chapters: normalizedChapters,
    };
  });
}

export function countBibleSourceVerses(
  books: BibleSourceBook[],
): number {
  return books.reduce(
    (total, book) =>
      total +
      book.chapters.reduce(
        (chapterTotal, chapter) => chapterTotal + chapter.length,
        0,
      ),
    0,
  );
}
