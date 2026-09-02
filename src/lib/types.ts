/**
 * Modelo de domínio da Biblioteca Virtual de Estudos Bíblicos.
 *
 * Estas interfaces espelham as entidades descritas em `docs/DATA_MODEL.md`.
 * Nesta fase (Marco 1 — protótipo visual) os dados são mockados em memória
 * (ver `src/lib/data`), mas o formato já foi desenhado para mapear 1:1 com
 * as futuras tabelas do Supabase/PostgreSQL, permitindo trocar a camada de
 * persistência sem alterar UI, busca ou o restante da aplicação.
 *
 * Convenções:
 * - Nomes de campos em português, como no documento de origem.
 * - IDs são strings (compatíveis com uuid do Postgres).
 * - Datas são strings ISO 8601.
 */

export type TestamentoBiblico = "AT" | "NT";

export type StatusEditorial = "DRAFT" | "REVIEW" | "PUBLISHED" | "ARCHIVED";

/** Um livro da Bíblia (entidade `books`). */
export interface Book {
  id: string;
  nome: string;
  abreviacao: string;
  /** Identificador amigável para URLs, ex.: "joao", "1-samuel". Não faz parte do DATA_MODEL original; adicionado para roteamento. */
  slug: string;
  testamento: TestamentoBiblico;
  /** Posição no cânon (1 = Gênesis, 66 = Apocalipse). */
  ordemCanonica: number;
  /** Quantidade de capítulos do livro, usada para gerar a navegação. */
  totalCapitulos: number;
}

/** Uma passagem bíblica (entidade `passages`). */
export interface Passage {
  id: string;
  bookId: string;
  capitulo: number;
  versiculoInicio?: number;
  versiculoFim?: number;
  /** Referência normalizada, ex.: "João 3:16" ou "Lucas 22:47-52". */
  referenciaNormalizada: string;
}

/** Tipo de relação entre um estudo e uma passagem (`study_passages.tipo_relacao`). */
export type TipoRelacaoPassagem = "principal" | "secundaria" | "citada";

/** Vínculo estudo↔passagem (entidade `study_passages`). */
export interface StudyPassage {
  studyId: string;
  passageId: string;
  tipoRelacao: TipoRelacaoPassagem;
  prioridade: number;
}

/** Um tema (entidade `topics`). */
export interface Topic {
  id: string;
  nome: string;
  slug: string;
  descricao: string;
}

/** Vínculo estudo↔tema (entidade `study_topics`). */
export interface StudyTopic {
  studyId: string;
  topicId: string;
  /** Peso do tema para este estudo (usado no ranking de busca). */
  peso: number;
}

/** Um personagem bíblico (entidade `characters`). */
export interface Character {
  id: string;
  nome: string;
  slug: string;
  descricao: string;
}

/** Vínculo estudo↔personagem (entidade `study_characters`). */
export interface StudyCharacter {
  studyId: string;
  characterId: string;
  /** Papel do personagem no estudo, ex.: "protagonista", "mencionado". */
  papel: string;
}

/** Uma série de estudos (entidade `series`). */
export interface Series {
  id: string;
  nome: string;
  slug: string;
  descricao: string;
}

/** Vínculo estudo↔série (entidade `study_series`). */
export interface StudySeries {
  studyId: string;
  seriesId: string;
  /** Posição do estudo dentro da série. */
  ordem: number;
}

/** Origem de um estudo no Google Drive (entidade `files`). Não usado ainda no MVP mockado. */
export interface StudyFile {
  id: string;
  studyId: string;
  driveFileId: string;
  nome: string;
  mimeType: string;
  urlOrigem: string;
  hash: string;
  versao: number;
}

/**
 * Trecho de um estudo preparado para indexação semântica futura
 * (entidade `chunks`). Definido para compatibilidade de esquema; não é
 * populado nem consumido nesta fase.
 */
export interface StudyChunk {
  id: string;
  studyId: string;
  ordem: number;
  texto: string;
  referenciaContextual?: string;
}

/**
 * Vetor de embedding de um chunk (entidade `embeddings`). Definido para
 * compatibilidade de esquema; pgvector ainda não está operacional.
 */
export interface ChunkEmbedding {
  id: string;
  chunkId: string;
  modelo: string;
  vetor: number[];
  versao: number;
}

/** Status de um job de ingestão (entidade `ingestion_jobs`). Reservado para Fase 9/10. */
export type IngestionStatus = "pending" | "processing" | "failed" | "done";

export interface IngestionJob {
  id: string;
  driveFileId: string;
  status: IngestionStatus;
  etapa: string;
  erro?: string;
  tentativa: number;
}

/**
 * Um estudo do acervo (entidade `studies`), já com as relações resolvidas
 * (passagens, temas, personagens, séries) para consumo direto pela UI e
 * pela busca local. A camada de repositório é responsável por montar este
 * formato a partir das tabelas relacionais (hoje: mock; futuramente: Supabase).
 */
export interface Study {
  id: string;
  titulo: string;
  slug: string;
  resumo: string;
  conteudo: string;
  status: StatusEditorial;
  visibilidade: "publico" | "privado";
  autor: string;
  /** Data de origem do estudo (ISO 8601), ex.: data do documento original. */
  dataOrigem: string;
  createdAt: string;
  updatedAt: string;
  /** Palavras-chave livres para reforçar a busca lexical. */
  palavrasChave: string[];
  passagens: Array<{
    passage: Passage;
    book: Book;
    tipoRelacao: TipoRelacaoPassagem;
    prioridade: number;
  }>;
  temas: Array<{ topic: Topic; peso: number }>;
  personagens: Array<{ character: Character; papel: string }>;
  series: Array<{ series: Series; ordem: number }>;
}
