import type { Study } from "@/lib/types";
import type { NormalizedReference, SearchQuery } from "@/lib/repositories/types";
import { normalizeText, tokenize } from "@/lib/search/normalize";

/**
 * Motor de busca em memória (Fase A: lexical, Fase C: filtros).
 * Fases D/E (semântica e híbrida) são trabalho futuro — ver
 * docs/SEARCH_SPEC.md e docs/ROADMAP.md — e não têm nenhum código aqui
 * ainda, de propósito.
 *
 * Este módulo é implementação pura (nenhum acesso a dados): recebe um
 * `Study` e um `SearchQuery` já estruturados e devolve uma pontuação.
 * Quem decide QUAIS estudos avaliar e COMO paginar é
 * `MockSearchRepository` (`src/lib/repositories/mock.ts`), que implementa
 * `SearchRepository` (`src/lib/repositories/types.ts`) — essa é a
 * fronteira que a Fase 2 substitui por uma consulta real no Postgres.
 * A extração de uma referência bíblica de texto livre (Fase B) acontece
 * antes disto, em `src/lib/search/queryParsing.ts`.
 *
 * RANKING — pesos de referência bíblica (três níveis, do mais específico
 * ao menos específico; ver docs/SEARCH_SPEC.md §5 e DEC-014):
 *   1. `referenceExactVerse` (1000) — a passagem do estudo contém (ou
 *      sobrepõe) exatamente o(s) versículo(s) pedido(s). Ex.: consulta
 *      "João 3:16" e o estudo tem uma passagem João 3:1-21 ou João 3:16.
 *   2. `referenceChapter` (700) — mesmo livro e capítulo, mas sem
 *      correspondência exata de versículo: a passagem do estudo está
 *      classificada apenas no nível de capítulo (sem versículo
 *      informado), ou os versículos não se sobrepõem. Ex.: consulta
 *      "João 3:16" recupera, com score menor, um estudo cuja passagem é
 *      só "João 3" (sem versículo) — mas nunca um estudo sem nenhuma
 *      passagem em João 3.
 *   3. `referenceBook` (500) — a consulta é só o nome do livro (sem
 *      capítulo): qualquer passagem do estudo nesse livro conta.
 * RANKING — pesos lexicais (Fase A), do mais específico ao menos
 * específico: título (100) > tema explícito (80) > personagem (70) >
 * palavra-chave (50) > resumo (30) > conteúdo completo (10).
 */
export const WEIGHTS = {
  referenceExactVerse: 1000,
  referenceChapter: 700,
  referenceBook: 500,
  title: 100,
  topic: 80,
  character: 70,
  keyword: 50,
  summary: 30,
  content: 10,
} as const;

/** Resultado da pontuação de um único estudo contra uma consulta. */
export interface StudyScore {
  score: number;
  /** Motivos do match, úteis para depuração e para destacar por que um resultado apareceu. */
  matchedOn: string[];
}

/**
 * Critérios de filtro simples (Fase C) — o subconjunto de `SearchQuery`
 * que não é texto/referência/paginação.
 */
type FilterCriteria = Pick<SearchQuery, "livro" | "testamento" | "tema" | "personagem" | "serie">;

export function matchesFilters(study: Study, filters: FilterCriteria): boolean {
  if (filters.livro && !study.passagens.some((p) => p.book.slug === filters.livro)) return false;
  if (filters.testamento && !study.passagens.some((p) => p.book.testamento === filters.testamento)) return false;
  if (filters.tema && !study.temas.some((t) => t.topic.slug === filters.tema)) return false;
  if (filters.personagem && !study.personagens.some((p) => p.character.slug === filters.personagem)) return false;
  if (filters.serie && !study.series.some((s) => s.series.slug === filters.serie)) return false;
  return true;
}

function referenceScore(study: Study, ref: NormalizedReference): number {
  let best = 0;

  for (const { book, passage } of study.passagens) {
    if (book.id !== ref.book.id) continue; // livro diferente nunca conta.

    if (ref.capitulo == null) {
      // Consulta é só o livro: qualquer capítulo do livro é relevante.
      best = Math.max(best, WEIGHTS.referenceBook);
      continue;
    }

    if (passage.capitulo !== ref.capitulo) continue; // capítulo diferente: esta passagem não conta.

    if (ref.versiculoInicio == null) {
      // Consulta é livro+capítulo (sem versículo): match de capítulo é o teto.
      best = Math.max(best, WEIGHTS.referenceChapter);
      continue;
    }

    if (passage.versiculoInicio == null) {
      // A passagem do estudo está classificada só no nível de capítulo
      // (sem versículo) — ainda relevante para uma busca por versículo
      // específico, mas menos que um match exato.
      best = Math.max(best, WEIGHTS.referenceChapter);
      continue;
    }

    const passageStart = passage.versiculoInicio;
    const passageEnd = passage.versiculoFim ?? passageStart;
    const queryEnd = ref.versiculoFim ?? ref.versiculoInicio;
    const overlaps = ref.versiculoInicio <= passageEnd && queryEnd >= passageStart;

    best = Math.max(best, overlaps ? WEIGHTS.referenceExactVerse : WEIGHTS.referenceChapter);
  }

  return best;
}

function lexicalScore(study: Study, queryTokens: string[]): StudyScore {
  if (queryTokens.length === 0) return { score: 0, matchedOn: [] };

  const matchedOn: string[] = [];
  let score = 0;

  const titleTokens = tokenize(study.titulo);
  const topicNames = study.temas.map((t) => normalizeText(t.topic.nome));
  const characterNames = study.personagens.map((p) => normalizeText(p.character.nome));
  const keywordTokens = study.palavrasChave.map((k) => normalizeText(k));
  const summaryTokens = tokenize(study.resumo);
  const contentTokens = tokenize(study.conteudo);

  for (const token of queryTokens) {
    if (titleTokens.includes(token)) {
      score += WEIGHTS.title;
      matchedOn.push("título");
    }
    if (topicNames.some((name) => name.includes(token))) {
      score += WEIGHTS.topic;
      matchedOn.push("tema");
    }
    if (characterNames.some((name) => name.includes(token))) {
      score += WEIGHTS.character;
      matchedOn.push("personagem");
    }
    if (keywordTokens.some((keyword) => keyword.includes(token))) {
      score += WEIGHTS.keyword;
      matchedOn.push("palavra-chave");
    }
    if (summaryTokens.includes(token)) {
      score += WEIGHTS.summary;
      matchedOn.push("resumo");
    }
    if (contentTokens.includes(token)) {
      score += WEIGHTS.content;
      matchedOn.push("conteúdo");
    }
  }

  return { score, matchedOn: [...new Set(matchedOn)] };
}

/**
 * Pontua um único estudo contra uma consulta já estruturada (referência
 * normalizada e/ou texto livre). Não faz I/O, não decide paginação, não
 * decide quais estudos avaliar — só calcula "o quanto este estudo
 * combina com esta consulta". Usado por `MockSearchRepository`.
 */
export function scoreStudy(study: Study, query: Pick<SearchQuery, "referencia" | "texto">): StudyScore {
  let score = 0;
  let matchedOn: string[] = [];

  if (query.referencia) {
    const refScore = referenceScore(study, query.referencia);
    if (refScore > 0) {
      score += refScore;
      matchedOn.push("referência bíblica");
    }
  }

  const queryTokens = tokenize(query.texto ?? "");
  const lexical = lexicalScore(study, queryTokens);
  score += lexical.score;
  matchedOn = [...matchedOn, ...lexical.matchedOn];

  return { score, matchedOn };
}
