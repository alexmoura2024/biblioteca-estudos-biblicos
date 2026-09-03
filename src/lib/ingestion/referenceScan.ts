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
    // Espaçamento razoável entre o prefixo ordinal e o resto (achado real,
    // checkpoint 14): a abreviação canônica de "1 Coríntios" é "1Co" (sem
    // espaço), mas convenção editorial comum escreve "1 Co" — sem esta
    // variante, só a forma colada seria reconhecida. Não afeta nomes
    // completos (já têm espaço em `book.nome`; o match extra é redundante
    // e descartado pelo Set).
    const digitSpaced = lower.match(/^([123])\s*(.+)$/);
    if (digitSpaced) {
      variants.add(`${digitSpaced[1]} ${digitSpaced[2]}`);
      variants.add(`${digitSpaced[1]}${digitSpaced[2]}`);
    }
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

/**
 * Terceira passagem (checkpoint 14 — Fase 3.1, achado real ao rodar o
 * piloto completo): convenção tradicional de citação bíblica em
 * português, comum em material editorial mais antigo do acervo (ex.:
 * "Ex. 15:17", "II Sam. 24:18", "Gên. 1:1") — abreviação DIFERENTE de
 * `book.abreviacao` (que é a forma curta usada internamente pelo
 * projeto, ex.: "Êx", "2Sm"), sempre com um sufixo "." na prática, e
 * frequentemente com o número do livro por extenso ("I"/"II"/"III") em
 * vez de dígito. Fonte: convenção tradicional comum a edições impressas
 * em português (ARC/ARA) — abreviação por corte do nome, não um dado
 * bíblico em si (mesma natureza de `book.abreviacao`, nunca texto
 * bíblico).
 *
 * Construída sistematicamente para os 66 livros (auditados a partir de
 * `books.ts`), não só para os exemplos que motivaram o achado — a
 * maioria fica de propósito com um array VAZIO porque a forma
 * tradicional já coincide com `abreviacao` (sensível a acento, já
 * coberta pela Passagem 1) ou com o nome completo (já coberto pela
 * Passagem 2). Só entram aqui livros cuja abreviação tradicional é uma
 * palavra DIFERENTE das duas já cobertas.
 *
 * Duas salvaguardas deliberadas contra falso positivo:
 * 1. Nunca inclui um stem que seja também uma palavra comum do
 *    português capaz de aparecer sozinha seguida de um número por
 *    coincidência ("mal", "cor", "amo", "tia" foram excluídos por
 *    esse motivo — nenhum é abreviação tradicional indispensável, a
 *    passagem 2 já cobre o nome completo desses livros).
 * 2. O stem de "João" ("jo") só é usado nas variantes com PREFIXO
 *    ORDINAL (1/2/3 João — as epístolas) — nunca sozinho, porque
 *    colidiria com "Jó" ao ficar insensível a acento (a mesma
 *    ambiguidade que a Passagem 1 evita com sensibilidade a acento).
 *    Como "Jó" nunca tem prefixo ordinal, essa restrição elimina o
 *    risco por completo sem custar cobertura real.
 */
