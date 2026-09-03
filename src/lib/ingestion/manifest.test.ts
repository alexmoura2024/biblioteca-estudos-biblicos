import { describe, expect, it } from "vitest";
import { loadManifest, parseManifestCsv, rowsToIngest, validateManifest, type ManifestRow } from "@/lib/ingestion/manifest";

describe("parseManifestCsv", () => {
  it("faz o parse de um CSV simples do manifesto para ManifestRow[]", () => {
    const csv =
      "pilot_id,queue,source_path,testament,book_or_scope,title,drive_file_id,mime_type,preliminary_reference,duplicate_group,notes,source_url\n" +
      'SEL-001,SELECIONADOS,"Pasta, com vírgula",AT,Gênesis,Título — Gênesis 1:1,abc123,application/msword,Gênesis 1:1,,uma nota,https://drive.google.com/open?id=abc123\n';

    const rows = parseManifestCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      pilotId: "SEL-001",
      queue: "SELECIONADOS",
      sourcePath: "Pasta, com vírgula",
      testament: "AT",
      bookOrScope: "Gênesis",
      title: "Título — Gênesis 1:1",
      driveFileId: "abc123",
      mimeType: "application/msword",
      preliminaryReference: "Gênesis 1:1",
      duplicateGroup: "",
      notes: "uma nota",
      sourceUrl: "https://drive.google.com/open?id=abc123",
    });
  });
});

describe("validateManifest", () => {
  function row(overrides: Partial<ManifestRow> = {}): ManifestRow {
    return {
      pilotId: "SEL-001",
      queue: "SELECIONADOS",
      sourcePath: "x",
      testament: "AT",
      bookOrScope: "Gênesis",
      title: "t",
      driveFileId: "id-1",
      mimeType: "application/msword",
      preliminaryReference: "",
      duplicateGroup: "",
      notes: "",
      sourceUrl: "",
      ...overrides,
    };
  }

  it("reporta erro quando o total não é 50", () => {
    const result = validateManifest([row()]);
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "TOTAL_INCORRETO")).toBe(true);
  });

  it("reporta erro quando pilot_id se repete", () => {
    const rows = [row({ pilotId: "SEL-001", driveFileId: "id-1" }), row({ pilotId: "SEL-001", driveFileId: "id-2" })];
    const result = validateManifest(rows);
    expect(result.issues.some((i) => i.code === "PILOT_ID_DUPLICADO" && i.pilotIds.includes("SEL-001"))).toBe(true);
  });

  it("reporta erro quando DUAS linhas já decididas (SELECIONADOS/REVISAR) compartilham drive_file_id — não há canônico único", () => {
    const rows = [row({ pilotId: "SEL-001", driveFileId: "same-id", queue: "SELECIONADOS" }), row({ pilotId: "SEL-002", driveFileId: "same-id", queue: "SELECIONADOS" })];
    const result = validateManifest(rows);
    const issue = result.issues.find((i) => i.code === "DRIVE_FILE_ID_DUPLICADO");
    expect(issue).toBeDefined();
    expect(issue?.pilotIds.sort()).toEqual(["SEL-001", "SEL-002"]);
    expect(result.aliases).toHaveLength(0);
  });

  it("reporta erro quando NENHUMA linha decidida compartilha o drive_file_id (só candidatos, sem canônico)", () => {
    const rows = [
      row({ pilotId: "DUP-001", driveFileId: "same-id", queue: "DUPLICADOS_POSSIVEIS", duplicateGroup: "G-1" }),
      row({ pilotId: "DUP-002", driveFileId: "same-id", queue: "DUPLICADOS_POSSIVEIS", duplicateGroup: "G-1" }),
    ];
    const result = validateManifest(rows);
    expect(result.issues.some((i) => i.code === "DRIVE_FILE_ID_DUPLICADO")).toBe(true);
    expect(result.aliases).toHaveLength(0);
  });

  it("reconhece o padrão canônico+alias (1 decidida + N candidatas com o mesmo drive_file_id) — NÃO é erro", () => {
    const rows = [
      row({ pilotId: "SEL-023", driveFileId: "same-id", queue: "SELECIONADOS" }),
      row({ pilotId: "DUP-010", driveFileId: "same-id", queue: "DUPLICADOS_POSSIVEIS", duplicateGroup: "ATO-EUTICO-01" }),
    ];
    const result = validateManifest(rows);
    expect(result.issues.some((i) => i.code === "DRIVE_FILE_ID_DUPLICADO")).toBe(false);
    expect(result.aliases).toEqual([{ canonicalPilotId: "SEL-023", aliasPilotId: "DUP-010", driveFileId: "same-id" }]);
    expect(result.physicalSourceCount).toBe(rows.length - 1);
  });

  it("não reporta erro de contagem quando as filas batem 37/1/12 e não há duplicidade", () => {
    const rows = [
      ...Array.from({ length: 37 }, (_, i) => row({ pilotId: `SEL-${i}`, driveFileId: `sel-${i}`, queue: "SELECIONADOS" })),
      row({ pilotId: "REV-001", driveFileId: "rev-1", queue: "REVISAR" }),
      ...Array.from({ length: 12 }, (_, i) =>
        row({ pilotId: `DUP-${i}`, driveFileId: `dup-${i}`, queue: "DUPLICADOS_POSSIVEIS", duplicateGroup: "G-1" }),
      ),
    ];
    const result = validateManifest(rows);
    expect(result.totalRows).toBe(50);
    expect(result.countsByQueue).toEqual({ SELECIONADOS: 37, REVISAR: 1, DUPLICADOS_POSSIVEIS: 12 });
    expect(result.issues.filter((i) => i.severity === "error")).toHaveLength(0);
    expect(result.ok).toBe(true);
  });
});

