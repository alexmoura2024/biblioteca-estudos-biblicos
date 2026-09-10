const QUESTION_STOP_WORDS = new Set([
  "a", "ao", "aos", "as", "acervo", "ano", "anos", "apresenta", "apresentam",
  "biblia", "bíblia", "biblico", "bíblico", "biblicos", "bíblicos",
  "biblioteca", "com", "como", "da", "das", "de", "diz", "dizem", "do",
  "dos", "e", "em", "ensina", "ensinam", "está", "este", "esta", "estudo",
  "estudos", "fala", "falam", "foi", "foram", "ha", "há", "isso", "isto",
  "mostra", "mostram", "na", "nas", "no", "nos", "o", "onde", "os", "ou",
  "para", "pode", "podem", "por", "qual", "quais", "quando", "quanta",
  "quantas", "quanto", "quantos", "que", "quem", "era", "se", "segundo", "senhor", "ser",
  "servo", "servos", "sobre", "trata", "tratam", "um", "uma", "é", "são",
]);

type CharacterLike = {
  nome: string;
  slug: string;
};

type ConfidenceItem = {
  score: number;
  matchedOn: string[];
};

function normalizeForComparison(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Prepara uma pergunta natural para o motor lexical.
 * Não há inferência teológica nem expansão de conteúdo.
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

/**
 * Detecta apenas menções exatas a personagens já catalogados.
 * Isso evita colisões de stemming, como "José" x "Josias".
 */
export function findMentionedCharacter<T extends CharacterLike>(
  question: string,
  characters: T[],
): T | undefined {
  const haystack = ` ${normalizeForComparison(question)} `;

  return [...characters]
    .sort((a, b) => b.nome.length - a.nome.length)
    .find((character) =>
      haystack.includes(` ${normalizeForComparison(character.nome)} `),
    );
}

/**
 * Perguntas factuais pedem uma resposta curta extraída dos próprios estudos.
 * Nesses casos, a IA pode sintetizar evidência, sempre com fontes do acervo.
 */
export function isFactualLibraryQuestion(question: string): boolean {
  const normalized = normalizeForComparison(question);

  return /\b(quantos?|quantas?|quando|onde|quem|qual|quais)\b/.test(normalized);
}

/**
 * A IA de reformulação só é chamada quando a busca estrita não encontra nada
 * ou quando o primeiro resultado é muito fraco e aparece somente em um campo.
 */
export function shouldUseAiFallback(items: ConfidenceItem[]): boolean {
  if (items.length === 0) return true;

  const top = items[0];
  return top.score < 50 && top.matchedOn.length <= 1;
}