const TRADITIONAL_STEMS_BY_BASE_NAME: Record<string, string[]> = {
  genesis: ["gen"],
  exodo: ["ex"],
  levitico: ["lev"],
  numeros: ["num"],
  deuteronomio: ["deut"],
  josue: ["jos"],
  juizes: ["jui"],
  rute: [],
  samuel: ["sam"],
  reis: ["reis"],
  cronicas: ["cron"],
  esdras: ["esd"],
  neemias: ["neem"],
  ester: ["est"],
  jo: [], // Jó — nunca ganha stem insensível a acento (ver salvaguarda 2 acima)
  salmos: ["sal"],
  proverbios: ["prov"],
  eclesiastes: ["ecl"],
  "canticos dos canticos": ["cant"],
  isaias: ["isa"],
  jeremias: ["jer"],
  lamentacoes: ["lam"],
  ezequiel: ["eze"],
  daniel: ["dan"],
  oseias: ["ose"],
  joel: [],
  amos: [], // "amo" excluído — palavra comum ("eu amo")
  obadias: ["obad"],
  jonas: ["jon"],
  miqueias: ["miq"],
  naum: [],
  habacuque: ["hab"],
  sofonias: ["sof"],
  ageu: [],
  zacarias: ["zac"],
  malaquias: [], // "mal" excluído — palavra comum ("mal chegou")
  mateus: ["mat"],
  marcos: ["marc"],
  lucas: ["luc"],
  joao: ["jo"], // só usado com prefixo ordinal — ver salvaguarda 2 acima
  atos: [],
  romanos: ["rom"],
  corintios: ["cor"], // sempre com prefixo ordinal (1/2) — risco de "cor" isolado não se aplica
  galatas: ["gal"],
  efesios: ["efe"],
  filipenses: ["fil"],
  colossenses: ["col"],
  tessalonicenses: ["tes"], // sempre com prefixo ordinal
  timoteo: ["tim"], // sempre com prefixo ordinal
  tito: [],
  filemom: ["file"],
  hebreus: ["heb"],
  tiago: [], // "tia" excluído — palavra comum ("minha tia")
  pedro: ["ped"], // sempre com prefixo ordinal
  judas: ["jud"],
  apocalipse: ["apoc"],
};

const ROMAN_BY_DIGIT: Record<string, string> = { "1": "i", "2": "ii", "3": "iii" };

/** Nome-base sem o prefixo ordinal ("1 Samuel" -> "Samuel"; "Gênesis" -> "Gênesis"). */
function baseNameOf(book: Book): string {
  return book.nome.replace(/^[123]\s+/, "");
}

/** Dígito do prefixo ordinal do livro, se houver ("1 Samuel" -> "1"). */
function ordinalDigitOf(book: Book): string | undefined {
  return book.nome.match(/^([123])\s+/)?.[1];
}

function traditionalAliasKey(book: Book): string {
  return stripDiacriticsPreservingOffsets(baseNameOf(book).toLowerCase());
}

// Gera as variantes de alias tradicional por livro: com/sem espaço entre
// o prefixo ordinal (arábico OU romano) e o stem, quando o livro tem um
// prefixo — nunca gera a forma sem prefixo para "joão" (salvaguarda 2).
const TRADITIONAL_ALIASES: AliasEntry[] = books.flatMap((book) => {
  const key = traditionalAliasKey(book);
  const stems = TRADITIONAL_STEMS_BY_BASE_NAME[key] ?? [];
  if (stems.length === 0) return [];

  const ordinal = ordinalDigitOf(book);
  if (!ordinal) {
    if (key === "joao") return []; // só com prefixo ordinal — ver salvaguarda 2
    return stems.map((stem) => ({ alias: stem, book }));
  }

  const roman = ROMAN_BY_DIGIT[ordinal];
  return stems.flatMap((stem) => [
    { alias: `${ordinal} ${stem}`, book },
    { alias: `${ordinal}${stem}`, book },
    { alias: `${roman} ${stem}`, book },
    { alias: `${roman}${stem}`, book },
  ]);
}).sort((a, b) => b.alias.length - a.alias.length);

