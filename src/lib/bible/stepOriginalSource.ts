import type { OriginalLanguage } from "./originalTypes";

export interface ParsedStepWord {
  bookCode: string;
  chapter: number;
  verse: number;
  position: number;
  language: OriginalLanguage;
  surface: string;
  transliteration: string | null;
  lemma: string | null;
  strong: string | null;
  strongExtended: string | null;
  morphology: string | null;
  gloss: string | null;
  contextualTranslation: string | null;
  isProperName: boolean;
}

function normalizeStrong(value: string | null): string | null {
  if (!value) return null;

  const match = value.match(/([HG])0*(\d+)/i);
  if (!match) return null;

  return `${match[1].toUpperCase()}${Number(match[2])}`;
}

function firstExtendedStrong(
  value: string,
  prefix: "H" | "G",
): string | null {
  const match = value.match(
    new RegExp(`${prefix}\\d+[A-Z]?`, "i"),
  );

  return match ? match[0].toUpperCase() : null;
}

function parseReference(
  cell: string,
  preferKjvAlternate: boolean,
): {
  bookCode: string;
  chapter: number;
  verse: number;
  position: number;
  type: string;
} | null {
  const hashIndex = cell.indexOf("#");
  if (hashIndex < 0) return null;

  const refPart = cell.slice(0, hashIndex);
  const wordPart = cell.slice(hashIndex + 1);

  const base = refPart.match(
    /^([1-3]?[A-Za-z]{2,3})\.(\d+)\.(\d+)/,
  );
  const word = wordPart.match(/^(\d+)=([^\t]*)/);

  if (!base || !word) return null;

  let chapter = Number(base[2]);
  let verse = Number(base[3]);

  if (preferKjvAlternate) {
    const kjv = refPart.match(/\[(\d+)\.(\d+)\]/);
    if (kjv) {
      chapter = Number(kjv[1]);
      verse = Number(kjv[2]);
    }
  }

  if (chapter < 1 || verse < 1) return null;

  return {
    bookCode: base[1],
    chapter,
    verse,
    position: Number(word[1]),
    type: word[2],
  };
}

function parseHebrewLemmaAndGloss(
  expanded: string,
  rootExtended: string | null,
): { lemma: string | null; gloss: string | null } {
  if (!expanded || !rootExtended) {
    return { lemma: null, gloss: null };
  }

  for (const rawSegment of expanded.split("/")) {
    const segment = rawSegment.replace(/[{}]/g, "").trim();

    if (!segment.startsWith(`${rootExtended}=`)) continue;

    const parts = segment.split("=");
    const lemma = parts[1]?.trim() || null;
    const gloss =
      parts
        .slice(2)
        .join("=")
        .trim()
        .replace(/^:\s*/, "")
        .replace(/\s+/g, " ") || null;

    return { lemma, gloss };
  }

  return { lemma: null, gloss: null };
}

export function parseHebrewStepLine(
  line: string,
): ParsedStepWord | null {
  if (!/^[1-3]?[A-Za-z]{2,3}\.\d+\.\d+/.test(line)) {
    return null;
  }

  const columns = line.split("\t");
  const ref = parseReference(columns[0] || "", false);
  if (!ref) return null;

  // O próprio TAHOT informa que tradutores normalmente seguem L/Q,
  // além de R (texto restaurado) e X (adições preservadas na LXX).
  const textType = ref.type.charAt(0).toUpperCase();
  if (!["L", "Q", "R", "X"].includes(textType)) {
    return null;
  }

  const dStrong = columns[4] || "";
  const rootFromBraces = dStrong.match(/\{(H\d+[A-Z]?)\}/i)?.[1];
  const rootColumn = columns[8] || "";
  const rootExtended =
    rootFromBraces?.toUpperCase() ||
    firstExtendedStrong(rootColumn, "H") ||
    firstExtendedStrong(dStrong, "H");

  const expanded = columns[11] || "";
  const lexical = parseHebrewLemmaAndGloss(
    expanded,
    rootExtended,
  );

  return {
    bookCode: ref.bookCode,
    chapter: ref.chapter,
    verse: ref.verse,
    position: ref.position,
    language: "he",
    surface: (columns[1] || "").trim(),
    transliteration: (columns[2] || "").trim() || null,
    lemma: lexical.lemma,
    strong: normalizeStrong(rootExtended),
    strongExtended: rootExtended,
    morphology: (columns[5] || "").trim() || null,
    gloss: lexical.gloss,
    contextualTranslation: (columns[3] || "").trim() || null,
    isProperName:
      expanded.includes("@") ||
      /(?:^|\/)H?Np/i.test(columns[5] || ""),
  };
}

export function parseGreekStepLine(
  line: string,
): ParsedStepWord | null {
  if (!/^[1-3]?[A-Za-z]{2,3}\.\d+\.\d+/.test(line)) {
    return null;
  }

  const columns = line.split("\t");
  const ref = parseReference(columns[0] || "", true);
  if (!ref) return null;

  const editions = (columns[5] || "")
    .split("+")
    .map((item) => item.trim());

  // ACF segue a tradição do Textus Receptus. Para o NT, mostramos
  // somente palavras presentes na edição TR do TAGNT.
  if (!editions.includes("TR")) return null;

  const greekCell = (columns[1] || "").trim();
  const surfaceMatch = greekCell.match(
    /^(.*?)\s+\(([^()]*)\)\s*$/,
  );

  const surface = surfaceMatch
    ? surfaceMatch[1].trim()
    : greekCell;
  const transliteration = surfaceMatch
    ? surfaceMatch[2].trim() || null
    : null;

  const tagged = (columns[3] || "").trim();
  const equalIndex = tagged.indexOf("=");
  const dStrong =
    equalIndex >= 0 ? tagged.slice(0, equalIndex) : tagged;
  const morphology =
    equalIndex >= 0
      ? tagged.slice(equalIndex + 1).trim() || null
      : null;

  const dictionary = (columns[4] || "").trim();
  const dictionaryIndex = dictionary.indexOf("=");
  const lemma =
    dictionaryIndex >= 0
      ? dictionary.slice(0, dictionaryIndex).trim() || null
      : null;
  const gloss =
    dictionaryIndex >= 0
      ? dictionary.slice(dictionaryIndex + 1).trim() || null
      : null;

  const simpleStrong =
    normalizeStrong((columns[11] || "").split("_")[0]) ||
    normalizeStrong(dStrong);

  return {
    bookCode: ref.bookCode,
    chapter: ref.chapter,
    verse: ref.verse,
    position: ref.position,
    language: "grc",
    surface,
    transliteration,
    lemma,
    strong: simpleStrong,
    strongExtended: firstExtendedStrong(dStrong, "G"),
    morphology,
    gloss,
    contextualTranslation: (columns[2] || "").trim() || null,
    isProperName:
      Boolean(morphology?.endsWith("-P")) ||
      (columns[9] || "").includes("@"),
  };
}
