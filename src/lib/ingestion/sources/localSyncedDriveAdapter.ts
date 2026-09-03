import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { ManifestRow } from "@/lib/ingestion/manifest";
import type { SourceAdapter, SourceFile } from "@/lib/ingestion/sources/types";

const GOOGLE_DOC_MIME = "application/vnd.google-apps.document";
/** MIME da CÓPIA TÉCNICA exportada (sempre DOCX) — nunca o MIME de proveniência, que continua vindo do manifesto (ver pipeline.ts, upsertFile). */
const EXPORT_DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export interface LocalSyncedDriveConfig {
  /** Raiz do acervo original — onde `source_path` do manifesto é relativo (ex.: ".../00_BIBLIOTECA_VIRTUAL/01_ACERVO"). */
  acervoRoot: string;
  /** Pasta com os exports técnicos DOCX de Google Docs nativos, nomeados "<pilot_id>_..." ou "<pilot_id>__...". */
  exportsDir: string;
  manifestRows: ManifestRow[];
}

/**
 * `SourceAdapter` real (Fase 3, decisão do usuário): em vez de credenciais
 * da Drive API, usa a cópia do Google Drive já sincronizada pelo cliente
 * de Desktop do Windows (`G:\Meu Drive\...`). Dois casos:
 *
 * 1. **Google Doc nativo** (`application/vnd.google-apps.document`): não
 *    tem bytes originais para ler diretamente (é um documento estruturado
 *    do Google, não um arquivo) — resolvido por uma CÓPIA TÉCNICA DOCX
 *    já exportada para `exportsDir`, nomeada com o `pilot_id` como
 *    prefixo (`SEL-001_...docx`). Resolução determinística pelo
 *    `pilot_id`, nunca por conteúdo/adivinhação.
 * 2. **Arquivo não nativo** (DOC/DOCX/PDF/PPTX): tenta `acervoRoot +
 *    source_path + title` primeiro (caminho exato do manifesto); se não
 *    existir, cai para busca recursiva pelo nome exato dentro de
 *    `acervoRoot`. Zero ou mais de uma correspondência é erro claro
 *    (nunca adivinha qual arquivo é o certo).
 *
 * IMPORTANTE — proveniência: o `mimeType`/`modifiedTime`/`tamanhoBytes`
 * devolvidos aqui para um Google Doc são da CÓPIA exportada (usados só
 * para rotear a extração — `extractText` precisa saber que é um DOCX).
 * `pipeline.ts` nunca usa esses dois últimos como proveniência real
 * quando ausentes (por isso ficam `undefined` no caso 1) — `drive_file_id`
 * /URL/título/MIME de proveniência sempre vêm do `ManifestRow`
 * (`manifestRow.*`), nunca de `SourceFile`. Ver DEC-031.
 */
export class LocalSyncedDriveSourceAdapter implements SourceAdapter {
  constructor(private readonly config: LocalSyncedDriveConfig) {}

  async fetchFile(driveFileId: string): Promise<SourceFile> {
    const row = this.config.manifestRows.find((r) => r.driveFileId === driveFileId);
    if (!row) {
      throw new Error(`LocalSyncedDriveSourceAdapter: nenhuma linha do manifesto tem drive_file_id "${driveFileId}".`);
    }

    if (row.mimeType === GOOGLE_DOC_MIME) {
      return this.fetchGoogleDocExport(row);
    }
    return this.fetchOriginalFile(row);
  }

  private fetchGoogleDocExport(row: ManifestRow): SourceFile {
    let entries: string[];
    try {
      entries = readdirSync(this.config.exportsDir);
    } catch (error) {
      throw new Error(
        `LocalSyncedDriveSourceAdapter: não consegui listar a pasta de exports técnicos "${this.config.exportsDir}" ` +
          `para resolver ${row.pilotId} (${(error as Error).message}).`,
      );
    }

    const matches = entries.filter((name) => name.startsWith(`${row.pilotId}_`));
    if (matches.length === 0) {
      throw new Error(
        `LocalSyncedDriveSourceAdapter: nenhum export técnico encontrado para ${row.pilotId} (Google Doc nativo) ` +
          `em "${this.config.exportsDir}" — esperado um arquivo iniciado por "${row.pilotId}_".`,
      );
    }
    if (matches.length > 1) {
      throw new Error(
        `LocalSyncedDriveSourceAdapter: ${matches.length} exports técnicos ambíguos para ${row.pilotId}: ${matches.join(", ")}.`,
      );
    }

    const filePath = join(this.config.exportsDir, matches[0]);
    const buffer = readFileSync(filePath);
    return { buffer, mimeType: EXPORT_DOCX_MIME, nomeOriginal: matches[0] };
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
          `nem em "${direct}" nem por busca recursiva pelo nome exato em "${this.config.acervoRoot}". ` +
          "Provavelmente não está sincronizado localmente nesta cópia do Drive.",
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
