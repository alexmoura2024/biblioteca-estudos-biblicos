import { describe, expect, it } from "vitest";
import { diagnoseDuplicates } from "@/lib/ingestion/duplicates";
import { loadManifest } from "@/lib/ingestion/manifest";
import type { ManifestRow } from "@/lib/ingestion/manifest";

function row(overrides: Partial<ManifestRow>): ManifestRow {
  return {
    pilotId: "X",
    queue: "DUPLICADOS_POSSIVEIS",
    sourcePath: "",
    testament: "AT",
    bookOrScope: "",
    title: "",
    driveFileId: "",
    mimeType: "application/msword",
    preliminaryReference: "",
    duplicateGroup: "",
    notes: "",
    sourceUrl: "",
    ...overrides,
  };
}

describe("diagnoseDuplicates", () => {
  it("nunca funde/exclui — só classifica pares; ignora linhas sem duplicate_group", () => {
    const rows = [row({ pilotId: "SEL-001", duplicateGroup: "" }), row({ pilotId: "SEL-002", duplicateGroup: "" })];
    expect(diagnoseDuplicates(rows)).toEqual([]);
  });

  it("classifica DUPLICATE_EXACT quando o drive_file_id é literalmente o mesmo", () => {
    const rows = [
      row({ pilotId: "A", driveFileId: "same-id", duplicateGroup: "G-1" }),
      row({ pilotId: "B", driveFileId: "same-id", duplicateGroup: "G-1" }),
    ];
    const [diag] = diagnoseDuplicates(rows);
    expect(diag.classification).toBe("DUPLICATE_EXACT");
  });

  it("sem conteúdo/hash disponível, nunca eleva a DUPLICATE_EXACT só por título/referência iguais — fica POSSIBLE_DUPLICATE", () => {
    const rows = [
      row({ pilotId: "A", driveFileId: "id-a", title: "Êxodo 12:1–11 — Páscoa.doc", preliminaryReference: "Êxodo 12:1–11", duplicateGroup: "EXO-PASCOA-01" }),
      row({ pilotId: "B", driveFileId: "id-b", title: "Êxodo 12:1–11 — Páscoa.doc", preliminaryReference: "Êxodo 12:1–11", duplicateGroup: "EXO-PASCOA-01" }),
    ];
    const [diag] = diagnoseDuplicates(rows);
    expect(diag.classification).toBe("POSSIBLE_DUPLICATE");
  });

  it("eleva a DUPLICATE_EXACT quando o hash do conteúdo extraído é idêntico", () => {
    const rows = [
      row({ pilotId: "A", driveFileId: "id-a", duplicateGroup: "G-1" }),
      row({ pilotId: "B", driveFileId: "id-b", duplicateGroup: "G-1" }),
    ];
    const signals = new Map([
      ["A", { hashConteudo: "hash-1" }],
      ["B", { hashConteudo: "hash-1" }],
    ]);
    const [diag] = diagnoseDuplicates(rows, signals);
    expect(diag.classification).toBe("DUPLICATE_EXACT");
  });

  it("hashes diferentes (versões revisadas) ficam POSSIBLE_DUPLICATE, nunca DISTINCT automaticamente", () => {
    const rows = [
      row({ pilotId: "A", driveFileId: "id-a", duplicateGroup: "G-1" }),
      row({ pilotId: "B", driveFileId: "id-b", duplicateGroup: "G-1" }),
    ];
    const signals = new Map([
      ["A", { hashConteudo: "hash-1" }],
      ["B", { hashConteudo: "hash-2" }],
    ]);
    const [diag] = diagnoseDuplicates(rows, signals);
    expect(diag.classification).toBe("POSSIBLE_DUPLICATE");
  });
});

describe("diagnoseDuplicates — os 12 candidatos REAIS do manifesto (docs/fase3-piloto/)", () => {
  it("produz exatamente 6 pares (6 grupos de 2), todos POSSIBLE_DUPLICATE (sem conteúdo extraído ainda)", () => {
    const manifest = loadManifest();
    const dupRows = manifest.filter((r) => r.queue === "DUPLICADOS_POSSIVEIS");
    expect(dupRows).toHaveLength(12);

    const diagnoses = diagnoseDuplicates(dupRows);
    expect(diagnoses).toHaveLength(6);

    const groups = new Set(diagnoses.map((d) => d.duplicateGroup));
    expect(groups).toEqual(
      new Set(["EXO-PASCOA-01", "JUI-TORRE-01", "JUI-GIDEAO-01", "LUC-PROXIMO-01", "ATO-EUTICO-01", "ROM-MILENIO-01"]),
    );
    // Nenhum drive_file_id se repete DENTRO dos 12 duplicados possíveis
    // (a repetição real do manifesto é entre SEL-023 e DUP-010, fora
    // deste grupo — coberto por manifest.test.ts) — logo nenhum destes
    // 6 pares deveria ser DUPLICATE_EXACT sem conteúdo comparado.
    expect(diagnoses.every((d) => d.classification === "POSSIBLE_DUPLICATE")).toBe(true);
  });
});
