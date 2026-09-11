import type { OriginalLanguage } from "./originalTypes";

const HEBREW_STEMS: Record<string, string> = {
  q: "Qal",
  N: "Nifal",
  p: "Piel",
  P: "Pual",
  h: "Hifil",
  H: "Hofal",
  t: "Hitpael",
  o: "Polel",
  O: "Polal",
  r: "Hitpolel",
  m: "Poel",
  M: "Poal",
  k: "Palel",
  K: "Pulal",
  Q: "Qal passivo",
  l: "Pilpel",
  L: "Polpal",
  f: "Hitpalpel",
};

const HEBREW_VERB_FORMS: Record<string, string> = {
  p: "perfeito",
  q: "perfeito consecutivo",
  i: "imperfeito",
  w: "imperfeito consecutivo",
  h: "coortativo",
  j: "jussivo",
  v: "imperativo",
  r: "particípio ativo",
  s: "particípio passivo",
  a: "infinitivo absoluto",
  c: "infinitivo construto",
};

const HEBREW_GENDER: Record<string, string> = {
  m: "masculino",
  f: "feminino",
  b: "comum",
  c: "comum",
};

const HEBREW_NUMBER: Record<string, string> = {
  s: "singular",
  p: "plural",
  d: "dual",
};

const HEBREW_STATE: Record<string, string> = {
  a: "absoluto",
  c: "construto",
  d: "determinado",
};

const GREEK_CASE: Record<string, string> = {
  N: "nominativo",
  G: "genitivo",
  D: "dativo",
  A: "acusativo",
  V: "vocativo",
};

const GREEK_NUMBER: Record<string, string> = {
  S: "singular",
  P: "plural",
};

const GREEK_GENDER: Record<string, string> = {
  M: "masculino",
  F: "feminino",
  N: "neutro",
};

const GREEK_TENSE: Record<string, string> = {
  P: "presente",
  I: "imperfeito",
  F: "futuro",
  A: "aoristo",
  X: "perfeito",
  Y: "mais-que-perfeito",
};

const GREEK_VOICE: Record<string, string> = {
  A: "ativa",
  M: "média",
  P: "passiva",
  E: "média ou passiva",
  D: "depoente",
};

const GREEK_MOOD: Record<string, string> = {
  I: "indicativo",
  S: "subjuntivo",
  O: "optativo",
  M: "imperativo",
  N: "infinitivo",
  P: "particípio",
};

function joinParts(parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join(", ");
}

function describeHebrewMorphology(code: string): string {
  if (!code.startsWith("H") || code.length < 2) return code;

  const category = code[1];

  if (category === "V") {
    const stem = HEBREW_STEMS[code[2]] ?? null;
    const form = HEBREW_VERB_FORMS[code[3]] ?? null;
    const rest = code.slice(4);

    if (!stem || !form) return code;

    if (["r", "s", "a", "c"].includes(code[3])) {
      return joinParts([
        "verbo",
        stem,
        form,
        HEBREW_GENDER[rest[0]],
        HEBREW_NUMBER[rest[1]],
        HEBREW_STATE[rest[2]],
      ]);
    }

    return joinParts([
      "verbo",
      stem,
      form,
      rest[0] && /[123]/.test(rest[0])
        ? `${rest[0]}ª pessoa`
        : null,
      HEBREW_GENDER[rest[1]],
      HEBREW_NUMBER[rest[2]],
      HEBREW_STATE[rest[3]],
    ]);
  }

  if (category === "N") {
    const subtype: Record<string, string> = {
      c: "substantivo comum",
      p: "nome próprio",
      g: "substantivo gentílico",
    };

    return joinParts([
      subtype[code[2]] ?? "substantivo",
      HEBREW_GENDER[code[3]],
      HEBREW_NUMBER[code[4]],
      HEBREW_STATE[code[5]],
    ]);
  }

  if (category === "A") {
    return joinParts([
      "adjetivo",
      HEBREW_GENDER[code[3]],
      HEBREW_NUMBER[code[4]],
      HEBREW_STATE[code[5]],
    ]);
  }

  const simple: Record<string, string> = {
    C: "conjunção",
    R: "preposição",
    D: "advérbio",
    T: "partícula",
    P: "pronome",
    S: "sufixo",
  };

  return simple[category] ?? code;
}

