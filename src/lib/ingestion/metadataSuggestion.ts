/**
 * Sugestões auxiliares de metadados (Fase 3, Etapa 4 itens 12/13 —
 * "gerar resumo editorial auxiliar", "gerar palavras-chave") —
 * inteiramente determinísticas (sem IA, CLAUDE.md §3) e sempre marcadas
 * como sugestão: o estudo criado por elas nasce em `DRAFT`/`REVIEW`
 * (nunca `PUBLISHED`), então nada aqui vira fato editorial sem revisão
 * humana (INGESTION_SPEC.md §6).
 */

const STOPWORDS = new Set([
  "a", "o", "as", "os", "de", "da", "do", "das", "dos", "e", "em", "um", "uma", "uns", "umas", "para", "por", "com",
  "que", "se", "na", "no", "nas", "nos", "ao", "aos", "à", "às", "é", "foi", "ser", "são", "como", "mais", "muito",
  "também", "não", "sua", "seu", "suas", "seus", "isso", "este", "esta", "isto", "esse", "essa", "ele", "ela",
  "eles", "elas", "nós", "lhe", "lhes", "tem", "têm", "havia", "houve", "assim", "quando", "onde", "porque", "pois",
  "mas", "ou", "já", "ainda", "sobre", "entre", "até", "depois", "antes", "então", "cada", "seja", "sendo", "ser",
  "sido", "estava", "estava", "todo", "toda", "todos", "todas", "outro", "outra", "outros", "outras", "qual",
  "quais", "aquele", "aquela", "aqueles", "aquelas", "aquilo", "pelo", "pela", "pelos", "pelas", "nosso", "nossa",
]);

const WORD_REGEX = /\p{L}{4,}/gu;

/**
 * Resumo auxiliar: os primeiros `maxLength` caracteres do texto extraído,
 * cortado numa fronteira de palavra. Nunca reescreve/resume de verdade
 * (isso exigiria um modelo de linguagem) — é literalmente a abertura do
 * documento, o suficiente para um revisor humano reconhecer do que se
 * trata antes de abrir o arquivo original.
 */
export function suggestSummary(texto: string, maxLength = 240): string {
  const normalizado = texto.replace(/\s+/g, " ").trim();
  if (normalizado.length <= maxLength) return normalizado;
  const cut = normalizado.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : maxLength)}…`;
}

/**
 * Palavras-chave auxiliares: os `max` tokens mais frequentes do texto
 * (>= 4 letras, fora de uma lista de palavras comuns do português),
 * preservando a forma (acentos/caixa) da primeira ocorrência de cada um
 * — não os tokens normalizados sem acento usados internamente pela
 * busca (`src/lib/search/normalize.ts`), que ficariam feios como
 * palavra-chave editorial.
 */
export function suggestKeywords(texto: string, max = 8): string[] {
  const counts = new Map<string, number>();
  const displayForm = new Map<string, string>();

  for (const match of texto.matchAll(WORD_REGEX)) {
    const raw = match[0];
    const key = raw.toLowerCase();
    if (STOPWORDS.has(key)) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
    if (!displayForm.has(key)) displayForm.set(key, raw);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, max)
    .map(([key]) => displayForm.get(key) ?? key);
}
