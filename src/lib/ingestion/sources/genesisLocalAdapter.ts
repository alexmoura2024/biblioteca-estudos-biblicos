/**
 * Adaptador de origem para arquivos locais de Gênesis (pasta técnica 01_ARQUIVOS_DE_TEXTO)
 * Implementa SourceAdapter: mapeia driveFileId para arquivo local na pasta técnica
 */

import { readFileSync } from "node:fs";
import type { SourceAdapter, SourceFile } from "./types";

export class GenesisLocalSourceAdapter implements SourceAdapter {
  // Mapeamento de driveFileId → caminho local (preenchido dinamicamente)
  private fileCache = new Map<string, string>();

  constructor(private basePath: string) {}

  // Registrar arquivo local para um driveFileId
  registerFile(driveFileId: string, localPath: string) {
    this.fileCache.set(driveFileId, localPath);
  }

  async fetchFile(driveFileId: string): Promise<SourceFile> {
    const localPath = this.fileCache.get(driveFileId);
    if (!localPath) {
      throw new Error(`[Genesis] Arquivo não registrado para ${driveFileId}`);
    }

    try {
      const buffer = readFileSync(localPath);
      const ext = localPath.split(".").pop()?.toLowerCase() || "";
      const nomeOriginal = localPath.split("\\").pop() || driveFileId;

      // Detectar MIME type
      let mimeType = "application/octet-stream";
      if (ext === "docx") mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      if (ext === "doc") mimeType = "application/msword";
      if (ext === "pdf") mimeType = "application/pdf";
      if (ext === "rtf") mimeType = "text/rtf";

      return {
        buffer,
        mimeType,
        nomeOriginal,
        tamanhoBytes: buffer.length,
      };
    } catch (e) {
      throw new Error(`[Genesis] Erro ao ler arquivo ${localPath}: ${(e as any).message}`);
    }
  }
}
