const QUESTION_STOP_WORDS = new Set([
  "a", "ao", "aos", "as", "biblia", "bíblia", "biblico", "bíblico",
  "biblicos", "bíblicos", "biblioteca", "com", "como", "da", "das",
  "de", "diz", "dizem", "do", "dos", "e", "em", "ensina", "ensinam",
  "estudo", "estudos", "fala", "falam", "foi", "foram", "ha", "há",
  "mostra", "mostram", "na", "nas", "no", "nos", "o", "onde", "os",
  "ou", "para", "pode", "podem", "por", "qual", "quais", "quando",
  "que", "segundo", "ser", "sobre", "um", "uma", "é", "são",
]);

/**
 * Prepara uma pergunta natural para o mesmo motor lexical usado por /busca.
 * Não há IA, expansão de sinônimos, inferência teológica ou geração de texto.
 */
export function prepareLibraryQuestion(rawText: string): string {
  const tokens = rawText.match(/[\p{L}\p{N}]+/gu) ?? [];

  return tokens
    .filter((token) => {
      const normalized = token.toLocaleLowerCase("pt-BR");
      return !QUESTION_STOP_WORDS.has(normalized) && normalized.length >= 2;
    })
    .join(" ")
    .trim();
}
