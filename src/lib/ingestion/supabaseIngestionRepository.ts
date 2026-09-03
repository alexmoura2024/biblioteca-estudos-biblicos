import { getSupabaseServiceClient } from "@/lib/supabase/serviceClient";
import type {
  FileRecord,
  IngestionJobStatus,
  IngestionRepository,
  IngestionStage,
  StatusProcessamentoArquivo,
  StudyPassageInput,
  UpsertFileInput,
  UpsertStudyInput,
} from "@/lib/ingestion/repository";

/**
 * Implementação real de `IngestionRepository` (Fase 3) — usa o cliente
 * `service_role` (`getSupabaseServiceClient`), nunca o `anon` público:
 * `files`/`ingestion_jobs` são bloqueadas para `anon` por RLS (ver
 * `supabase/migrations/..._fase3_provenance_rls.sql`), e escrever em
 * `studies`/`study_passages`/etc. exige privilégio que `anon` não tem
 * (DEC-020). Só deve ser instanciada por um script server-only
 * (`scripts/`), nunca por `src/app/**`/`src/components/**`.
 *
 * NÃO TESTADO CONTRA POSTGRES REAL nesta sessão (mesmo bloqueio de
 * Docker da Fase 2, DEC-024) — os testes em
 * `supabaseIngestionRepository.test.ts` usam um cliente Supabase
 * mockado (mesmo padrão de `src/lib/repositories/supabase/testUtils.ts`)
 * e provam a lógica de tradução, não o schema/RLS reais.
 */

interface FileRow {
  id: string;
  drive_file_id: string;
  nome_original: string;
  mime_type: string;
  drive_url: string;
  hash_conteudo: string | null;
  modified_time: string | null;
  tamanho_bytes: number | null;
  study_id: string | null;
  status_processamento: StatusProcessamentoArquivo;
}

function mapFileRow(row: FileRow): FileRecord {
  return {
    id: row.id,
    driveFileId: row.drive_file_id,
    nomeOriginal: row.nome_original,
    mimeType: row.mime_type,
    driveUrl: row.drive_url,
    hashConteudo: row.hash_conteudo ?? undefined,
    modifiedTime: row.modified_time ?? undefined,
    tamanhoBytes: row.tamanho_bytes ?? undefined,
    studyId: row.study_id ?? undefined,
    statusProcessamento: row.status_processamento,
  };
}

const FILE_COLUMNS = "id, drive_file_id, nome_original, mime_type, drive_url, hash_conteudo, modified_time, tamanho_bytes, study_id, status_processamento";

export class SupabaseIngestionRepository implements IngestionRepository {
  async upsertFile(input: UpsertFileInput): Promise<FileRecord> {
    const client = getSupabaseServiceClient();
    const { data, error } = await client
      .from("files")
      .upsert(
        {
          drive_file_id: input.driveFileId,
          nome_original: input.nomeOriginal,
          mime_type: input.mimeType,
          drive_url: input.driveUrl,
          modified_time: input.modifiedTime ?? null,
          tamanho_bytes: input.tamanhoBytes ?? null,
        },
        { onConflict: "drive_file_id" },
      )
      .select(FILE_COLUMNS)
      .single();
    if (error) throw new Error(`SupabaseIngestionRepository.upsertFile: ${error.message}`);
    return mapFileRow(data as FileRow);
  }

  async updateFileStatus(fileId: string, status: StatusProcessamentoArquivo, patch?: { hashConteudo?: string; studyId?: string }): Promise<void> {
    const client = getSupabaseServiceClient();
    const { error } = await client
      .from("files")
      .update({
        status_processamento: status,
        ...(patch?.hashConteudo !== undefined ? { hash_conteudo: patch.hashConteudo } : {}),
        ...(patch?.studyId !== undefined ? { study_id: patch.studyId } : {}),
      })
      .eq("id", fileId);
    if (error) throw new Error(`SupabaseIngestionRepository.updateFileStatus: ${error.message}`);
  }

