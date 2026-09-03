import { describe, it, expect } from "vitest";
import { isRTFFile, extractRTFText, isValidExtractedContent } from "./rtf";

describe("RTF Extractor", () => {
  it("should detect RTF files by signature", () => {
    const rtfHeader = Buffer.from("{\\rtf1\\ansi\\ansicpg1252");
    expect(isRTFFile(rtfHeader)).toBe(true);

    const notRTF = Buffer.from("This is not RTF");
    expect(isRTFFile(notRTF)).toBe(false);
  });

  it("should extract text from simple RTF", () => {
    const rtf = Buffer.from(
      "{\\rtf1\\ansi {\\fonttbl \\f0 Times New Roman;} {\\colortbl;\\red0\\green0\\blue0;} \\f0 \\fs20 Olá mundo}"
    );
    const text = extractRTFText(rtf);
    expect(text).toContain("Olá mundo");
    expect(text).not.toContain("\\rtf");
    expect(text).not.toContain("\\f0");
  });

  it("should handle multi-line RTF content", () => {
    const rtf = Buffer.from(
      "{\\rtf1\\ansi Este é um parágrafo.\\par Este é outro parágrafo.}"
    );
    const text = extractRTFText(rtf);
    expect(text).toContain("parágrafo");
    expect(text.split("\n").length).toBeGreaterThanOrEqual(1);
  });

  it("should validate extracted content", () => {
    const shortText = "abc";
    expect(isValidExtractedContent(shortText)).toBe(false);

    // Texto válido: mínimo 100 caracteres e 5+ linhas
    const validText = "Este é um texto bastante longo para passar na validação de conteúdo.\nSegunda linha com mais informação.\nTerceira linha do documento.\nQuarta linha adicional.\nQuinta linha final.";
    expect(isValidExtractedContent(validText)).toBe(true);
  });

  it("should remove control characters", () => {
    const rtf = Buffer.from("{\\rtf1\\ansi \\*\\htmltag <br>} Texto com\\par controle");
    const text = extractRTFText(rtf);
    expect(text).not.toContain("\\");
    expect(text).not.toContain("<");
    expect(text).not.toContain(">");
  });
});
