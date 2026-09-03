import { describe, expect, it, vi } from "vitest";
import { diagnoseInvalidMagicNumber, extractLegacyDoc } from "@/lib/ingestion/extract/legacyDoc";

describe("extractLegacyDoc", () => {
  it("devolve falha (não lança) para bytes que não são um DOC/OLE de verdade", async () => {
    const result = await extractLegacyDoc(Buffer.from("isto não é um Composite Document File"));
    expect(result.status).toBe("falha");
  });
});

describe("diagnoseInvalidMagicNumber (Fase 3.1, checkpoint 14 — achado real DUP-002, DEC-040)", () => {
  it("traduz a assinatura FIB 0xA5DC (Word 6.0/95) num diagnóstico legível, sem inventar conteúdo", () => {
    // Mensagem exata que `word-extractor` lança (node_modules/word-extractor/
    // lib/word-ole-extractor.js) quando o FIB da stream WordDocument não é
    // 0xA5EC — este é o achado real do DUP-002 ("Invalid magic number: a5dc").
    const diagnosis = diagnoseInvalidMagicNumber("Invalid magic number: a5dc");
    expect(diagnosis).toBeDefined();
    expect(diagnosis).toContain("Word 6.0/95");
    expect(diagnosis).toContain("Composite Document File (OLE/CFB) genuíno");
    // Nunca deve sugerir que o texto foi recuperado — só diagnosticado.
    expect(diagnosis).not.toContain("texto extraído");
  });

  it("uma assinatura desconhecida (nem 0xA5EC nem 0xA5DC) não tenta adivinhar um formato — devolve undefined, mantendo a mensagem crua original", () => {
    expect(diagnoseInvalidMagicNumber("Invalid magic number: 1234")).toBeUndefined();
  });

  it("uma mensagem de erro totalmente diferente (não é sobre magic number) não é confundida com este diagnóstico", () => {
    expect(diagnoseInvalidMagicNumber("ENOENT: no such file or directory")).toBeUndefined();
  });

  it("extractLegacyDoc encaminha o diagnóstico legível quando word-extractor rejeita com a assinatura antiga conhecida (DUP-002)", async () => {
    vi.doMock("word-extractor", () => ({
      default: class {
        extract() {
          return Promise.reject(new Error("This does not seem to be a Word document: Invalid magic number: a5dc"));
        }
      },
    }));
    vi.resetModules();
    const { extractLegacyDoc: extractLegacyDocMocked } = await import("@/lib/ingestion/extract/legacyDoc");

    const result = await extractLegacyDocMocked(Buffer.from("conteúdo irrelevante para este teste — o mock decide o resultado"));
    expect(result.status).toBe("falha");
    if (result.status === "falha") {
      expect(result.motivo).toContain("Word 6.0/95");
      expect(result.motivo).toContain("não corrigido automaticamente");
    }

    vi.doUnmock("word-extractor");
    vi.resetModules();
  });
});
