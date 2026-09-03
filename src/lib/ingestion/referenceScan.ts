import { books } from "@/lib/data/books";
import { getMaxVerse } from "@/lib/data/bibleVerseLimits";
import type { Book, TipoRelacaoPassagem } from "@/lib/types";

/**
 * Detecção de referências bíblicas em texto livre de documentos reais
 * (Fase 3, Etapa 6) — diferente de `src/lib/search/referenceParser.ts`
 * (Fase B da busca), que só reconhece uma referência no INÍCIO de uma
 * consulta curta. Um estudo real pode citar várias referências em
 * qualquer posição do corpo do texto (ex.: "João 6:51,54,55,57" e,
 * mais adiante, "Gênesis 14:18–19") — esta função varre o texto inteiro.
 *
 * Reaproveita a mesma tabela canônica de limite de versículo
 * (`bibleVerseLimits.ts`) usada pelo parser da busca: uma referência
 * estruturalmente impossível nunca é aceita aqui também (CLAUDE.md §3) —
 * ela é reportada como `valid: false` com o motivo, nunca armazenada
 * silenciosamente como se fosse válida (INGESTION_SPEC.md §6: "sugestões
 * não devem virar publicação automaticamente"; uma referência inválida é
 * menos ainda do que uma sugestão — é um alerta de revisão).
 *
 * Mais restritivo que o parser da busca de propósito PARA ABREVIAÇÕES:
 * abreviações (ex.: "Jo", "At") só são reconhecidas sensíveis a acento —
 * nunca o fallback ambíguo que resolveria "Jo"/"Jó" (um documento
 * inteiro é grande demais para arriscar falsos positivos de abreviações
 * curtas ambíguas). Uma referência ambígua em texto livre nunca é
 * resolvida silenciosamente (mesma regra da busca).
 *
 * Para NOMES COMPLETOS de livro (ex.: "Gálatas", "Êxodo"), o risco de
 * falso positivo por remover o acento é muito menor (são palavras
 * distintivas, não abreviações de 2-3 letras) — achado real ao rodar
 * contra o piloto (Fase 3, checkpoint 12): o documento de REV-001
 * escreve "Galatas 1:11-12" sem o acento, e a varredura só sensível a
 * acento não reconhecia isso, mesmo com a referência claramente
 * presente no texto. Por isso há uma segunda passagem, só para nomes
 * completos, insensível a acento — verificando antes que nenhum outro
 * nome de livro normalize para a mesma forma (colisão realmente
 * ambígua fica de fora dessa passagem, nunca resolvida por suposição).
 */

export interface DetectedReference {
  book: Book;
  capitulo: number;
  versiculoInicio?: number;
  versiculoFim?: number;
  /** Texto exatamente como apareceu no documento (para auditoria/revisão humana). */
  matchedText: string;
  /** Posição (índice de caractere) onde o match começou, para ordenar por ordem de aparição. */
  offset: number;
  valid: boolean;
  invalidReason?: "capitulo_fora_do_intervalo" | "versiculo_menor_que_um" | "intervalo_de_versiculos_invertido" | "versiculo_acima_do_maximo_do_capitulo";
}

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
    variants.add(lower.replace(/\s+/g, ""));
  }
  return [...variants];
}

// Mesma construção de `referenceParser.ts` (accent-sensitive, mais longo
// primeiro para não deixar um alias curto "roubar" o começo de um mais
// longo, ex.: "1 Sm" antes de teria que perder para nada mais específico
// aqui, mas a ordem por tamanho evita esse tipo de problema em geral).
const ALIASES: AliasEntry[] = books
  .flatMap((book) => bookAliases(book).map((alias) => ({ alias, book })))
  .sort((a, b) => b.alias.length - a.alias.length);