function isBoundary(char: string | undefined): boolean {
  return char === undefined || /[\s.:,;\-–()"'“”]/.test(char);
}

// Depois do nome do livro (ou abreviação): capítulo, opcionalmente
// seguido de ":"/"." e uma "especificação de versículo" — um único
// número, uma lista separada por vírgula ("51,54,55,57") ou um
// intervalo ("18-19"/"18–19"). Não suporta misturar lista e intervalo
// no mesmo match (ex.: "51,54-57") — não observado nos casos
// documentados do piloto; um texto assim simplesmente não teria essa
// referência reconhecida além do primeiro número, o que é seguro
// (nunca inventa um intervalo maior do que o texto realmente diz).
// `[\s.]*` (não só `[\s]*`) aceita o ponto de abreviação tradicional
// entre o alias e o capítulo — "Ex. 15:17", "Gên. 1:1" — sem precisar
// de nenhuma lógica extra em `isBoundary`/`scanWithAliases` (achado
// real ao ampliar a cobertura de abreviações tradicionais, checkpoint
// 14): o ponto já era um caractere de fronteira válido depois do
// alias, só faltava o regex do capítulo também aceitá-lo antes do
// primeiro dígito.
const CHAPTER_VERSE_REGEX = /^[\s.]*(\d{1,3})(?:[.:]\s*([\d][\d,\s\-–]*\d|\d))?/;

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

interface TaggedAliasEntry extends AliasEntry {
  /** `true` = precisa bater o acento exatamente (Passagem 1); `false` = usa o haystack já sem diacríticos (Passagens 2/3). */
  sensitive: boolean;
}

/**
 * As 3 passagens combinadas numa única lista, ordenada por COMPRIMENTO de
 * alias (maior primeiro), não mais por passagem separada — achado real ao
 * ampliar a cobertura de abreviações tradicionais (checkpoint 14): rodar
 * cada passagem isoladamente, na ordem 1→2→3, deixava a Passagem 1 (mais
 * curta, ex.: "Jo" = João) roubar o início de um alias tradicional mais
 * longo e mais específico da Passagem 3 (ex.: "III Jo." = 3 João) só por
 * ter sido processada primeiro. Combinar tudo numa lista única, ordenada
 * globalmente do alias mais longo para o mais curto (`Array.prototype.sort`
 * é estável — em empate de comprimento, a ordem original entre passagens
 * é preservada), garante que o alias mais específico sempre tem
 * prioridade sobre um mais genérico que o contenha como substring, não
 * importa de qual passagem cada um veio. Cada entrada carrega `sensitive`
 * para indicar contra qual haystack (com ou sem diacríticos) ela deve ser
 * comparada — `scanReferences` calcula os dois haystacks uma única vez.
 */
const COMBINED_ALIASES: TaggedAliasEntry[] = [
  ...ALIASES.map((a) => ({ ...a, sensitive: true })),
  ...NORMALIZED_FULL_NAME_ALIASES.map((a) => ({ ...a, sensitive: false })),
  ...TRADITIONAL_ALIASES.map((a) => ({ ...a, sensitive: false })),
].sort((a, b) => b.alias.length - a.alias.length);

/**
 * Varre o texto usando `aliasList` (já combinada e ordenada por
 * comprimento — ver `COMBINED_ALIASES`), escolhendo por entrada o
 * haystack sensível ou insensível a acento, empurrando resultados em
 * `results` e marcando as posições ocupadas em `occupied` (para um alias
 * mais curto nunca re-matchar — nem duplicar — o que um mais longo e
 * mais específico já encontrou na mesma posição).
 */
function scanWithAliases(
  text: string,
  sensitiveHaystack: string,
  insensitiveHaystack: string,
  aliasList: TaggedAliasEntry[],
  results: DetectedReference[],
  occupied: Array<[number, number]>,
): void {
  for (const { alias, book, sensitive } of aliasList) {
    const haystack = sensitive ? sensitiveHaystack : insensitiveHaystack;
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

/**
 * Varre `text` inteiro e devolve toda referência bíblica reconhecida,
 * válida ou não. Reconhece, numa única varredura combinada por
 * especificidade (alias mais longo primeiro — ver `COMBINED_ALIASES`):
 * nomes/abreviações canônicas sensíveis a acento, nomes completos sem
 * acento, e abreviações tradicionais (ponto, numeral romano — DEC-038).
 */
export function scanReferences(text: string): DetectedReference[] {
  const results: DetectedReference[] = [];
  const occupied: Array<[number, number]> = [];

  const sensitiveHaystack = text.toLowerCase();
  const insensitiveHaystack = stripDiacriticsPreservingOffsets(text).toLowerCase();
  scanWithAliases(text, sensitiveHaystack, insensitiveHaystack, COMBINED_ALIASES, results, occupied);

  return results.sort((a, b) => a.offset - b.offset);
}

export interface ClassifiedReference extends DetectedReference {
  tipoRelacao: TipoRelacaoPassagem;
  prioridade: number;
}

/**
 * Marcadores editoriais explícitos que costumam introduzir a referência
 * principal de um estudo real ("TEXTO: João 14:5", "Texto-base: ...",
 * "Leitura principal: ..."). Detectados só quando seguidos de ":" — sem
 * isso, "texto" sozinho é comum demais no português para servir de sinal
 * (ver `selectMainReference`, Prioridade A).
 */
const EXPLICIT_MARKER_REGEX = /\b(texto[-\s]?base|texto\s*áureo|leitura\s*principal|leitura|texto)\s*:\s*/gi;
/** Distância máxima (em caracteres) entre o fim do marcador e o início da referência para contar como "logo depois". */
const MARKER_PROXIMITY_WINDOW = 40;

export type MainSelectionReason = "explicit_marker" | "title_confirmed" | "predominant" | "fallback_first" | "ambiguous";

export interface MainSelectionResult {
  main?: DetectedReference;
  reason: MainSelectionReason;
}

function findExplicitMarkerReference(text: string, valid: DetectedReference[]): DetectedReference | undefined {
  for (const marker of text.matchAll(EXPLICIT_MARKER_REGEX)) {
    const markerEnd = (marker.index ?? 0) + marker[0].length;
    const candidate = valid.find((ref) => ref.offset >= markerEnd && ref.offset <= markerEnd + MARKER_PROXIMITY_WINDOW);
    if (candidate) return candidate;
  }
  return undefined;
}

function findTitleConfirmedReference(preliminaryReference: string | undefined, valid: DetectedReference[]): DetectedReference | undefined {
  if (!preliminaryReference) return undefined;
  const parsed = scanReferences(preliminaryReference).find((r) => r.valid);
  if (!parsed) return undefined;
  return valid.find((ref) => ref.book.slug === parsed.book.slug && ref.capitulo === parsed.capitulo);
}

/**
 * Referência predominante: agrupa por (livro, capítulo) e pega o grupo
 * com mais ocorrências; empate é desfeito pelo total de ocorrências do
 * LIVRO inteiro (soma de todos os seus grupos de capítulo) — cobre o
 * caso real "Louvor na prisão" (SEL-022, checkpoint 14): cinco citações
 * de Atos espalhadas por capítulos DIFERENTES (8, 22, 24, 26, 28, uma
 * cada) batem uma citação isolada de Gênesis 39 só pelo total do livro,
 * mesmo sem nenhum capítulo se repetir sozinho. Devolve `undefined`
 * quando nem o agrupamento por capítulo nem o total por livro
 * desempatam — ambiguidade real, nunca resolvida por suposição.
 */
function findPredominantReference(valid: DetectedReference[]): DetectedReference | undefined {
  const byChapterKey = new Map<string, DetectedReference[]>();
  for (const ref of valid) {
    const key = `${ref.book.slug}:${ref.capitulo}`;
    const group = byChapterKey.get(key);
    if (group) group.push(ref);
    else byChapterKey.set(key, [ref]);
  }
  const groups = [...byChapterKey.values()];
  const maxChapterCount = Math.max(...groups.map((g) => g.length));
  const topChapterGroups = groups.filter((g) => g.length === maxChapterCount);
  if (topChapterGroups.length === 1) return topChapterGroups[0][0];

  const byBookCount = new Map<string, number>();
  for (const ref of valid) byBookCount.set(ref.book.slug, (byBookCount.get(ref.book.slug) ?? 0) + 1);
  const maxBookCount = Math.max(...topChapterGroups.map((g) => byBookCount.get(g[0].book.slug) ?? 0));
  const topByBook = topChapterGroups.filter((g) => (byBookCount.get(g[0].book.slug) ?? 0) === maxBookCount);

  const distinctBooks = new Set(topByBook.map((g) => g[0].book.slug));
  if (distinctBooks.size !== 1) return undefined; // empate entre LIVROS diferentes — ambiguidade real, nunca escolhida por suposição.

  // Mesmo livro vencendo em vários grupos de capítulo empatados entre si
  // (ex.: Atos citado uma vez em 5 capítulos diferentes) não é ambiguidade
  // — só falta decidir QUAL ocorrência daquele livro vira o candidato;
  // usa-se a primeira em ordem de aparição no texto.
  return topByBook.map((g) => g[0]).sort((a, b) => a.offset - b.offset)[0];
}

/**
 * Escolhe a referência PRINCIPAL de um documento real, nesta ordem
 * (Fase 3.1, checkpoint 14 — substitui a heurística simples "primeira
 * referência = principal" quando houver evidência melhor, sem virar
 * interpretação teológica nem depender de IA — CLAUDE.md §3):
 *
 * A. Marcador editorial explícito ("TEXTO:", "Texto-base:", "Leitura
 *    principal:") seguido de perto por uma referência reconhecida —
 *    maior confiança possível, o próprio documento está rotulando isso.
 * B. Referência preliminar do manifesto (geralmente do título) quando o
 *    mesmo livro+capítulo também aparece no conteúdo — confirmação
 *    cruzada entre duas fontes independentes.
 * C. Referência predominante por concentração (ver `findPredominantReference`).
 * D. Fallback: primeira referência em ordem de aparição no texto.
 *
 * Quando nem A, B nem C encontram uma resposta clara — duas ou mais
 * referências com evidência semelhante — a Prioridade D ainda escolhe
 * um valor determinístico para preencher `study_passages.tipo_relacao
 * = 'MAIN'` (o schema exige uma só), mas `reason` volta como
 * `"ambiguous"`, e o chamador (`pipeline.ts`) usa isso para nunca
 * esconder a incerteza: gera uma divergência `MAIN_REFERENCE_AMBIGUOUS`
 * para revisão humana em vez de apresentar a escolha como um fato.
 */
export function selectMainReference(valid: DetectedReference[], text: string, preliminaryReference?: string): MainSelectionResult {
  if (valid.length === 0) return { reason: "fallback_first" };

  const explicit = findExplicitMarkerReference(text, valid);
  if (explicit) return { main: explicit, reason: "explicit_marker" };

  const titleConfirmed = findTitleConfirmedReference(preliminaryReference, valid);
  if (titleConfirmed) return { main: titleConfirmed, reason: "title_confirmed" };

  const predominant = findPredominantReference(valid);
  if (predominant) return { main: predominant, reason: "predominant" };

  return { main: valid[0], reason: "ambiguous" };
}

/**
 * Classifica as referências VÁLIDAS de um documento em MAIN/SECONDARY.
 * Sem `mainOverride`, mantém o comportamento histórico (a primeira em
 * ordem de aparição vira `principal`) — usado pelos chamadores que não
 * têm o texto completo/manifesto disponíveis para uma escolha melhor.
 * Com `mainOverride` (produzido por `selectMainReference`), essa
 * referência específica vira `principal`, e todas as outras (na ordem
 * original em que apareceram) viram `secundaria`. Nunca atribui
 * `citada` automaticamente: distinguir uma passagem central de uma
 * menção passageira exige leitura humana (ver o estudo "Fé que
 * atravessa as Escrituras", Marco 1.1, onde João 3 é `citada` por ser
 * só um aceno, sem versículo específico) — algo que um scanner
 * determinístico de texto não pode inferir com segurança sem depender
 * de IA (CLAUDE.md §3). Referências inválidas nunca entram na
 * classificação — elas ficam disponíveis em `scanReferences` para
 * alertar a revisão humana, mas não geram uma linha de `study_passages`.
 */
export function classifyReferences(detected: DetectedReference[], mainOverride?: DetectedReference): ClassifiedReference[] {
  const valid = detected.filter((ref) => ref.valid);
  if (valid.length === 0) return [];

  const main = mainOverride && valid.includes(mainOverride) ? mainOverride : valid[0];
  const rest = valid.filter((ref) => ref !== main);

  return [
    { ...main, tipoRelacao: "principal", prioridade: 1 },
    ...rest.map((ref, index) => ({ ...ref, tipoRelacao: "secundaria" as const, prioridade: index + 2 })),
  ];
}
