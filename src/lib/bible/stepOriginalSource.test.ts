import { describe, expect, it } from "vitest";
import {
  parseGreekStepLine,
  parseHebrewStepLine,
} from "@/lib/bible/stepOriginalSource";

describe("STEPBible original-language parser", () => {
  it("interpreta uma palavra hebraica do TAHOT", () => {
    const line = [
      "Gen.1.1#01=L",
      "בְּ/רֵאשִׁ֖ית",
      "be./re.Shit",
      "in/ beginning",
      "H9003/{H7225G}",
      "HR/Ncfsa",
      "",
      "",
      "H7225G",
      "",
      "",
      "H9003=ב=in/{H7225G=רֵאשִׁית=: beginning»first:1_beginning}",
    ].join("\t");

    const word = parseHebrewStepLine(line);

    expect(word?.bookCode).toBe("Gen");
    expect(word?.strong).toBe("H7225");
    expect(word?.lemma).toBe("רֵאשִׁית");
    expect(word?.transliteration).toBe("be./re.Shit");
  });

  it("interpreta uma palavra grega do TAGNT presente no TR", () => {
    const line = [
      "Mat.1.1#01=NKO",
      "Βίβλος (Biblos)",
      "[The] book",
      "G0976=N-NSF",
      "βίβλος=book",
      "NA28+NA27+Tyn+SBL+WH+Treg+TR+Byz",
      "",
      "",
      "Libro",
      "book",
      "#01",
      "G0976",
      "",
    ].join("\t");

    const word = parseGreekStepLine(line);

    expect(word?.language).toBe("grc");
    expect(word?.surface).toBe("Βίβλος");
    expect(word?.transliteration).toBe("Biblos");
    expect(word?.lemma).toBe("βίβλος");
    expect(word?.strong).toBe("G976");
    expect(word?.morphology).toBe("N-NSF");
  });

  it("ignora variante grega que não pertence ao TR", () => {
    const line = [
      "Mat.1.1#01=NO",
      "λόγος (logos)",
      "word",
      "G3056=N-NSM",
      "λόγος=word",
      "NA28+SBL",
    ].join("\t");

    expect(parseGreekStepLine(line)).toBeNull();
  });
});
