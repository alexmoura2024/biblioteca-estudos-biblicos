import { parseReference, type InvalidReferenceReason } from "@/lib/search/referenceParser";
import { getMaxVerse } from "@/lib/data/bibleVerseLimits";
import type { NormalizedReference } from "@/lib/repositories/types";
import type { Book } from "@/lib/types";

/**
 * Ponte entre texto livre digitado pelo usuário (Fase A) e a referência
 * bíblica normalizada que `SearchRepository` espera (Fase B). Esta é a
 * ÚNICA camada que lida com "o usuário pode ter digitado uma referência
 * ambígua ou inválida" — `SearchRepository` nunca recebe uma string de
 * busca crua nem precisa saber que "João 999:999" não existe.
 */
export interface ParsedSearchQuery {
  /** Texto livre para a busca lexical (Fase A) — o que sobra após qualquer referência reconhecida ser extraída. */
  texto: string;
  /** Referência bíblica normalizada e estruturalmente válida, pronta para `SearchRepository.search()`. */
  referencia?: NormalizedReference;
  /** Mesma informação de `referencia`, para exibição amigável ("Referência reconhecida: João 3:16"). */
  recognizedReference?: NormalizedReference;
  /** A consulta começa com uma referência ambígua (ex.: "Jo" sem contexto suficiente) — mostrar desambiguação, nunca escolher um livro silenciosamente. */
  ambiguousReference?: { candidates: Book[]; matchedText: string };
  /** A consulta parece uma referência, mas é estruturalmente impossível (capítulo/versículo fora do intervalo) — mostrar um aviso explícito, nunca "Referência reconhecida: João 999:999". */
  invalidReference?: {
    book: Book;
    capitulo: number;
    versiculoInicio?: number;
    versiculoFim?: number;
    reason: InvalidReferenceReason;
    matchedText: string;
    /** Preenchido só quando `reason` é `versiculo_acima_do_maximo_do_capitulo` — o último versículo real do capítulo, para a mensagem da UI. */
    versiculoMaximo?: number;
  };
}

export function parseSearchQuery(rawQuery: string): ParsedSearchQuery {
  const query = rawQuery.trim();
  const parsed = parseReference(query);

  switch (parsed.type) {
    case "ambiguous":
      return {
        texto: "",
        ambiguousReference: { candidates: parsed.candidates, matchedText: parsed.matchedText },
      };

    case "invalid":
      // Mantemos a consulta inteira como texto livre: a referência não
      // foi validada, mas o restante ainda pode conter palavras-chave
      // úteis para a busca lexical (Fase A), em vez de um beco sem saída.
      return {
        texto: query,
        invalidReference: {
          book: parsed.book,
          capitulo: parsed.capitulo,
          versiculoInicio: parsed.versiculoInicio,
          versiculoFim: parsed.versiculoFim,
          reason: parsed.reason,
          matchedText: parsed.matchedText,
          versiculoMaximo:
            parsed.reason === "versiculo_acima_do_maximo_do_capitulo"
              ? getMaxVerse(parsed.book.slug, parsed.capitulo)
              : undefined,
        },
      };

    case "book": {
      const referencia: NormalizedReference = { book: parsed.book };
      return {
        texto: query.slice(parsed.matchedText.length).trim(),
        referencia,
        recognizedReference: referencia,
      };
    }

    case "chapter": {
      const referencia: NormalizedReference = { book: parsed.book, capitulo: parsed.capitulo };
      return {
        texto: query.slice(parsed.matchedText.length).trim(),
        referencia,
        recognizedReference: referencia,
      };
    }

    case "verse": {
      const referencia: NormalizedReference = {
        book: parsed.book,
        capitulo: parsed.capitulo,
        versiculoInicio: parsed.versiculoInicio,
        versiculoFim: parsed.versiculoFim,
      };
      return {
        texto: query.slice(parsed.matchedText.length).trim(),
        referencia,
        recognizedReference: referencia,
      };
    }

    case "none":
    default:
      return { texto: query };
  }
}

interface InvalidReferenceMessageContext {
  bookName: string;
  totalCapitulos: number;
  capitulo: number;
  /** Só relevante para `versiculo_acima_do_maximo_do_capitulo`. */
  versiculoMaximo?: number;
}

/** Mensagens amigáveis para cada motivo de referência inválida — usadas pela UI. */
export const INVALID_REFERENCE_MESSAGES: Record<InvalidReferenceReason, (ctx: InvalidReferenceMessageContext) => string> = {
  capitulo_fora_do_intervalo: ({ bookName, totalCapitulos, capitulo }) =>
    `${bookName} tem ${totalCapitulos} capítulo${totalCapitulos === 1 ? "" : "s"}; o capítulo ${capitulo} não existe.`,
  versiculo_menor_que_um: () => "O número do versículo precisa ser maior ou igual a 1.",
  intervalo_de_versiculos_invertido: () => "O versículo final do intervalo não pode ser menor que o inicial.",
  versiculo_acima_do_maximo_do_capitulo: ({ bookName, capitulo, versiculoMaximo }) =>
    versiculoMaximo != null
      ? `${bookName} ${capitulo} tem ${versiculoMaximo} versículo${versiculoMaximo === 1 ? "" : "s"}; esse versículo não existe.`
      : `Esse versículo não existe em ${bookName} ${capitulo}.`,
};