  async upsertStudyForFile(fileId: string, input: UpsertStudyInput): Promise<{ studyId: string }> {
    const client = getSupabaseServiceClient();

    const { data: fileRow, error: fileError } = await client.from("files").select("study_id").eq("id", fileId).single();
    if (fileError) throw new Error(`SupabaseIngestionRepository.upsertStudyForFile (ler files): ${fileError.message}`);
    const existingStudyId = (fileRow as { study_id: string | null }).study_id;

    const payload = {
      titulo: input.titulo,
      slug: input.slug,
      resumo: input.resumo,
      conteudo: input.conteudo,
      status: input.status,
      autor: input.autor,
      data_origem: input.dataOrigem,
      palavras_chave: input.palavrasChave,
    };

    if (existingStudyId) {
      // Reexecução (idempotência, INGESTION_SPEC.md §9): ATUALIZA o
      // mesmo study, nunca insere um segundo para o mesmo arquivo.
      const { error } = await client.from("studies").update(payload).eq("id", existingStudyId);
      if (error) throw new Error(`SupabaseIngestionRepository.upsertStudyForFile (update): ${error.message}`);
      return { studyId: existingStudyId };
    }

    const { data: inserted, error: insertError } = await client.from("studies").insert(payload).select("id").single();
    if (insertError) throw new Error(`SupabaseIngestionRepository.upsertStudyForFile (insert): ${insertError.message}`);
    return { studyId: (inserted as { id: string }).id };
  }

  async replaceStudyPassages(studyId: string, passages: StudyPassageInput[]): Promise<void> {
    const client = getSupabaseServiceClient();

    const { error: deleteError } = await client.from("study_passages").delete().eq("study_id", studyId);
    if (deleteError) throw new Error(`SupabaseIngestionRepository.replaceStudyPassages (delete): ${deleteError.message}`);
    if (passages.length === 0) return;

    for (const passage of passages) {
      const { data: bookRow, error: bookError } = await client.from("books").select("id").eq("slug", passage.bookSlug).single();
      if (bookError) throw new Error(`SupabaseIngestionRepository.replaceStudyPassages (ler books "${passage.bookSlug}"): ${bookError.message}`);

      const { data: passageRow, error: passageError } = await client
        .from("passages")
        .insert({
          book_id: (bookRow as { id: string }).id,
          capitulo: passage.capitulo,
          versiculo_inicio: passage.versiculoInicio ?? null,
          versiculo_fim: passage.versiculoFim ?? null,
          referencia_normalizada: passage.referenciaNormalizada,
        })
        .select("id")
        .single();
      if (passageError) throw new Error(`SupabaseIngestionRepository.replaceStudyPassages (insert passages): ${passageError.message}`);

      const tipoRelacaoDb = { principal: "MAIN", secundaria: "SECONDARY", citada: "CITED" }[passage.tipoRelacao];
      const { error: linkError } = await client.from("study_passages").insert({
        study_id: studyId,
        passage_id: (passageRow as { id: string }).id,
        tipo_relacao: tipoRelacaoDb,
        prioridade: passage.prioridade,
      });
      if (linkError) throw new Error(`SupabaseIngestionRepository.replaceStudyPassages (insert study_passages): ${linkError.message}`);
    }
  }

  async replaceStudyTopics(studyId: string, topicIds: string[]): Promise<void> {
    const client = getSupabaseServiceClient();
    const { error: deleteError } = await client.from("study_topics").delete().eq("study_id", studyId);
    if (deleteError) throw new Error(`SupabaseIngestionRepository.replaceStudyTopics (delete): ${deleteError.message}`);
    if (topicIds.length === 0) return;
    const { error } = await client.from("study_topics").insert(topicIds.map((topicId) => ({ study_id: studyId, topic_id: topicId, peso: 1 })));
    if (error) throw new Error(`SupabaseIngestionRepository.replaceStudyTopics (insert): ${error.message}`);
  }

  async replaceStudyCharacters(studyId: string, characterIds: string[]): Promise<void> {
    const client = getSupabaseServiceClient();
    const { error: deleteError } = await client.from("study_characters").delete().eq("study_id", studyId);
    if (deleteError) throw new Error(`SupabaseIngestionRepository.replaceStudyCharacters (delete): ${deleteError.message}`);
    if (characterIds.length === 0) return;
    const { error } = await client
      .from("study_characters")
      .insert(characterIds.map((characterId) => ({ study_id: studyId, character_id: characterId, papel: "sugerido" })));
    if (error) throw new Error(`SupabaseIngestionRepository.replaceStudyCharacters (insert): ${error.message}`);
  }

  async logJobStage(
    fileId: string,
    stage: IngestionStage,
    status: IngestionJobStatus,
    patch?: { attempt?: number; errorMessage?: string },
  ): Promise<void> {
    const client = getSupabaseServiceClient();
    const now = new Date().toISOString();
    const { error } = await client.from("ingestion_jobs").insert({
      file_id: fileId,
      stage,
      status,
      attempt: patch?.attempt ?? 1,
      error_message: patch?.errorMessage ?? null,
      started_at: now,
      finished_at: status === "RUNNING" || status === "PENDING" ? null : now,
    });
    if (error) throw new Error(`SupabaseIngestionRepository.logJobStage: ${error.message}`);
  }
}
