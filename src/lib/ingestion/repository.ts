import type { StatusEditorial, TipoRelacaoPassagem } from "@/lib/types";

/**
 * Fronteira entre a pipeline de ingestão (`pipeline.ts`) e a persistência
 * (`files`/`studies`/`study_passages`/`ingestion_jobs`) — mesma filosofia
 * de `src/lib/repositories/types.ts` (CLAUDE.md §3): a orquestração nunca
 * fala com o Supabase diretamente, só com esta interface. Isso permite
 * testar toda a lógica de idempotência/nunca-publica-sozinho com
 * `InMemoryIngestionRepository` (`repository.inMemory.ts`), sem Postgres.
 *
 * Implementação real: `supabaseIngestionRepository.ts`, usando
 * `getSupabaseServiceClient()` (service_role — `files`/`ingestion_jobs`
 * são bloqueadas para `anon` por RLS, ver a migration
 * `..._fase3_provenance_rls.sql`).
 */

export type StatusProcessamentoArquivo = "PENDENTE" | "EXTRAIDO" | "FALHA_EXTRACAO" | "NAO_SUPORTADO" | "PROCESSADO";
export type IngestionStage =
  | "FETCH"
  | "EXTRACT"
  | "NORMALIZE"
  | "REFERENCE_DETECTION"
  | "METADATA_SUGGESTION"
  | "DUPLICATE_CHECK"
  | "UPSERT_STUDY";
export type IngestionJobStatus = "PENDING" | "RUNNING" | "SUCCESS" | "FAILED" | "SKIPPED";

export interface FileRecord {
  id: string;
  driveFileId: string;
  nomeOriginal: string;
  mimeType: string;
  driveUrl: string;
  hashConteudo?: string;
  modifiedTime?: string;
  tamanhoBytes?: number;
  studyId?: string;
  statusProcessamento: StatusProcessamentoArquivo;
}

export interface UpsertFileInput {
  driveFileId: string;
  nomeOriginal: string;
  mimeType: string;
  driveUrl: string;
  modifiedTime?: string;
  tamanhoBytes?: number;
}

export interface UpsertStudyInput {
  titulo: string;
  slug: string;
  resumo: string;
  conteudo: string;
  status: Extract<StatusEditorial, "DRAFT" | "REVIEW">;
  /**
   * `studies.autor`/`studies.data_origem` são NOT NULL no schema (Fase 2)
   * — nunca opcionais aqui de propósito, para que o compilador force
   * todo chamador a decidir um valor. Nunca inventar um autor/data real
   * quando desconhecido: `pipeline.ts` usa sentinelas explícitas
   * ("Autor não identificado", ou a data-marco 1970-01-01 quando nem
   * `modifiedTime` do Drive está disponível) — nunca um valor plausível
   * que poderia passar despercebido na revisão humana (Etapa 7/10).
   */
  autor: string;
  dataOrigem: string;
  palavrasChave: string[];
}

export interface StudyPassageInput {
  bookSlug: string;
  capitulo: number;
  versiculoInicio?: number;
  versiculoFim?: number;
  referenciaNormalizada: string;
  tipoRelacao: TipoRelacaoPassagem;
  prioridade: number;
}

export interface IngestionRepository {
  /** Cria ou atualiza um `files` por `drive_file_id` (UNIQUE) — nunca cria uma segunda linha para o mesmo arquivo. */
  upsertFile(input: UpsertFileInput): Promise<FileRecord>;
  updateFileStatus(fileId: string, status: StatusProcessamentoArquivo, patch?: { hashConteudo?: string; studyId?: string }): Promise<void>;

  /**
   * Registra `modified_time`/`tamanho_bytes` obtidos no FETCH — método
   * separado de `updateFileStatus` porque nem todo `SourceAdapter`
   * fornece esses dois de forma confiável para o ORIGINAL (ex.:
   * `LocalSyncedDriveSourceAdapter` resolve um Google Doc nativo via uma
   * cópia técnica exportada — o `mtime`/tamanho dessa cópia não é
   * metadado do original, então o adaptador deixa os dois `undefined`
   * nesse caso, e esta chamada simplesmente não altera nada).
   */
  recordFetchMetadata(fileId: string, patch: { modifiedTime?: string; tamanhoBytes?: number }): Promise<void>;

  /**
   * Cria um `study` novo (DRAFT/REVIEW) na primeira vez que `fileId` é
   * processado com sucesso, ou ATUALIZA o mesmo `study` (via
   * `files.study_id` já vinculado) numa reexecução — nunca duas linhas
   * para o mesmo arquivo (INGESTION_SPEC.md §9, idempotência).
   */
  upsertStudyForFile(fileId: string, input: UpsertStudyInput): Promise<{ studyId: string }>;

  /** Substitui TODAS as passagens do estudo pelo conjunto atual (delete-then-insert) — nunca acumula duplicatas entre reexecuções. */
  replaceStudyPassages(studyId: string, passages: StudyPassageInput[]): Promise<void>;

  /** Vincula temas/personagens SUGERIDOS (peso/papel padrão) — mesma semântica substitui-tudo de `replaceStudyPassages`. */
  replaceStudyTopics(studyId: string, topicIds: string[]): Promise<void>;
  replaceStudyCharacters(studyId: string, characterIds: string[]): Promise<void>;

  logJobStage(
    fileId: string,
    stage: IngestionStage,
    status: IngestionJobStatus,
    patch?: { attempt?: number; errorMessage?: string },
  ): Promise<void>;
}
