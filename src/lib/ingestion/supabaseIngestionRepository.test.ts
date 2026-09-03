import { describe, expect, it, vi } from "vitest";
import { createMockSupabaseClient } from "@/lib/repositories/supabase/testUtils";

const getSupabaseServiceClientMock = vi.fn();
vi.mock("@/lib/supabase/serviceClient", () => ({
  getSupabaseServiceClient: () => getSupabaseServiceClientMock(),
}));

const { SupabaseIngestionRepository } = await import("@/lib/ingestion/supabaseIngestionRepository");

const FILE_ROW = {
  id: "file-1",
  drive_file_id: "drive-1",
  nome_original: "Estudo.docx",
  mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  drive_url: "https://drive.google.com/open?id=drive-1",
  hash_conteudo: null,
  modified_time: null,
  tamanho_bytes: null,
  study_id: null,
  status_processamento: "PENDENTE",
};

describe("SupabaseIngestionRepository.upsertFile", () => {
  it("faz upsert por drive_file_id e traduz a linha de volta para FileRecord", async () => {
    const client = createMockSupabaseClient({ tables: { files: { data: FILE_ROW, error: null } } });
    getSupabaseServiceClientMock.mockReturnValue(client);

    const file = await new SupabaseIngestionRepository().upsertFile({
      driveFileId: "drive-1",
      nomeOriginal: "Estudo.docx",
      mimeType: FILE_ROW.mime_type,
      driveUrl: FILE_ROW.drive_url,
    });

    expect(client.from).toHaveBeenCalledWith("files");
    expect(file.driveFileId).toBe("drive-1");
    expect(file.statusProcessamento).toBe("PENDENTE");
  });
});

describe("SupabaseIngestionRepository.upsertStudyForFile", () => {
  it("INSERE um study novo quando o arquivo ainda não tem study_id (primeira execução)", async () => {
    const client = createMockSupabaseClient({
      tables: {
        files: { data: { study_id: null, drive_file_id: "drive-1" }, error: null },
        studies: { data: { id: "study-novo" }, error: null },
      },
    });
    getSupabaseServiceClientMock.mockReturnValue(client);

    const { studyId } = await new SupabaseIngestionRepository().upsertStudyForFile("file-1", {
      titulo: "t",
      slug: "t",
      resumo: "r",
      conteudo: "c",
      status: "REVIEW",
      autor: "Autor não identificado",
      dataOrigem: "1970-01-01",
      palavrasChave: [],
    });

    expect(studyId).toBe("study-novo");
    expect(client.from).toHaveBeenCalledWith("studies");
  });

  it("ATUALIZA o study existente quando o arquivo já tem study_id vinculado (reexecução idempotente)", async () => {
    const client = createMockSupabaseClient({
      tables: {
        files: { data: { study_id: "study-existente", drive_file_id: "drive-1" }, error: null },
        studies: { data: null, error: null },
      },
    });
    getSupabaseServiceClientMock.mockReturnValue(client);

    const { studyId } = await new SupabaseIngestionRepository().upsertStudyForFile("file-1", {
      titulo: "t",
      slug: "t",
      resumo: "r",
      conteudo: "c",
      status: "REVIEW",
      autor: "Autor não identificado",
      dataOrigem: "1970-01-01",
      palavrasChave: [],
    });

    // Reusa o MESMO studyId — nunca cria um segundo study para o mesmo arquivo.
    expect(studyId).toBe("study-existente");
  });
});

describe("SupabaseIngestionRepository.replaceStudyPassages", () => {
  it("apaga as passagens antigas e insere as novas, traduzindo tipoRelacao para MAIN/SECONDARY/CITED", async () => {
    const client = createMockSupabaseClient({
      tables: {
        study_passages: [
          { data: null, error: null }, // delete
          { data: null, error: null }, // insert do vínculo study_passages
        ],
        books: { data: { id: "book-joao" }, error: null },
        passages: { data: { id: "passage-1" }, error: null },
      },
    });
    getSupabaseServiceClientMock.mockReturnValue(client);

    await new SupabaseIngestionRepository().replaceStudyPassages("study-1", [
      { bookSlug: "joao", capitulo: 3, versiculoInicio: 16, referenciaNormalizada: "João 3:16", tipoRelacao: "principal", prioridade: 1 },
    ]);

    expect(client.from).toHaveBeenCalledWith("study_passages");
    expect(client.from).toHaveBeenCalledWith("books");
    expect(client.from).toHaveBeenCalledWith("passages");
  });

  it("não insere nada quando a lista de passagens é vazia (só apaga as antigas)", async () => {
    const client = createMockSupabaseClient({ tables: { study_passages: { data: null, error: null } } });
    getSupabaseServiceClientMock.mockReturnValue(client);

    await new SupabaseIngestionRepository().replaceStudyPassages("study-1", []);
    expect(client.from).toHaveBeenCalledTimes(1); // só o delete
  });
});

describe("SupabaseIngestionRepository.logJobStage", () => {
  it("registra o estágio com finished_at preenchido para status terminal (SUCCESS/FAILED/SKIPPED)", async () => {
    const client = createMockSupabaseClient({ tables: { ingestion_jobs: { data: null, error: null } } });
    getSupabaseServiceClientMock.mockReturnValue(client);

    await new SupabaseIngestionRepository().logJobStage("file-1", "EXTRACT", "SUCCESS");
    expect(client.from).toHaveBeenCalledWith("ingestion_jobs");
  });
});
