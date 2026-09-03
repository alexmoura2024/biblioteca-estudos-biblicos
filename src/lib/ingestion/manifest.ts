import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "csv-parse/sync";

/**
 * Manifesto do lote piloto da Fase 3 (docs/fase3-piloto/) — 50
 * candidatos curados a partir do Drive, NÃO o acervo inteiro (CLAUDE.md
 * §4, Etapa 12). Este módulo só lê e valida o manifesto; nunca busca o
 * conteúdo do arquivo em si (isso é `src/lib/ingestion/sources/`).
 */

export type ManifestQueue = "SELECIONADOS" | "REVISAR" | "DUPLICADOS_POSSIVEIS";

export interface ManifestRow {
  pilotId: string;
  queue: ManifestQueue;
  sourcePath: string;
  testament: "AT" | "NT" | "";
  bookOrScope: string;
  title: string;
  driveFileId: string;
  mimeType: string;
  preliminaryReference: string;
  duplicateGroup: string;
  notes: string;
  sourceUrl: string;
}

interface RawManifestRow {
  pilot_id: string;
  queue: string;
  source_path: string;
  testament: string;
  book_or_scope: string;
  title: string;
  drive_file_id: string;
  mime_type: string;
  preliminary_reference: string;
  duplicate_group: string;
  notes: string;
  source_url: string;
}

function toRow(raw: RawManifestRow): ManifestRow {
  return {
    pilotId: raw.pilot_id,
    queue: raw.queue as ManifestQueue,
    sourcePath: raw.source_path,
    testament: raw.testament === "AT" || raw.testament === "NT" ? raw.testament : "",
    bookOrScope: raw.book_or_scope,
    title: raw.title,
    driveFileId: raw.drive_file_id,
    mimeType: raw.mime_type,
    preliminaryReference: raw.preliminary_reference,
    duplicateGroup: raw.duplicate_group,
    notes: raw.notes,
    sourceUrl: raw.source_url,
  };
}

/** Faz o parse de um CSV do manifesto (conteúdo já lido) para `ManifestRow[]`. */
export function parseManifestCsv(csvContent: string): ManifestRow[] {
  const records = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true }) as RawManifestRow[];
  return records.map(toRow);
}

/**
 * Lê `docs/fase3-piloto/PILOTO_FASE3_MANIFEST.csv` diretamente do
 * repositório (fonte de verdade única — não duplicamos o conteúdo em
 * `src/`, mesma lógica de DEC-016 para a documentação). Caminho resolvido
 * a partir de `process.cwd()` — Next.js, os scripts em `scripts/` e o
 * Vitest sempre rodam com o cwd na raiz do projeto neste repositório
 * (`import.meta.url` não é confiável aqui: sob o transform do Vitest ele
 * não resolve para um `file://` real, ao contrário de um script rodado
 * via `tsx`).
 */
export function loadManifest(): ManifestRow[] {
  const path = join(process.cwd(), "docs/fase3-piloto/PILOTO_FASE3_MANIFEST.csv");
  return parseManifestCsv(readFileSync(path, "utf8"));
}

export interface ManifestIssue {
  severity: "error" | "warning";
  code: string;
  message: string;
  pilotIds: string[];
}

export interface ManifestValidationResult {
  totalRows: number;
  countsByQueue: Record<ManifestQueue, number>;
  issues: ManifestIssue[];
  /** `true` só quando não há nenhum issue de severidade "error". */
  ok: boolean;
}

const EXPECTED_COUNTS: Record<ManifestQueue, number> = {
  SELECIONADOS: 37,
  REVISAR: 1,
  DUPLICADOS_POSSIVEIS: 12,
};
const EXPECTED_TOTAL = 50;