describe("loadManifest + validateManifest (manifesto REAL do piloto, docs/fase3-piloto/)", () => {
  it("carrega exatamente 50 candidatos do arquivo real", () => {
    const rows = loadManifest();
    expect(rows).toHaveLength(50);
  });

  it("as filas reais batem 37 selecionados / 1 revisar / 12 duplicados possíveis", () => {
    const result = validateManifest(loadManifest());
    expect(result.countsByQueue).toEqual({ SELECIONADOS: 37, REVISAR: 1, DUPLICADOS_POSSIVEIS: 12 });
  });

  it("SEL-023 e DUP-010 compartilham o mesmo drive_file_id ('Êutico - At20.7-11.doc') — reconhecido como " +
    "canônico (SEL-023, decidido) + alias de manifesto (DUP-010, candidato) — DECISÃO DO USUÁRIO, não mais erro", () => {
    const result = validateManifest(loadManifest());
    expect(result.issues.some((i) => i.code === "DRIVE_FILE_ID_DUPLICADO")).toBe(false);
    expect(result.aliases).toContainEqual({
      canonicalPilotId: "SEL-023",
      aliasPilotId: "DUP-010",
      driveFileId: "1rsLe_r5-m6lpRojhPLbwcbYVOFdPaMXg",
    });
    // 50 linhas de manifesto, mas só 49 fontes físicas distintas (DUP-010
    // é o mesmo arquivo de SEL-023, não um 50º arquivo).
    expect(result.totalRows).toBe(50);
    expect(result.physicalSourceCount).toBe(49);
    expect(result.ok).toBe(true);
  });

  it("rowsToIngest exclui DUP-010 (alias) do lote a ingerir, mas preserva a linha em `loadManifest()` " +
    "(nunca excluído silenciosamente do manifesto/relatório)", () => {
    const rows = loadManifest();
    const validation = validateManifest(rows);
    const toIngest = rowsToIngest(rows, validation);

    expect(rows.some((r) => r.pilotId === "DUP-010")).toBe(true); // continua no manifesto
    expect(toIngest.some((r) => r.pilotId === "DUP-010")).toBe(false); // mas não é ingerido
    expect(toIngest.some((r) => r.pilotId === "SEL-023")).toBe(true); // o canônico é ingerido normalmente
    expect(toIngest).toHaveLength(49);
  });
});
