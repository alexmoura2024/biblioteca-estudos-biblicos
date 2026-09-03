import type { SourceAdapter, SourceFile } from "@/lib/ingestion/sources/types";

/**
 * Duplo de teste de `SourceAdapter` — usado por `pipeline.test.ts` e por
 * quem quiser rodar a pipeline manualmente contra arquivos já
 * exportados/baixados à mão (em vez do Drive real, ver
 * `googleDriveAdapter.ts`) para uma primeira validação local antes de
 * ter credenciais do Drive.
 */
export class InMemorySourceAdapter implements SourceAdapter {
  constructor(private readonly files: Map<string, SourceFile>) {}

  async fetchFile(driveFileId: string): Promise<SourceFile> {
    const file = this.files.get(driveFileId);
    if (!file) {
      throw new Error(`InMemorySourceAdapter: nenhum arquivo registrado para drive_file_id "${driveFileId}".`);
    }
    return file;
  }
}