/**
 * Valida as invariantes do manifesto exigidas pelo protocolo da Fase 3
 * (docs/fase3-piloto/CLAUDE_FASE3_EXECUCAO_PILOTO.md, "Validar o
 * manifesto"): exatamente 50 candidatos, filas 37/1/12, `pilot_id` e
 * `drive_file_id` únicos. Reporta problemas como dados (`issues`) em vez
 * de lançar exceção — a auditoria precisa conseguir listar TODOS os
 * problemas de uma vez, não parar no primeiro. Nunca corrige o manifesto
 * silenciosamente: um `drive_file_id` duplicado (ex.: o mesmo arquivo do
 * Drive listado sob dois `pilot_id` diferentes) é reportado como erro
 * para decisão humana, nunca deduplicado automaticamente aqui.
 */
export function validateManifest(rows: ManifestRow[]): ManifestValidationResult {
  const issues: ManifestIssue[] = [];

  const countsByQueue: Record<ManifestQueue, number> = { SELECIONADOS: 0, REVISAR: 0, DUPLICADOS_POSSIVEIS: 0 };
  for (const row of rows) {
    if (row.queue in countsByQueue) countsByQueue[row.queue] += 1;
  }

  if (rows.length !== EXPECTED_TOTAL) {
    issues.push({
      severity: "error",
      code: "TOTAL_INCORRETO",
      message: `Esperado exatamente ${EXPECTED_TOTAL} candidatos no manifesto, encontrado ${rows.length}.`,
      pilotIds: [],
    });
  }

  for (const queue of Object.keys(EXPECTED_COUNTS) as ManifestQueue[]) {
    if (countsByQueue[queue] !== EXPECTED_COUNTS[queue]) {
      issues.push({
        severity: "error",
        code: "FILA_COM_CONTAGEM_INCORRETA",
        message: `Fila ${queue}: esperado ${EXPECTED_COUNTS[queue]}, encontrado ${countsByQueue[queue]}.`,
        pilotIds: rows.filter((r) => r.queue === queue).map((r) => r.pilotId),
      });
    }
  }

  const byPilotId = new Map<string, ManifestRow[]>();
  for (const row of rows) {
    const list = byPilotId.get(row.pilotId) ?? [];
    list.push(row);
    byPilotId.set(row.pilotId, list);
  }
  for (const [pilotId, group] of byPilotId) {
    if (group.length > 1) {
      issues.push({
        severity: "error",
        code: "PILOT_ID_DUPLICADO",
        message: `pilot_id "${pilotId}" aparece ${group.length} vezes no manifesto.`,
        pilotIds: [pilotId],
      });
    }
  }

  const byDriveFileId = new Map<string, ManifestRow[]>();
  for (const row of rows) {
    if (!row.driveFileId) continue;
    const list = byDriveFileId.get(row.driveFileId) ?? [];
    list.push(row);
    byDriveFileId.set(row.driveFileId, list);
  }
  for (const [driveFileId, group] of byDriveFileId) {
    if (group.length > 1) {
      issues.push({
        severity: "error",
        code: "DRIVE_FILE_ID_DUPLICADO",
        message:
          `drive_file_id "${driveFileId}" aparece em ${group.length} linhas do manifesto ` +
          `(${group.map((r) => r.pilotId).join(", ")}) — é fisicamente o mesmo arquivo do Drive ` +
          `listado mais de uma vez. Não deduplicado automaticamente; decisão humana necessária ` +
          `sobre qual pilot_id remover/mesclar antes da ingestão.`,
        pilotIds: group.map((r) => r.pilotId),
      });
    }
  }

  // DUPLICADOS_POSSIVEIS sem duplicate_group preenchido é um sinal de que
  // o manifesto está incompleto para o diagnóstico de duplicidade da
  // Etapa 5 — reportado como aviso (não bloqueia o resto da validação).
  for (const row of rows) {
    if (row.queue === "DUPLICADOS_POSSIVEIS" && !row.duplicateGroup) {
      issues.push({
        severity: "warning",
        code: "DUPLICADO_SEM_GRUPO",
        message: `${row.pilotId} está na fila DUPLICADOS_POSSIVEIS mas não tem duplicate_group preenchido.`,
        pilotIds: [row.pilotId],
      });
    }
  }

  return {
    totalRows: rows.length,
    countsByQueue,
    issues,
    ok: issues.every((issue) => issue.severity !== "error"),
  };
}
