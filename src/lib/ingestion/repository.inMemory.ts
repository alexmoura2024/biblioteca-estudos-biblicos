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
 * Implementação em memória de `IngestionRepository` — usada por
 * `pipeline.test.ts` para provar idempotência/nunca-publica-sozinho sem
 * Postgres, e disponível para rodar a pipeline em modo "simulação" (sem
 * tocar em nenhum banco real) enquanto as credenciais do Drive/Supabase
 * de produção não estiverem configuradas.
 */
export interface InMemoryStudy extends UpsertStudyInput {
  id: string;
  passages: StudyPassageInput[];
  topicIds: string[];
  characterIds: string[];
}

export interface JobLogEntry {
  fileId: string;
  stage: IngestionStage;
  status: IngestionJobStatus;
  attempt: number;
  errorMessage?: string;
}

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

export class InMemoryIngestionRepository implements IngestionRepository {
  readonly files = new Map<string, FileRecord>(); // por drive_file_id
  readonly studies = new Map<string, InMemoryStudy>(); // por study id
  readonly jobLog: JobLogEntry[] = [];

  async upsertFile(input: UpsertFileInput): Promise<FileRecord> {
    const existing = this.files.get(input.driveFileId);
    if (existing) {
      const updated: FileRecord = {
        ...existing,
        nomeOriginal: input.nomeOriginal,
        mimeType: input.mimeType,
        driveUrl: input.driveUrl,
        modifiedTime: input.modifiedTime,
        tamanhoBytes: input.tamanhoBytes,
      };
      this.files.set(input.driveFileId, updated);
      return updated;
    }
    const created: FileRecord = {
      id: nextId("file"),
      driveFileId: input.driveFileId,
      nomeOriginal: input.nomeOriginal,
      mimeType: input.mimeType,
      driveUrl: input.driveUrl,
      modifiedTime: input.modifiedTime,
      tamanhoBytes: input.tamanhoBytes,
      statusProcessamento: "PENDENTE",
    };
    this.files.set(input.driveFileId, created);
    return created;
  }

  async updateFileStatus(fileId: string, status: StatusProcessamentoArquivo, patch?: { hashConteudo?: string; studyId?: string }): Promise<void> {
    for (const [driveFileId, file] of this.files) {
      if (file.id === fileId) {
        this.files.set(driveFileId, { ...file, statusProcessamento: status, ...patch });
        return;
      }
    }
    throw new Error(`InMemoryIngestionRepository.updateFileStatus: arquivo "${fileId}" não encontrado.`);
  }

  async recordFetchMetadata(fileId: string, patch: { modifiedTime?: string; tamanhoBytes?: number }): Promise<void> {
    for (const [driveFileId, file] of this.files) {
      if (file.id === fileId) {
        this.files.set(driveFileId, {
          ...file,
          ...(patch.modifiedTime !== undefined ? { modifiedTime: patch.modifiedTime } : {}),
          ...(patch.tamanhoBytes !== undefined ? { tamanhoBytes: patch.tamanhoBytes } : {}),
        });
        return;
      }
    }
    throw new Error(`InMemoryIngestionRepository.recordFetchMetadata: arquivo "${fileId}" não encontrado.`);
  }

  async upsertStudyForFile(fileId: string, input: UpsertStudyInput): Promise<{ studyId: string }> {
    const fileEntry = [...this.files.values()].find((f) => f.id === fileId);
    if (!fileEntry) throw new Error(`InMemoryIngestionRepository.upsertStudyForFile: arquivo "${fileId}" não encontrado.`);

    if (fileEntry.studyId) {
      const existing = this.studies.get(fileEntry.studyId);
      if (existing) {
        this.studies.set(fileEntry.studyId, { ...existing, ...input, id: fileEntry.studyId, passages: existing.passages, topicIds: existing.topicIds, characterIds: existing.characterIds });
        return { studyId: fileEntry.studyId };
      }
    }

    const studyId = nextId("study");
    this.studies.set(studyId, { ...input, id: studyId, passages: [], topicIds: [], characterIds: [] });
    await this.updateFileStatus(fileId, fileEntry.statusProcessamento, { studyId });
    return { studyId };
  }

  async replaceStudyPassages(studyId: string, passages: StudyPassageInput[]): Promise<void> {
    const study = this.studies.get(studyId);
    if (!study) throw new Error(`InMemoryIngestionRepository.replaceStudyPassages: estudo "${studyId}" não encontrado.`);
    this.studies.set(studyId, { ...study, passages: [...passages] });
  }

  async replaceStudyTopics(studyId: string, topicIds: string[]): Promise<void> {
    const study = this.studies.get(studyId);
    if (!study) throw new Error(`InMemoryIngestionRepository.replaceStudyTopics: estudo "${studyId}" não encontrado.`);
    this.studies.set(studyId, { ...study, topicIds: [...topicIds] });
  }

  async replaceStudyCharacters(studyId: string, characterIds: string[]): Promise<void> {
    const study = this.studies.get(studyId);
    if (!study) throw new Error(`InMemoryIngestionRepository.replaceStudyCharacters: estudo "${studyId}" não encontrado.`);
    this.studies.set(studyId, { ...study, characterIds: [...characterIds] });
  }

  async logJobStage(
    fileId: string,
    stage: IngestionStage,
    status: IngestionJobStatus,
    patch?: { attempt?: number; errorMessage?: string },
  ): Promise<void> {
    this.jobLog.push({ fileId, stage, status, attempt: patch?.attempt ?? 1, errorMessage: patch?.errorMessage });
  }
}
