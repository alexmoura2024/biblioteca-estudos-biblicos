import { books } from "@/lib/data/books";
import { parseReference } from "@/lib/search/referenceParser";

export interface EditorDraft {
  titulo: string;
  autor: string;
  data_origem: string;
  tipo_estudo: string;
  referencia_principal: string;
  resumo: string;
  conteudo: string;
  palavras_chave: string;
}

export interface AuditCheck {
  id: string;
  label: string;
  detail: string;
  status: "pass" | "warn";
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const BIBLE_ALIASES = [...new Set(
  books.flatMap((book) => [book.nome, book.abreviacao]),
)]
  .sort((a, b) => b.length - a.length)
  .map(escapeRegExp)
  .join("|");

const REFERENCE_REGEX = new RegExp(
  `(?:^|[^\\p{L}\\p{N}])(${BIBLE_ALIASES})\\s*(\\d{1,3})(?:\\s*[:.]\\s*(\\d{1,3})(?:\\s*[-–—]\\s*(\\d{1,3}))?)?`,
  "giu",
);

export function extractBiblicalReferences(
  text: string,
  contextReference = "",
): string[] {
  const found: string[] = [];

  let normalizedText = text.replace(/\u00a0/g, " ");

  // Também reconhece formas editoriais por extenso, por exemplo:
  // "Apocalipse, capítulo 4, versículo 1"
  // "João capítulo 3 versículo 16"
  const proseReferenceRegex = new RegExp(
    `(${BIBLE_ALIASES})\\s*,?\\s*(?:cap(?:ítulo|itulo)?\\.?\\s*)?(\\d{1,3})\\s*,?\\s*(?:vers(?:ículo|iculo)?\\.?|v\\.?)[\\s:]*(\\d{1,3})(?:\\s*[-–—]\\s*(\\d{1,3}))?`,
    "giu",
  );

  normalizedText = normalizedText.replace(
    proseReferenceRegex,
    (_full, book, chapter, verseStart, verseEnd) =>
      `${book} ${chapter}:${verseStart}${
        verseEnd ? `-${verseEnd}` : ""
      }`,
  );

  REFERENCE_REGEX.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = REFERENCE_REGEX.exec(normalizedText)) !== null) {
    const raw = `${match[1]} ${match[2]}${
      match[3] ? `:${match[3]}` : ""
    }${match[4] ? `-${match[4]}` : ""}`;

    const parsed = parseReference(raw);
    if (
      parsed.type === "none" ||
      parsed.type === "ambiguous" ||
      parsed.type === "invalid"
    ) {
      continue;
    }

    const normalized =
      parsed.type === "book"
        ? parsed.book.nome
        : parsed.type === "chapter"
          ? `${parsed.book.nome} ${parsed.capitulo}`
          : `${parsed.book.nome} ${parsed.capitulo}:${parsed.versiculoInicio}${
              parsed.versiculoFim !== undefined
                ? `-${parsed.versiculoFim}`
                : ""
            }`;

    if (!found.includes(normalized)) found.push(normalized);
  }

  // Quando o estudo já possui uma referência principal, expressões como
  // "versículo 22", "v. 34" ou "versículos 35-37" herdam livro/capítulo
  // da referência principal. Isso é especialmente útil em mensagens
  // expositivas longas que permanecem no mesmo capítulo.
  if (contextReference.trim()) {
    const contextParsed = parseReference(contextReference.trim());

    if (
      contextParsed.type === "chapter" ||
      contextParsed.type === "verse"
    ) {
      const contextBook = contextParsed.book.nome;
      const contextChapter = contextParsed.capitulo;

      const verseOnlyRegex =
        /\b(?:vers(?:í|i)culo(?:s)?|v\.?)\s*(\d{1,3})(?:\s*[-–—]\s*(\d{1,3}))?/giu;

      let verseMatch: RegExpExecArray | null;
      while ((verseMatch = verseOnlyRegex.exec(normalizedText)) !== null) {
        const start = Number(verseMatch[1]);
        const end =
          verseMatch[2] !== undefined ? Number(verseMatch[2]) : undefined;

        const raw = `${contextBook} ${contextChapter}:${start}${
          end !== undefined ? `-${end}` : ""
        }`;

        const parsed = parseReference(raw);
        if (parsed.type !== "verse") continue;

        const normalized =
          `${parsed.book.nome} ${parsed.capitulo}:${parsed.versiculoInicio}` +
          `${
            parsed.versiculoFim !== undefined
              ? `-${parsed.versiculoFim}`
              : ""
          }`;

        if (!found.includes(normalized)) found.push(normalized);
      }
    }
  }

  return found;
}

