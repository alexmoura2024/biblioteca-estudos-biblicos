import { books } from "@/lib/data/books";
import type { Book } from "@/lib/types";
import { normalizeText } from "@/lib/search/normalize";

/**
 * Parser de referências bíblicas (Fase B da busca — docs/SEARCH_SPEC.md).
 *
 * Reconhece o início de uma consulta como uma referência bíblica nos
 * formatos citados na especificação: "João 3:16", "Jo 3.16",
 * "João 3 16", "Lucas 22:47-52", apenas o livro ("João") ou livro+capítulo
 * ("João 3"). Suporta abreviações, variação de caixa e ausência de acentos.
 *
 * Limitação conhecida (documentada para a próxima sessão): a detecção
 * ocorre apenas no início da string. Uma referência no meio de uma frase
 * livre ("estudos sobre Lucas 22:47-52 e perdão") não é reconhecida como
 * referência aqui — mas ainda pode ser encontrada pela busca lexical
 * (Fase A) via palavras-chave/resumo. Ampliar para detecção em qualquer
 * posição é um passo futuro natural desta função.
 *
 * Regra de segurança (SEARCH_SPEC seção 4): nunca interpretar
 * silenciosamente uma referência ambígua. A única ambiguidade real no
 * cânon usado aqui é a abreviação "Jo", que pode significar "João" ou
 * "Jó" quando o acento é omitido. Por isso a resolução ocorre em duas
 * passagens: primeiro sensível a acentos (onde "Jo" e "Jó" são
 * inequívocos), e só then, se nada casar, cai para uma passagem sem
 * acentos — que sinaliza ambiguidade em vez de escolher um livro.
 */

export type ParsedReference =
  | { type: "book"; book: Book; matchedText: string }
  | { type: "chapter"; book: Book; capitulo: number; matchedText: string }
  | {
      type: "verse";
      book: Book;
      capitulo: number;
      versiculoInicio: number;
      versiculoFim?: number;
      matchedText: string;
    }
  | { type: "ambiguous"; candidates: Book[]; matchedText: string }
  | { type: "none" };

interface AliasEntry {
  alias: string;
  book: Book;
}

function bookAliases(book: Book): string[] {
  const raw = [book.nome, book.abreviacao];
  const variants = new Set<string>();
  for (const value of raw) {
    const lower = value.toLowerCase().trim();
    variants.add(lower);
    variants.add(lower.replace(/\s+/g, "")); // "1samuel", "1sm"
  }
  return [...variants];
}

/** Alias -> livro, preservando acentos (case-insensitive apenas). */
const ACCENT_SENSITIVE_ALIASES: AliasEntry[] = books
  .flatMap((book) => bookAliases(book).map((alias) => ({ alias, book })))
  .sort((a, b) => b.alias.length - a.alias.length);

/** Alias normalizado (sem acentos) -> lista de livros candidatos (pode ter mais de um = ambíguo). */
const NORMALIZED_ALIAS_MAP = new Map<string, Book[]>();
for (const { alias, book } of ACCENT_SENSITIVE_ALIASES) {
  const key = normalizeText(alias);
  const existing = NORMALIZED_ALIAS_MAP.get(key);
  if (existing) {
    if (!existing.includes(book)) existing.push(book);
  } else {
    NORMALIZED_ALIAS_MAP.set(key, [book]);
  }
}
const NORMALIZED_ALIASES: Array<{ alias: string; books: Book[] }> = [...NORMALIZED_ALIAS_MAP.entries()]
  .map(([alias, candidateBooks]) => ({ alias, books: candidateBooks }))
  .sort((a, b) => b.alias.length - a.alias.length);

/** Caractere de fronteira: nada, espaço, dígito ou pontuação de referência. */
function isBoundary(char: string | undefined): boolean {
  return char === undefined || /[\s.:,\-\d]/.test(char);
}

function matchLeadingAlias(
  trimmed: string,
): { book: Book; matchedText: string } | { ambiguous: Book[]; matchedText: string } | null {
  const lower = trimmed.toLowerCase();

  // Passagem 1: sensível a acentos (resolve "Jo" x "Jó" sem ambiguidade).
  for (const { alias, book } of ACCENT_SENSITIVE_ALIASES) {
    if (lower.startsWith(alias) && isBoundary(lower[alias.length])) {
      return { book, matchedText: trimmed.slice(0, alias.length) };
    }
  }

  // Passagem 2: sem acentos — só usada se a primeira não encontrou nada.
  const normalized = normalizeText(trimmed);
  for (const { alias, books: candidates } of NORMALIZED_ALIASES) {
    if (normalized.startsWith(alias) && isBoundary(normalized[alias.length])) {
      if (candidates.length > 1) {
        return { ambiguous: candidates, matchedText: trimmed.slice(0, alias.length) };
      }
      return { book: candidates[0], matchedText: trimmed.slice(0, alias.length) };
    }
  }

  return null;
}

const CHAPTER_VERSE_REGEX = /^[\s.:,]*(\d{1,3})(?:[\s.:]+(\d{1,3})(?:\s*-\s*(\d{1,3}))?)?/;

export function parseReference(query: string): ParsedReference {
  const trimmed = query.trim();
  if (!trimmed) return { type: "none" };

  const aliasMatch = matchLeadingAlias(trimmed);
  if (!aliasMatch) return { type: "none" };

  if ("ambiguous" in aliasMatch) {
    return {
      type: "ambiguous",
      candidates: aliasMatch.ambiguous,
      matchedText: aliasMatch.matchedText,
    };
  }

  const { book, matchedText } = aliasMatch;
  const rest = trimmed.slice(matchedText.length);

  const numbers = rest.match(CHAPTER_VERSE_REGEX);
  if (!numbers || numbers[1] === undefined) {
    // Abreviações de 2 letras coincidem com palavras comuns do português
    // (ex.: "Os" = Oséias, mas também o artigo "os"). Sem um número de
    // capítulo logo em seguida, só tratamos como referência quando a
    // consulta inteira é a abreviação — uma frase como "os cristãos e a
    // fé" não deve ser sequestrada pelo parser e deixa de ser reconhecida
    // como referência, caindo para a busca lexical normal.
    const isWholeQuery = rest.trim() === "";
    if (matchedText.length <= 2 && !isWholeQuery) {
      return { type: "none" };
    }
    return { type: "book", book, matchedText };
  }

  const capitulo = Number(numbers[1]);
  const fullMatch = matchedText + numbers[0];

  if (numbers[2] === undefined) {
    return { type: "chapter", book, capitulo, matchedText: fullMatch };
  }

  const versiculoInicio = Number(numbers[2]);
  const versiculoFim = numbers[3] !== undefined ? Number(numbers[3]) : undefined;

  return {
    type: "verse",
    book,
    capitulo,
    versiculoInicio,
    versiculoFim,
    matchedText: fullMatch,
  };
}
