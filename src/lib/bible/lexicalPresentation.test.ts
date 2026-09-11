import { describe, expect, it } from "vitest";
import {
  buildWordCopyText,
  cleanLexicalGloss,
  cleanOriginalSurface,
  describeMorphology,
} from "@/lib/bible/lexicalPresentation";

describe("lexicalPresentation", () => {
  it("traduz código hebraico comum para descrição legível", () => {
    expect(describeMorphology("he", "HVqrmsa")).toBe(
      "verbo, Qal, particípio ativo, masculino, singular, absoluto",
    );
  });

  it("traduz código grego nominal para descrição legível", () => {
    expect(describeMorphology("grc", "N-NSF")).toBe(
      "substantivo, nominativo, singular, feminino",
    );
  });

  it("traduz código grego verbal para descrição legível", () => {
    expect(describeMorphology("grc", "V-PAI-3S")).toBe(
      "verbo, presente, ativa, indicativo, 3ª pessoa, singular",
    );
  });

  it("limpa separadores técnicos do texto original e da glosa", () => {
    expect(cleanOriginalSurface("וְ/הָלַךְ\\")).toBe("וְהָלַךְ");
    expect(
      cleanLexicalGloss(
        "continue»to go:6_continue;_will_be[future]",
      ),
    ).toContain("continue");
  });

  it("gera texto copiável com Strong e morfologia", () => {
    const text = buildWordCopyText({
      surface: "הָלֹךְ",
      transliteration: "ha.Lokh",
      lemma: "הלך",
      strong: "H1980",
      morphologyDescription:
        "verbo, Qal, infinitivo absoluto",
      morphologyCode: "HVqa",
      gloss: "to go",
    });

    expect(text).toContain("Strong: H1980");
    expect(text).toContain("Código morfológico: HVqa");
  });

  it("remove residuos tecnicos de Strong na glosa", () => {
    expect(
      cleanLexicalGloss(
        "country; planet; land\\H9016=:=verseEnd",
      ),
    ).toBe("country · planet · land");
  });
});