/** Remove diacríticos SEM alterar o comprimento da string (mantém 1 caractere = 1 posição, ao contrário de `normalizeText`, que colapsa espaços). */
function stripDiacriticsPreservingOffsets(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// Segunda passagem: só nomes COMPLETOS de livro (nunca abreviações),
// insensível a acento. Livros cujo nome normalizado colide com o de
// outro (nenhum caso real neste cânon, mas verificado defensivamente)
// ficam de fora — ambiguidade nunca resolvida por suposição.
const NORMALIZED_FULL_NAME_MAP = new Map<string, Book[]>();
for (const book of books) {
  const key = stripDiacriticsPreservingOffsets(book.nome.toLowerCase());
  const existing = NORMALIZED_FULL_NAME_MAP.get(key);
  if (existing) existing.push(book);
  else NORMALIZED_FULL_NAME_MAP.set(key, [book]);
}
const NORMALIZED_FULL_NAME_ALIASES: AliasEntry[] = [...NORMALIZED_FULL_NAME_MAP.entries()]
  .filter(([, candidates]) => candidates.length === 1)
  .map(([alias, candidates]) => ({ alias, book: candidates[0] }))
  .sort((a, b) => b.alias.length - a.alias.length);

function isBoundary(char: string | undefined): boolean {
  return char === undefined || /[\s.:,;\-–()"'“”]/.test(char);
}

// Depois do nome do livro: capítulo, opcionalmente seguido de ":"/"." e
// uma "especificação de versículo" — um único número, uma lista
// separada por vírgula ("51,54,55,57") ou um intervalo ("18-19"/"18–19").
// Não suporta misturar lista e intervalo no mesmo match (ex.: "51,54-57")
// — não observado nos casos documentados do piloto; um texto assim
// simplesmente não teria essa referência reconhecida além do primeiro
// número, o que é seguro (nunca inventa um intervalo maior do que o
// texto realmente diz).
const CHAPTER_VERSE_REGEX = /^[\s]*(\d{1,3})(?:[.:]\s*([\d][\d,\s\-–]*\d|\d))?/;

function parseVerseSpec(spec: string): Array<{ versiculoInicio: number; versiculoFim?: number }> {
  const trimmed = spec.trim();
  if (/[-–]/.test(trimmed)) {
    const [startRaw, endRaw] = trimmed.split(/\s*[-–]\s*/);
    const start = Number(startRaw);
    const end = endRaw !== undefined ? Number(endRaw) : undefined;
    if (!Number.isFinite(start)) return [];
    return [{ versiculoInicio: start, versiculoFim: end !== undefined && Number.isFinite(end) ? end : undefined }];
  }
  if (trimmed.includes(",")) {
    return trimmed
      .split(",")
      .map((part) => Number(part.trim()))
      .filter((n) => Number.isFinite(n))
      .map((n) => ({ versiculoInicio: n, versiculoFim: undefined }));
  }
  const single = Number(trimmed);
  return Number.isFinite(single) ? [{ versiculoInicio: single, versiculoFim: undefined }] : [];
}

function validateChapterVerse(
  book: Book,
  capitulo: number,
  versiculoInicio: number | undefined,
  versiculoFim: number | undefined,
): DetectedReference["invalidReason"] | undefined {
  if (!Number.isInteger(capitulo) || capitulo < 1 || capitulo > book.totalCapitulos) {
    return "capitulo_fora_do_intervalo";
  }
  if (versiculoInicio === undefined) return undefined;
  if (versiculoInicio < 1) return "versiculo_menor_que_um";
  if (versiculoFim !== undefined && versiculoFim < versiculoInicio) return "intervalo_de_versiculos_invertido";
  const maxVerse = getMaxVerse(book.slug, capitulo);
  if (maxVerse !== undefined && (versiculoInicio > maxVerse || (versiculoFim ?? versiculoInicio) > maxVerse)) {
    return "versiculo_acima_do_maximo_do_capitulo";
  }
  return undefined;
}

/**
 * Varre `haystack` (já em minúsculas, mesmo comprimento/offsets de
 * `text`) usando `aliasList`, empurrando resultados em `results` e
 * marcando as posições ocupadas em `occupied` (para a segunda passagem
 * nunca re-matchar — nem duplicar — o que a primeira já encontrou).
 */
function scanWithAliases(text: string, haystack: string, aliasList: AliasEntry[], results: DetectedReference[], occupied: Array<[number, number]>): void {
  for (const { alias, book } of aliasList) {
    let searchFrom = 0;
    while (searchFrom <= haystack.length) {
      const idx = haystack.indexOf(alias, searchFrom);
      if (idx === -1) break;
      searchFrom = idx + alias.length;

      if (occupied.some(([start, end]) => idx < end && idx + alias.length > start)) continue;

      const before = idx > 0 ? haystack[idx - 1] : undefined;
      const after = haystack[idx + alias.length];
      if (!isBoundary(before) || !isBoundary(after)) continue;

      const rest = text.slice(idx + alias.length);
      const match = rest.match(CHAPTER_VERSE_REGEX);
      if (!match) continue; // livro sozinho, sem capítulo — não é referência suficiente para ingestão

      const capitulo = Number(match[1]);
      const matchedText = text.slice(idx, idx + alias.length) + match[0];
      const fullSpan = matchedText.length;
      occupied.push([idx, idx + fullSpan]);
      const verseSpecRaw = match[2];

      if (verseSpecRaw === undefined) {
        // "livro capítulo" sem versículo — ex.: "Lucas 15". Válido como
        // referência de capítulo inteiro; não gera múltiplas linhas.
        const invalidReason = validateChapterVerse(book, capitulo, undefined, undefined);
        results.push({ book, capitulo, matchedText, offset: idx, valid: !invalidReason, invalidReason });
        continue;
      }

      const verses = parseVerseSpec(verseSpecRaw);
      if (verses.length === 0) continue;
      for (const { versiculoInicio, versiculoFim } of verses) {
        const invalidReason = validateChapterVerse(book, capitulo, versiculoInicio, versiculoFim);
        results.push({
          book,
          capitulo,
          versiculoInicio,
          versiculoFim,
          matchedText,
          offset: idx,
          valid: !invalidReason,
          invalidReason,
        });
      }
    }
  }
}

/** Varre `text` inteiro e devolve toda referência bíblica reconhecida, válida ou não. */
export function scanReferences(text: string): DetectedReference[] {
  const results: DetectedReference[] = [];
  const occupied: Array<[number, number]> = [];

  // Passagem 1: todos os aliases (nomes + abreviações) sensíveis a acento.
  scanWithAliases(text, text.toLowerCase(), ALIASES, results, occupied);
  // Passagem 2: só nomes completos, insensível a acento — cobre o que a
  // passagem 1 perdeu por falta de acento no documento original (ex.:
  // "Galatas" em vez de "Gálatas"), sem reabrir o risco de falso
  // positivo de abreviações curtas ambíguas.
  scanWithAliases(text, stripDiacriticsPreservingOffsets(text).toLowerCase(), NORMALIZED_FULL_NAME_ALIASES, results, occupied);

  return results.sort((a, b) => a.offset - b.offset);
}

export interface ClassifiedReference extends DetectedReference {
  tipoRelacao: TipoRelacaoPassagem;
  prioridade: number;
}

/**
 * Classifica as referências VÁLIDAS de um documento em MAIN/SECONDARY —
 * a primeira em ordem de aparição no texto vira `principal`, todas as
 * demais viram `secundaria`. Nunca atribui `citada` automaticamente:
 * distinguir uma passagem central de uma menção passageira exige leitura
 * humana (ver o estudo "Fé que atravessa as Escrituras", Marco 1.1, onde
 * João 3 é `citada` por ser só um aceno, sem versículo específico) — algo
 * que um scanner determinístico de texto não pode inferir com segurança
 * sem depender de IA (CLAUDE.md §3: a aplicação não depende de IA para
 * funcionar). Referências inválidas nunca entram na classificação — elas
 * ficam disponíveis em `scanReferences` para alertar a revisão humana,
 * mas não geram uma linha de `study_passages`.
 */
export function classifyReferences(detected: DetectedReference[]): ClassifiedReference[] {
  const valid = detected.filter((ref) => ref.valid);
  return valid.map((ref, index) => ({
    ...ref,
    tipoRelacao: index === 0 ? "principal" : "secundaria",
    prioridade: index + 1,
  }));
}
