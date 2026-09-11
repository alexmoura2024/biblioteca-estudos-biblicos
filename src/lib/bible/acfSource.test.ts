import { describe, expect, it } from "vitest";
import {
  countBibleSourceVerses,
  parseBibleSource,
} from "@/lib/bible/acfSource";

describe("parseBibleSource", () => {
  it("normaliza a estrutura do repositório da Bíblia", () => {
    const source = parseBibleSource([
      {
        abbrev: "gn",
        book: "Gênesis",
        chapters: [
          ["No princípio...", "E a terra..."],
          ["Assim os céus..."],
        ],
      },
    ]);

    expect(source[0].book).toBe("Gênesis");
    expect(source[0].chapters).toHaveLength(2);
    expect(countBibleSourceVerses(source)).toBe(3);
  });

  it("rejeita versículo vazio", () => {
    expect(() =>
      parseBibleSource([
        {
          abbrev: "gn",
          book: "Gênesis",
          chapters: [[""]],
        },
      ]),
    ).toThrow(/texto inválido/i);
  });
});
