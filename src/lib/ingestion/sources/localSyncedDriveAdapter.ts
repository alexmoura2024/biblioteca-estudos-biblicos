import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { ManifestRow } from "@/lib/ingestion/manifest";
import type { SourceAdapter, SourceFile } from "@/lib/ingestion/sources/types";

const EXTENSION_MIME: Record<string, string> = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  pdf: "application/pdf",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain",
};

function mimeFromExtension(fileName: string): string | undefined {
  const ext = fileName.toLowerCase().split(".").pop();
  return ext ? EXTENSION_MIME[ext] : undefined;
}

export interface LocalSyncedDriveConfig {
  /** Raiz do acervo original — onde `source_path` do manifesto é relativo (ex.: ".../00_BIBLIOTECA_VIRTUAL/01_ACERVO"). */
  acervoRoot: string;
  /** Pasta com as cópias técnicas de TODAS as fontes físicas do piloto, nomeadas "<pilot_id>_..." ou "<pilot_id>__...". */
  exportsDir: string;
  manifestRows: ManifestRow[];
}

/**
 * `SourceAdapter` real (Fase 3, decisão do usuário): em vez de credenciais
 * da Drive API, usa a cópia do Google Drive já sincronizada pelo cliente
 * de Desktop do Windows (`G:\Meu Drive\...`). Três prioridades de
 * resolução, nesta ordem (checkpoint 13 — antes só a Prioridade 1 valia
 * para Google Docs nativos; agora vale para as 49 fontes físicas, já que
 * o usuário copiou cópias técnicas de todo o lote para `exportsDir`):
 *
 * 1. **Cópia técnica por `pilot_id`** em `exportsDir` — um arquivo cujo
 *    nome começa com `<pilot_id>_`. Resolução determinística, nunca por
 *    conteúdo/adivinhação; zero ou mais de um match é erro claro. Cobre
 *    tanto Google Docs nativos (que não têm bytes próprios — só existem
 *    como cópia técnica) quanto arquivos não nativos já copiados aqui.
 * 2. **`acervoRoot` + `source_path` + `title`** (caminho exato do
 *    manifesto) — só tentado quando a Prioridade 1 não encontrou nada E
 *    o arquivo não é um Google Doc nativo (que não tem outra forma de
 *    ser lido).
 * 3. **Busca recursiva pelo nome exato** dentro de `acervoRoot` —
 *    fallback final; zero ou mais de uma correspondência é erro claro
 *    (nunca adivinha qual arquivo é o certo).
 *
 * IMPORTANTE — proveniência: o `mimeType` devolvido aqui é o da CÓPIA
 * lida (usado só para `extractText` rotear o parser certo — uma cópia
 * técnica pode ser .doc/.docx/.pdf/.pptx, detectado pela extensão real
 * do arquivo, nunca assumido). `modifiedTime`/`tamanhoBytes` só são
 * preenchidos quando o arquivo lido é o ORIGINAL de verdade (Prioridade
 * 2/3) — uma cópia técnica (Prioridade 1) nunca fornece esses dois,
 * porque seriam metadados da cópia, não do original. `pipeline.ts`
 * nunca usa nada de `SourceFile` como proveniência de identidade —
 * `drive_file_id`/URL/título/MIME/`source_path` de proveniência sempre
 * vêm do `ManifestRow`, nunca da cópia técnica. Ver DEC-031/036.
 */
export class LocalSyncedDriveSourceAdapter implements SourceAdapter {
  constructor(private readonly config: LocalSyncedDriveConfig) {}

  async fetchFile(driveFileId: string): Promise<SourceFile> {
    const row = this.config.manifestRows.find((r) => r.driveFileId === driveFileId);
    if (!row) {
      throw new Error(`LocalSyncedDriveSourceAdapter: nenhuma linha do manifesto tem drive_file_id "${driveFileId}".`);
    }

    // Prioridade 1: cópia técnica por pilot_id — vale para qualquer fonte física.
    const technicalCopy = this.tryFetchTechnicalCopy(row);
    if (technicalCopy) return technicalCopy;

    // Um Google Doc nativo não tem bytes próprios fora de uma cópia
    // exportada — se a Prioridade 1 não achou nada, não há Prioridade
    // 2/3 possível para ele.
    if (row.mimeType === "application/vnd.google-apps.document") {
      throw new Error(
        `LocalSyncedDriveSourceAdapter: nenhuma cópia técnica encontrada para ${row.pilotId} (Google Doc nativo, ` +
          `sem bytes próprios) em "${this.config.exportsDir}" — esperado um arquivo iniciado por "${row.pilotId}_".`,
      );
    }

    return this.fetchOriginalFile(row);
  }

