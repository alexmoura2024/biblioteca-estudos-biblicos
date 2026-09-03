import type {
  Book,
  Character,
  Series,
  Study,
  StudySummary,
  Topic,
} from "@/lib/types";
import type {
  BookRow,
  CharacterRow,
  PassageRow,
  SeriesRow,
  StudyCharacterJoinRow,
  StudyPassageJoinRow,
  StudyRow,
  StudySeriesJoinRow,
  StudyTopicJoinRow,
  TipoRelacaoRow,
  TopicRow,
} from "@/lib/repositories/supabase/rows";

/**
 * Tradução linha-do-Postgres -> modelo de domínio. Nenhuma função aqui
 * faz I/O — são todas puras, o que as torna testáveis sem mockar o
 * cliente Supabase (ver mappers.test.ts).
 */

export function mapBookRow(row: BookRow): Book {
  return {
    id: row.id,
    nome: row.nome,
    abreviacao: row.abreviacao,
    slug: row.slug,
    testamento: row.testamento,
    ordemCanonica: row.ordem_canonica,
    totalCapitulos: row.total_capitulos,
  };
}

export function mapTopicRow(row: TopicRow): Topic {
  return { id: row.id, nome: row.nome, slug: row.slug, descricao: row.descricao };
}

export function mapCharacterRow(row: CharacterRow): Character {
  return { id: row.id, nome: row.nome, slug: row.slug, descricao: row.descricao };
}

export function mapSeriesRow(row: SeriesRow): Series {
  return { id: row.id, nome: row.nome, slug: row.slug, descricao: row.descricao };
}

/** MAIN/SECONDARY/CITED (schema Fase 2) -> principal/secundaria/citada (domínio, TipoRelacaoPassagem). */
const TIPO_RELACAO_FROM_DB: Record<TipoRelacaoRow, "principal" | "secundaria" | "citada"> = {
  MAIN: "principal",
  SECONDARY: "secundaria",
  CITED: "citada",
};

export function mapTipoRelacao(row: TipoRelacaoRow): "principal" | "secundaria" | "citada" {
  return TIPO_RELACAO_FROM_DB[row];
}

export function mapPassageRow(row: PassageRow): {
  id: string;
  bookId: string;
  capitulo: number;
  versiculoInicio?: number;
  versiculoFim?: number;
  referenciaNormalizada: string;
} {
  return {
    id: row.id,
    bookId: row.book_id,
    capitulo: row.capitulo,
    versiculoInicio: row.versiculo_inicio ?? undefined,
    versiculoFim: row.versiculo_fim ?? undefined,
    referenciaNormalizada: row.referencia_normalizada,
  };
}

/**
 * Monta um `Study` completo a partir da linha de `studies` mais as
 * linhas já buscadas das quatro tabelas de relacionamento (uma consulta
 * por relação — ver `SupabaseStudyRepository.getPublishedBySlug`).
 */
export function assembleStudy(
  studyRow: StudyRow,
  passageRows: StudyPassageJoinRow[],
  topicRows: StudyTopicJoinRow[],
  characterRows: StudyCharacterJoinRow[],
  seriesRows: StudySeriesJoinRow[],
): Study {
  return {
    id: studyRow.id,
    titulo: studyRow.titulo,
    slug: studyRow.slug,
    resumo: studyRow.resumo,
    conteudo: studyRow.conteudo,
    status: studyRow.status,
    visibilidade: studyRow.visibilidade,
    autor: studyRow.autor,
    dataOrigem: studyRow.data_origem,
    createdAt: studyRow.created_at,
    updatedAt: studyRow.updated_at,
    palavrasChave: studyRow.palavras_chave ?? [],
    passagens: passageRows
      .filter((r): r is StudyPassageJoinRow & { passages: NonNullable<StudyPassageJoinRow["passages"]> } => r.passages !== null)
      .map((r) => ({
        passage: mapPassageRow(r.passages),
        book: mapBookRow(r.passages.books),
        tipoRelacao: mapTipoRelacao(r.tipo_relacao),
        prioridade: r.prioridade,
      })),
    temas: topicRows
      .filter((r): r is StudyTopicJoinRow & { topics: NonNullable<StudyTopicJoinRow["topics"]> } => r.topics !== null)
      .map((r) => ({ topic: mapTopicRow(r.topics), peso: r.peso })),
    personagens: characterRows
      .filter((r): r is StudyCharacterJoinRow & { characters: NonNullable<StudyCharacterJoinRow["characters"]> } => r.characters !== null)
      .map((r) => ({ character: mapCharacterRow(r.characters), papel: r.papel })),
    series: seriesRows
      .filter((r): r is StudySeriesJoinRow & { series: NonNullable<StudySeriesJoinRow["series"]> } => r.series !== null)
      .map((r) => ({ series: mapSeriesRow(r.series), ordem: r.ordem })),
  };
}

/**
 * Monta um `StudySummary` (Marco 1.2 — DEC-017) a partir da linha de
 * `studies` mais as passagens/temas/séries já buscadas para o conjunto
 * de estudos sendo resumido (ver `buildSummaries` em
 * `src/lib/repositories/supabase/studies.ts`). Personagens e o array
 * completo de passagens não fazem parte do resumo — só a referência
 * principal (MAIN, ou a primeira passagem se nenhuma for MAIN).
 */
export function assembleStudySummary(
  studyRow: StudyRow,
  passageRows: StudyPassageJoinRow[],
  topicRows: StudyTopicJoinRow[],
  seriesRows: StudySeriesJoinRow[],
): StudySummary {
  const withPassage = passageRows.filter(
    (r): r is StudyPassageJoinRow & { passages: NonNullable<StudyPassageJoinRow["passages"]> } => r.passages !== null,
  );
  const principal = withPassage.find((r) => r.tipo_relacao === "MAIN") ?? withPassage[0];

  return {
    id: studyRow.id,
    slug: studyRow.slug,
    titulo: studyRow.titulo,
    resumo: studyRow.resumo,
    autor: studyRow.autor,
    dataOrigem: studyRow.data_origem,
    referenciaPrincipal: principal
      ? {
          referenciaNormalizada: principal.passages.referencia_normalizada,
          bookSlug: principal.passages.books.slug,
          capitulo: principal.passages.capitulo,
        }
      : undefined,
    temas: topicRows
      .filter((r): r is StudyTopicJoinRow & { topics: NonNullable<StudyTopicJoinRow["topics"]> } => r.topics !== null)
      .map((r) => ({ topic: mapTopicRow(r.topics), peso: r.peso })),
    series: seriesRows
      .filter((r): r is StudySeriesJoinRow & { series: NonNullable<StudySeriesJoinRow["series"]> } => r.series !== null)
      .map((r) => ({ series: mapSeriesRow(r.series), ordem: r.ordem })),
  };
}