function describeGreekMorphology(code: string): string {
  const parts = code.split("-");
  const category = parts[0] ?? "";

  if (category === "V" && parts.length >= 3) {
    const tam = parts[1] ?? "";
    const personNumber = parts[2] ?? "";

    return joinParts([
      "verbo",
      GREEK_TENSE[tam[0]],
      GREEK_VOICE[tam[1]],
      GREEK_MOOD[tam[2]],
      personNumber[0] && /[123]/.test(personNumber[0])
        ? `${personNumber[0]}ª pessoa`
        : null,
      GREEK_NUMBER[personNumber[1]],
    ]);
  }

  const nominalCategories: Record<string, string> = {
    N: "substantivo",
    A: "adjetivo",
    P: "pronome",
    R: "pronome relativo",
    D: "pronome demonstrativo",
    T: "artigo",
    X: "pronome indefinido/interrogativo",
  };

  if (nominalCategories[category]) {
    const detail = parts.at(-1) ?? "";
    const person =
      detail[0] && /[123]/.test(detail[0])
        ? `${detail[0]}ª pessoa`
        : null;
    const offset = person ? 1 : 0;

    return joinParts([
      nominalCategories[category],
      person,
      GREEK_CASE[detail[offset]],
      GREEK_NUMBER[detail[offset + 1]],
      GREEK_GENDER[detail[offset + 2]],
    ]);
  }

  const simple: Record<string, string> = {
    ADV: "advérbio",
    CONJ: "conjunção",
    PREP: "preposição",
    PRT: "partícula",
    INJ: "interjeição",
  };

  return simple[category] ?? code;
}

export function describeMorphology(
  language: OriginalLanguage,
  code: string | null,
): string | null {
  if (!code) return null;

  return language === "he"
    ? describeHebrewMorphology(code)
    : describeGreekMorphology(code);
}

export function cleanOriginalSurface(value: string): string {
  return value
    .replace(/[\/\\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function cleanTransliteration(
  value: string | null,
): string | null {
  if (!value) return null;

  return value
    .replace(/[\/\\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function cleanLexicalGloss(
  value: string | null,
): string | null {
  if (!value) return null;

  return value
    .replace(/\\?[HG]\d+[A-Z]?(?:=[^·;]*)?/gi, " ")
    .replace(/\bverseEnd\b/gi, " ")
    .replace(/»/g, " · ")
    .replace(/;+/g, " · ")
    .replace(/_/g, " ")
    .replace(/\[([^\]]+)\]/g, " ($1)")
    .replace(/:\d+(?=\s|·|$)/g, "")
    .replace(/\s*·\s*/g, " · ")
    .replace(/\s+/g, " ")
    .replace(/(?:\s*·\s*)+$/g, "")
    .trim();
}

export function buildWordCopyText({
  surface,
  transliteration,
  lemma,
  strong,
  morphologyDescription,
  morphologyCode,
  gloss,
}: {
  surface: string;
  transliteration: string | null;
  lemma: string | null;
  strong: string | null;
  morphologyDescription: string | null;
  morphologyCode: string | null;
  gloss: string | null;
}): string {
  return [
    surface,
    transliteration ? `Transliteração: ${transliteration}` : null,
    lemma ? `Lema: ${lemma}` : null,
    strong ? `Strong: ${strong}` : null,
    morphologyDescription
      ? `Morfologia: ${morphologyDescription}`
      : null,
    morphologyCode
      ? `Código morfológico: ${morphologyCode}`
      : null,
    gloss ? `Glosa STEPBible: ${gloss}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}