  private tryFetchTechnicalCopy(row: ManifestRow): SourceFile | undefined {
    let entries: string[];
    try {
      entries = readdirSync(this.config.exportsDir);
    } catch (error) {
      throw new Error(
        `LocalSyncedDriveSourceAdapter: não consegui listar a pasta de cópias técnicas "${this.config.exportsDir}" ` +
          `para resolver ${row.pilotId} (${(error as Error).message}).`,
      );
    }

    const matches = entries.filter((name) => name.startsWith(`${row.pilotId}_`));
    if (matches.length === 0) return undefined;
    if (matches.length > 1) {
      throw new Error(
        `LocalSyncedDriveSourceAdapter: ${matches.length} cópias técnicas ambíguas para ${row.pilotId}: ${matches.join(", ")}.`,
      );
    }

    const fileName = matches[0];
    const filePath = join(this.config.exportsDir, fileName);
    const buffer = readFileSync(filePath);
    const mimeType = mimeFromExtension(fileName);
    if (!mimeType) {
      throw new Error(`LocalSyncedDriveSourceAdapter: cópia técnica "${fileName}" (${row.pilotId}) tem uma extensão sem MIME conhecido.`);
    }
    // Cópia técnica — nunca modifiedTime/tamanhoBytes (seriam da cópia, não do original).
    return { buffer, mimeType, nomeOriginal: fileName };
  }

  private fetchOriginalFile(row: ManifestRow): SourceFile {
    const direct = join(this.config.acervoRoot, row.sourcePath, row.title);
    if (existsSync(direct)) {
      return this.readOriginal(direct, row.mimeType);
    }

    const matches = this.findByExactName(this.config.acervoRoot, row.title);
    if (matches.length === 0) {
      throw new Error(
        `LocalSyncedDriveSourceAdapter: arquivo original de ${row.pilotId} ("${row.title}") não encontrado — ` +
          `nem cópia técnica em "${this.config.exportsDir}", nem em "${direct}", nem por busca recursiva pelo ` +
          `nome exato em "${this.config.acervoRoot}". Provavelmente não está sincronizado localmente nesta cópia do Drive.`,
      );
    }
    if (matches.length > 1) {
      throw new Error(
        `LocalSyncedDriveSourceAdapter: ${matches.length} arquivos ambíguos com o nome "${row.title}" ` +
          `encontrados para ${row.pilotId}: ${matches.join(" | ")}.`,
      );
    }
    return this.readOriginal(matches[0], row.mimeType);
  }

  private readOriginal(filePath: string, mimeType: string): SourceFile {
    const buffer = readFileSync(filePath);
    const stats = statSync(filePath);
    // Arquivo original de verdade (sincronizado pelo Drive) — mtime/
    // tamanho aqui SÃO metadados confiáveis de proveniência.
    return {
      buffer,
      mimeType,
      nomeOriginal: filePath.split(/[\\/]/).pop() ?? filePath,
      modifiedTime: stats.mtime.toISOString(),
      tamanhoBytes: stats.size,
    };
  }

  private findByExactName(root: string, name: string): string[] {
    const matches: string[] = [];
    const stack = [root];
    while (stack.length > 0) {
      const dir = stack.pop();
      if (dir === undefined) continue;
      let entries;
      try {
        entries = readdirSync(dir, { withFileTypes: true });
      } catch {
        continue; // pasta inacessível — ignora, não derruba a busca inteira
      }
      for (const entry of entries) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) stack.push(full);
        else if (entry.name === name) matches.push(full);
      }
    }
    return matches;
  }
}
