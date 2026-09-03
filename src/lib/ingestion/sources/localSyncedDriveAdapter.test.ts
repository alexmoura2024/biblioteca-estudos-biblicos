import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LocalSyncedDriveSourceAdapter } from "@/lib/ingestion/sources/localSyncedDriveAdapter";
import type { ManifestRow } from "@/lib/ingestion/manifest";

/**
 * Testes com diretórios/arquivos REAIS (não mocka `node:fs`) — criados
 * num diretório temporário e apagados ao final de cada teste. Prova a
 * lógica de resolução das 3 prioridades (checkpoint 13) sem depender do
 * Drive sincronizado real (`G:\...`), que não existe fora desta máquina.
 */

function row(overrides: Partial<ManifestRow>): ManifestRow {
  return {
    pilotId: "SEL-001",
    queue: "SELECIONADOS",
    sourcePath: "01 - Antigo Testamento / 02 - Êxodo",
    testament: "AT",
    bookOrScope: "Êxodo",
    title: "Estudo.doc",
    driveFileId: "drive-1",
    mimeType: "application/msword",
    preliminaryReference: "",
    duplicateGroup: "",
    notes: "",
    sourceUrl: "https://drive.google.com/open?id=drive-1",
    ...overrides,
  };
}

describe("LocalSyncedDriveSourceAdapter", () => {
  let root: string;
  let acervoRoot: string;
  let exportsDir: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "fase3-adapter-"));
    acervoRoot = join(root, "acervo");
    exportsDir = join(root, "exports");
    mkdirSync(acervoRoot, { recursive: true });
    mkdirSync(exportsDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("Prioridade 1: resolve por cópia técnica com o pilot_id como prefixo, detectando o MIME pela extensão real", async () => {
    writeFileSync(join(exportsDir, "SEL-001__Estudo.doc"), "conteudo doc legado");
    const manifestRow = row({ mimeType: "application/msword" });
    const adapter = new LocalSyncedDriveSourceAdapter({ acervoRoot, exportsDir, manifestRows: [manifestRow] });

    const file = await adapter.fetchFile("drive-1");
    expect(file.mimeType).toBe("application/msword");
    expect(file.buffer.toString()).toBe("conteudo doc legado");
    // Cópia técnica nunca é tratada como proveniência de data/tamanho do original.
    expect(file.modifiedTime).toBeUndefined();
    expect(file.tamanhoBytes).toBeUndefined();
  });

  it("Prioridade 1 detecta a extensão real da cópia técnica, mesmo quando difere do mime_type do manifesto (ex.: PDF)", async () => {
    writeFileSync(join(exportsDir, "DUP-003__A_Torre_Forte.pdf"), "conteudo pdf");
    const manifestRow = row({ pilotId: "DUP-003", driveFileId: "drive-dup3", mimeType: "application/pdf" });
    const adapter = new LocalSyncedDriveSourceAdapter({ acervoRoot, exportsDir, manifestRows: [manifestRow] });

    const file = await adapter.fetchFile("drive-dup3");
    expect(file.mimeType).toBe("application/pdf");
  });

  it("Prioridade 1 ambígua (2+ cópias técnicas para o mesmo pilot_id) é erro claro, nunca adivinha", async () => {
    writeFileSync(join(exportsDir, "SEL-001__A.doc"), "a");
    writeFileSync(join(exportsDir, "SEL-001__B.doc"), "b");
    const adapter = new LocalSyncedDriveSourceAdapter({ acervoRoot, exportsDir, manifestRows: [row({})] });

    await expect(adapter.fetchFile("drive-1")).rejects.toThrow(/ambíguas/);
  });

  it("Google Doc nativo sem cópia técnica falha direto — nunca cai para Prioridade 2/3 (não tem bytes próprios)", async () => {
    const manifestRow = row({ mimeType: "application/vnd.google-apps.document" });
    // Cria um arquivo físico com o título exato no acervo — não deve ser usado.
    mkdirSync(join(acervoRoot, manifestRow.sourcePath), { recursive: true });
    writeFileSync(join(acervoRoot, manifestRow.sourcePath, manifestRow.title), "não deveria ser lido");
    const adapter = new LocalSyncedDriveSourceAdapter({ acervoRoot, exportsDir, manifestRows: [manifestRow] });

    await expect(adapter.fetchFile("drive-1")).rejects.toThrow(/Google Doc nativo/);
  });

  it("Prioridade 2: sem cópia técnica, resolve por acervoRoot+source_path+title — modifiedTime/tamanhoBytes SÃO preenchidos (é o original de verdade)", async () => {
    const manifestRow = row({});
    mkdirSync(join(acervoRoot, manifestRow.sourcePath), { recursive: true });
    writeFileSync(join(acervoRoot, manifestRow.sourcePath, manifestRow.title), "conteudo original");
    const adapter = new LocalSyncedDriveSourceAdapter({ acervoRoot, exportsDir, manifestRows: [manifestRow] });

    const file = await adapter.fetchFile("drive-1");
    expect(file.buffer.toString()).toBe("conteudo original");
    expect(file.modifiedTime).toBeDefined();
    expect(file.tamanhoBytes).toBeGreaterThan(0);
  });

  it("Prioridade 3: sem cópia técnica e sem o caminho exato, cai para busca recursiva pelo nome exato", async () => {
    const manifestRow = row({ sourcePath: "pasta/errada/no/manifesto" });
    mkdirSync(join(acervoRoot, "outra", "subpasta"), { recursive: true });
    writeFileSync(join(acervoRoot, "outra", "subpasta", manifestRow.title), "achado por busca recursiva");
    const adapter = new LocalSyncedDriveSourceAdapter({ acervoRoot, exportsDir, manifestRows: [manifestRow] });

    const file = await adapter.fetchFile("drive-1");
    expect(file.buffer.toString()).toBe("achado por busca recursiva");
  });

  it("zero correspondências (nem cópia técnica, nem caminho exato, nem busca recursiva) é erro claro, nunca inventa", async () => {
    const adapter = new LocalSyncedDriveSourceAdapter({ acervoRoot, exportsDir, manifestRows: [row({})] });
    await expect(adapter.fetchFile("drive-1")).rejects.toThrow(/não encontrado/);
  });
});
