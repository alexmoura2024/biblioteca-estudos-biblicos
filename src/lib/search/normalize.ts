/**
 * Normalização de texto usada pela busca lexical e pelo parser de
 * referências bíblicas (ver docs/SEARCH_SPEC.md, seção 4).
 *
 * Remove acentuação, baixa a caixa e colapsa espaços, para que
 * "João", "joao", "JOÃO" e "  joão  " sejam tratados como equivalentes.
 */
const DIACRITICS_REGEX = /[̀-ͯ]/g;

export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(DIACRITICS_REGEX, "") // remove diacríticos (acentos, til, cedilha decomposta)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/** Gera um slug de URL (kebab-case, sem acentos) a partir de um texto livre. */
export function slugify(value: string): string {
  return normalizeText(value)
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Divide um texto normalizado em tokens (palavras) não vazios. */
export function tokenize(value: string): string[] {
  return normalizeText(value)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}
