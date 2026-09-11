export type OriginalLanguage = "he" | "grc";

export interface OriginalWord {
  id: string;
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

export interface OriginalOccurrence {
  bookName: string;
  bookSlug: string;
  chapter: number;
  verse: number;
}
