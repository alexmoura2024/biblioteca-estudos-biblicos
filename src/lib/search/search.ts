import type { Book, Study } from "@/lib/types";
import { normalizeText, tokenize } from "@/lib/search/normalize";
import { parseReference } from "@/lib/search/referenceParser";

/**
 * Motor de busca local (Fase A: lexical, Fase B: referência bíblica,
 * Fase C: filtros). Fases D/E (semântica e híbrida) são trabalho futuro
 * — ver docs/SEARCH_SPEC.md e docs/ROADMAP.md — e não têm nenhum código
 * aqui ainda, de propósito.
 *
 * Ranking (docs/SEARCH_SPEC.md, seção 5), da maior prioridade à menor:
 *   1. Correspondência exata de referência bíblica
 *   2. Título
 *   3. Tema explícito
 *   4. Personagem
 *   5. Palavras-chave
 *   6. Resumo
 * (similaridade semântica fica para a Fase D)
 */

const WEIGHTS = {
  referenceExactVerse: 1000,
  referenceChapterOrBook: 600,
  title: 100,
  topic: 80,
  character: 70,
  keyword: 50,
  summary: 30,
  content: 10,
} as const;

export interface SearchFilters {
  livro?: string; // slug do livro
  testamento?: Book["testamento"];
  tema?: string; // slug do tema
  personagem?: string; // slug do personagem
  serie?: string; // slug da série
}

export interface SearchResultItem {
  study: Study;
  score: number;
  /** Motivos do match, úteis para depuração e para destacar por que um resultado apareceu. */
  matchedOn: string[];
}

export interface SearchResult {
  items: SearchResultItem[];
  /** Presente quando a consulta começa com uma referência bíblica ambígua (ex.: "Jo" sem contexto). */
  ambiguousReference?: { candidates: Book[]; matchedText: string };
  /** Referência bíblica reconhecida no início da consulta, se houver. */
  recognizedReference?: { book: Book; capitulo?: number; versiculoInicio?: number; versiculoFim?: number };
}

function passesFilters(study: Study, filters: SearchFilters): boolean {
  if (filters.livro && !study.passagens.some((p) => p.book.slug === filters.livro)) return false;
  if (filters.testamento && !study.passagens.some((p) => p.book.testamento === filters.testamento)) return false;
  if (filters.tema && !study.temas.some((t) => t.topic.slug === filters.tema)) return false;
  if (filters.personagem && !study.personagens.some((p) => p.character.slug === filters.personagem)) return false;
  if (filters.serie && !study.series.some((s) => s.series.slug === filters.serie)) return false;
  return true;
}

function referenceScore(
  study: Study,
  ref: { book: Book; capitulo?: number; versiculoInicio?: number; versiculoFim?: number },
): number {
  let best = 0;
  for (const { book, passage } of study.passagens) {
    if (book.id !== ref.book.id) continue;
    if (ref.capitulo == null) {
      best = Math.max(best, WEIGHTS.referenceChapterOrBook);
      continue;
    }
    if (passage.capitulo !== ref.capitulo) continue;
    if (ref.versiculoInicio == null) {
      best = Math.max(best, WEIGHTS.referenceChapterOrBook);
      continue;
    }
    const passageStart = passage.versiculoInicio ?? 0;
    const passageEnd = passage.versiculoFim ?? passageStart;
    const queryEnd = ref.versiculoFim ?? ref.versiculoInicio;
    const overlaps = ref.versiculoInicio <= passageEnd && queryEnd >= passageStart;
    if (overlaps) {
      best = Math.max(best, WEIGHTS.referenceExactVerse);
    }
  }
  return best;
}

function lexicalScore(study: Study, queryTokens: string[]): { score: number; matchedOn: string[] } {
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
 * Busca estudos publicados por texto livre, referência bíblica e filtros.
 *
 * `studies` deve já vir filtrado para o conjunto publicamente pesquisável
 * (ver `studyRepository.listPublished()`); esta função não filtra por
 * status editorial.
 */
export function searchStudies(
  studies: Study[],
  rawQuery: string,
  filters: SearchFilters = {},
): SearchResult {
  const query = rawQuery.trim();
  const candidates = studies.filter((study) => passesFilters(study, filters));

  const parsed = parseReference(query);

  if (parsed.type === "ambiguous") {
    return { items: [], ambiguousReference: { candidates: parsed.candidates, matchedText: parsed.matchedText } };
  }

  let reference:
    | { book: Book; capitulo?: number; versiculoInicio?: number; versiculoFim?: number }
    | undefined;
  let remainder = query;

  if (parsed.type === "book") {
    reference = { book: parsed.book };
    remainder = query.slice(parsed.matchedText.length).trim();
  } else if (parsed.type === "chapter") {
    reference = { book: parsed.book, capitulo: parsed.capitulo };
    remainder = query.slice(parsed.matchedText.length).trim();
  } else if (parsed.type === "verse") {
    reference = {
      book: parsed.book,
      capitulo: parsed.capitulo,
      versiculoInicio: parsed.versiculoInicio,
      versiculoFim: parsed.versiculoFim,
    };
    remainder = query.slice(parsed.matchedText.length).trim();
  }

  // Se a consulta inteira foi reconhecida como referência, o texto restante
  // (para busca lexical) é o que sobrar após o trecho já interpretado.
  const queryTokens = tokenize(remainder);

  const items: SearchResultItem[] = [];

  for (const study of candidates) {
    let score = 0;
    let matchedOn: string[] = [];

    if (reference) {
      const refScore = referenceScore(study, reference);
      if (refScore > 0) {
        score += refScore;
        matchedOn.push("referência bíblica");
      } else if (queryTokens.length === 0) {
        // Consulta era só uma referência e este estudo não a contém: fora.
        continue;
      }
    }

    const lexical = lexicalScore(study, queryTokens);
    score += lexical.score;
    matchedOn = [...matchedOn, ...lexical.matchedOn];

    // Sem nenhum texto de busca, mas com ao menos um filtro ativo (ex.:
    // combo de tema/livro na página de busca), todo estudo que passou
    // pelos filtros é um resultado válido — filtro puro sem texto ainda
    // é uma navegação legítima. Sem filtro nenhum e sem texto, a consulta
    // está vazia e não há nada a mostrar.
    const hasActiveFilter = Object.values(filters).some((v) => v != null && v !== "");
    const isFilterOnlyBrowse = !reference && queryTokens.length === 0 && hasActiveFilter;

    if (score > 0 || isFilterOnlyBrowse) {
      items.push({ study, score, matchedOn });
    }
  }

  items.sort((a, b) => b.score - a.score || a.study.titulo.localeCompare(b.study.titulo, "pt-BR"));

  return {
    items,
    recognizedReference: reference,
  };
}
