import type { StatusEditorial, TestamentoBiblico } from "@/lib/types";

/**
 * Formas das linhas devolvidas pelo Postgres (colunas em snake_case,
 * como o schema em supabase/migrations/) — espelham exatamente as
 * tabelas criadas em 20260903011809_schema_core.sql. Nunca expostas
 * fora de `src/lib/repositories/supabase/`; os mappers em `mappers.ts`
 * traduzem para o modelo de domínio (`src/lib/types.ts`) antes de
 * qualquer coisa sair deste diretório.
 */

export interface BookRow {
  id: string;
  nome: string;
  abreviacao: string;
  slug: string;
  testamento: TestamentoBiblico;
  ordem_canonica: number;
  total_capitulos: number;
}

export interface TopicRow {
  id: string;
  nome: string;
  slug: string;
  descricao: string;
}

export interface CharacterRow {
  id: string;
  nome: string;
  slug: string;
  descricao: string;
}

export interface SeriesRow {
  id: string;
  nome: string;
  slug: string;
  descricao: string;
}

export interface PassageRow {
  id: string;
  book_id: string;
  capitulo: number;
  versiculo_inicio: number | null;
  versiculo_fim: number | null;
  referencia_normalizada: string;
}

/** DB usa MAIN/SECONDARY/CITED (schema da Fase 2); o domínio usa principal/secundaria/citada — ver mappers.ts. */
export type TipoRelacaoRow = "MAIN" | "SECONDARY" | "CITED";

export interface StudyRow {
  id: string;
  titulo: string;
  slug: string;
  resumo: string;
  conteudo: string;
  status: StatusEditorial;
  visibilidade: "publico" | "privado";
  autor: string;
  data_origem: string;
  palavras_chave: string[] | null;
  created_at: string;
  updated_at: string;
}

/** Linha de public.study_passages com a passagem e o livro já embutidos (join). */
export interface StudyPassageJoinRow {
  study_id: string;
  tipo_relacao: TipoRelacaoRow;
  prioridade: number;
  passages: (PassageRow & { books: BookRow }) | null;
}

/** Linha de public.study_topics com o tema já embutido. */
export interface StudyTopicJoinRow {
  study_id: string;
  peso: number;
  topics: TopicRow | null;
}

/** Linha de public.study_characters com o personagem já embutido. */
export interface StudyCharacterJoinRow {
  study_id: string;
  papel: string;
  characters: CharacterRow | null;
}

/** Linha de public.study_series com a série já embutida. */
export interface StudySeriesJoinRow {
  study_id: string;
  ordem: number;
  series: SeriesRow | null;
}

/** Linha das views de contagem (topic_study_counts/character_study_counts/series_study_counts). */
export interface CountRow {
  total: number;
}
