export const MAX_LIBRARY_DRAFT_SOURCES = 6;
export const MAX_LIBRARY_DRAFT_REQUEST_LENGTH = 600;
export const MAX_LIBRARY_SEARCH_TERMS = 6;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SEARCH_STOP_WORDS = new Set([
  "a",
  "as",
  "com",
  "como",
  "criar",
  "da",
  "das",
  "de",
  "do",
  "dos",
  "e",
  "em",
  "estudo",
  "fazer",
  "na",
  "nas",
  "no",
  "nos",
  "o",
  "os",
  "para",
  "por",
  "quero",
  "seu",
  "seus",
  "sobre",
  "sua",
  "suas",
  "um",
  "uma",
]);

export interface LibraryDraftInput {
  request: string;
  sourceIds: string[];
}

export function normalizeLibraryDraftRequest(value: unknown): string {
  if (typeof value !== "string") return "";

  return value
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_LIBRARY_DRAFT_REQUEST_LENGTH);
}

export function libraryDraftSearchTerms(value: unknown): string[] {
  const request = normalizeLibraryDraftRequest(value)
    .toLocaleLowerCase("pt-BR");

  const words = request.match(/[\p{L}\p{N}-]+/gu) ?? [];
  const unique = new Set<string>();

  for (const word of words) {
    if (word.length < 3 || SEARCH_STOP_WORDS.has(word)) continue;

    unique.add(word);

    if (unique.size >= MAX_LIBRARY_SEARCH_TERMS) break;
  }

  return [...unique];
}

export function buildLibrarySourceSearchFilter(
  value: unknown,
): string | null {
  const terms = libraryDraftSearchTerms(value);
  if (terms.length === 0) return null;

  return terms
    .flatMap((term) => [
      `titulo.ilike.%${term}%`,
      `resumo.ilike.%${term}%`,
      `conteudo.ilike.%${term}%`,
    ])
    .join(",");
}

export function normalizeLibraryDraftSourceIds(
  value: unknown,
): string[] {
  if (!Array.isArray(value)) return [];

  const unique = new Set<string>();

  for (const item of value) {
    if (typeof item !== "string") continue;

    const id = item.trim().toLowerCase();
    if (!UUID_PATTERN.test(id)) continue;

    unique.add(id);

    if (unique.size >= MAX_LIBRARY_DRAFT_SOURCES) break;
  }

  return [...unique];
}

export function parseLibraryDraftInput(
  value: unknown,
): LibraryDraftInput {
  const record =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};

  const request = normalizeLibraryDraftRequest(record.request);
  const sourceIds = normalizeLibraryDraftSourceIds(
    record.source_ids,
  );

  if (!request) {
    throw new Error("Descreva o estudo que deseja criar.");
  }

  if (sourceIds.length === 0) {
    throw new Error(
      "Selecione pelo menos uma fonte do acervo.",
    );
  }

  return { request, sourceIds };
}

export function selectLibraryDraftSources<
  T extends { id: string },
>(
  availableSources: T[],
  selectedIds: string[],
): T[] {
  const byId = new Map(
    availableSources.map((source) => [
      source.id.toLowerCase(),
      source,
    ]),
  );

  return selectedIds
    .map((id) => byId.get(id.toLowerCase()))
    .filter((source): source is T => Boolean(source));
}
export const LIBRARY_DRAFT_SOURCE_CONTENT_LIMIT = 14000;

export interface LibraryDraftEvidenceSource {
  id: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  status: "PUBLISHED" | "REVIEW" | "DRAFT";
  author?: string;
  originDate?: string;
}

export function buildLibraryDraftEvidence(
  sources: LibraryDraftEvidenceSource[],
): string {
  return sources
    .map((source, index) => {
      const content = source.content
        .replace(/\r\n?/g, "\n")
        .trim()
        .slice(0, LIBRARY_DRAFT_SOURCE_CONTENT_LIMIT);

      const summary = source.summary
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 1500);

      return [
        `[FONTE ${index + 1}]`,
        `ID: ${source.id}`,
        `TÍTULO: ${source.title}`,
        `STATUS: ${source.status}`,
        source.author ? `AUTOR: ${source.author}` : "",
        source.originDate
          ? `DATA DE ORIGEM: ${source.originDate}`
          : "",
        summary ? `RESUMO: ${summary}` : "",
        `CONTEÚDO:\n${content}`,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n---\n\n");
}
export interface LibrarySourceCandidate {
  id: string;
  title: string;
  slug: string;
  summary: string;
  status: "PUBLISHED" | "REVIEW" | "DRAFT";
  matchedTerms: string[];
}

export function rankLibrarySourceCandidates(
  candidates: LibrarySourceCandidate[],
  termCounts: Record<string, number>,
): LibrarySourceCandidate[] {
  function normalized(value: string): string {
    return value.normalize("NFKC").toLocaleLowerCase("pt-BR");
  }

  function score(candidate: LibrarySourceCandidate): number {
    const title = normalized(candidate.title);
    const summary = normalized(candidate.summary);
    const distinctTerms = [...new Set(candidate.matchedTerms)];

    return distinctTerms.reduce((total, term) => {
      const count = Math.max(0, termCounts[term] ?? 0);
      const rarityWeight = 10000 / (count + 10);
      const titleWeight = title.includes(term) ? 300 : 0;
      const summaryWeight = summary.includes(term) ? 80 : 0;

      return total + 1000 + rarityWeight + titleWeight + summaryWeight;
    }, 0);
  }

  return [...candidates].sort((left, right) => {
    const scoreDifference = score(right) - score(left);

    if (scoreDifference !== 0) {
      return scoreDifference;
    }

    return left.title.localeCompare(right.title, "pt-BR");
  });
}
export function normalizeLibraryDraftOutput(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(
      /^(?:#{1,6}[ \t]*)?(?:\*\*)?[ \t]*Introdu[cç][aã]o[ \t]*(?:\*\*)?[ \t]*:?[ \t]*$/gim,
      "**Introdução**",
    )
    .replace(
      /^(?:#{1,6}[ \t]*)?(?:\*\*)?[ \t]*Desenvolvimento[ \t]*(?:\*\*)?[ \t]*:?[ \t]*$/gim,
      "**Desenvolvimento**",
    )
    .replace(
      /^(?:#{1,6}[ \t]*)?(?:\*\*)?[ \t]*Conclus[aã]o[ \t]*(?:\*\*)?[ \t]*:?[ \t]*$/gim,
      "**Conclusão**",
    )
    .replace(
      /^(\*\*(?:Introdução|Desenvolvimento|Conclusão)\*\*)\n+\1$/gim,
      "$1",
    )
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}