export function normalizeDraftMarkdown(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

export function auditStudyDraft(draft: EditorDraft): AuditCheck[] {
  const content = normalizeDraftMarkdown(draft.conteudo);
  const references = extractBiblicalReferences(
    content,
    draft.referencia_principal,
  );
  const keywords = draft.palavras_chave
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const hasIntroduction = /\*\*Introdu[cç][aã]o\*\*/i.test(content);
  const hasDevelopment = /\*\*Desenvolvimento\*\*/i.test(content);
  const hasConclusion = /\*\*Conclus[aã]o\*\*/i.test(content);

  let referenceValid = false;
  if (draft.referencia_principal.trim()) {
    const parsed = parseReference(draft.referencia_principal.trim());
    referenceValid =
      parsed.type === "chapter" || parsed.type === "verse";
  }

  return [
    {
      id: "titulo",
      label: "Título",
      detail: draft.titulo.trim()
        ? "Título informado."
        : "Informe um título antes de enviar para revisão.",
      status: draft.titulo.trim() ? "pass" : "warn",
    },
    {
      id: "autor",
      label: "Autor",
      detail: draft.autor.trim()
        ? "Autor informado."
        : "Informe o autor do estudo.",
      status: draft.autor.trim() ? "pass" : "warn",
    },
    {
      id: "data",
      label: "Data de origem",
      detail: /^\d{4}-\d{2}-\d{2}$/.test(draft.data_origem)
        ? "Data informada."
        : "A data de origem ainda não foi informada.",
      status: /^\d{4}-\d{2}-\d{2}$/.test(draft.data_origem)
        ? "pass"
        : "warn",
    },
    {
      id: "referencia",
      label: "Referência principal",
      detail: referenceValid
        ? "Referência bíblica principal reconhecida."
        : "Informe uma referência válida com livro e capítulo.",
      status: referenceValid ? "pass" : "warn",
    },
    {
      id: "estrutura",
      label: "Estrutura editorial",
      detail:
        hasIntroduction && hasDevelopment && hasConclusion
          ? "Introdução, Desenvolvimento e Conclusão encontrados."
          : "Ainda faltam uma ou mais seções editoriais.",
      status:
        hasIntroduction && hasDevelopment && hasConclusion
          ? "pass"
          : "warn",
    },
    {
      id: "conteudo",
      label: "Conteúdo",
      detail:
        content.length >= 300
          ? `${content.length.toLocaleString("pt-BR")} caracteres no estudo.`
          : "O conteúdo ainda está muito curto para uma mensagem completa.",
      status: content.length >= 300 ? "pass" : "warn",
    },
    {
      id: "resumo",
      label: "Resumo",
      detail:
        draft.resumo.trim().length >= 80
          ? "Resumo com tamanho editorial adequado."
          : "Resumo ausente ou muito curto.",
      status: draft.resumo.trim().length >= 80 ? "pass" : "warn",
    },
    {
      id: "palavras",
      label: "Palavras-chave",
      detail:
        keywords.length >= 3
          ? `${keywords.length} palavras-chave informadas.`
          : "Sugestão: use pelo menos 3 palavras-chave.",
      status: keywords.length >= 3 ? "pass" : "warn",
    },
    {
      id: "referencias-conteudo",
      label: "Referências no texto",
      detail:
        references.length > 0
          ? `${references.length} referência(s) bíblica(s) reconhecida(s).`
          : "Nenhuma referência bíblica foi reconhecida no conteúdo.",
      status: references.length > 0 ? "pass" : "warn",
    },
  ];
}
