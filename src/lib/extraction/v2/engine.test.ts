/**
 * TESTS — Extraction Engine V2
 * Validar cada adapter e cadeia de fallbacks
 */

import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { detectFormat } from "./detector";
import { extractFile } from "./engine";

describe("Extraction Engine V2", () => {
  describe("Format Detection", () => {
    it("detectar DOCX pelo magic bytes ZIP", () => {
      // Criar buffer DOCX fake (começa com PK\x03\x04)
      const buffer = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]);
      const result = detectFormat("test.docx", buffer);

      expect(result.detectedFormat).toBe("DOCX");
      expect(result.confidence).toBe("CERTAIN");
      expect(result.magicBytes).toBe("504b0304");
    });

    it("detectar RTF pelo header {\\rtf", () => {
      const buffer = Buffer.from("{\\rtf1");
      const result = detectFormat("test.rtf", buffer);

      expect(result.detectedFormat).toBe("RTF");
      expect(result.confidence).toBe("CERTAIN");
    });

    it("detectar DOC OLE pelo magic bytes", () => {
      // D0CF11E0 = OLE Compound Document
      const buffer = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0x00, 0x00]);
      const result = detectFormat("test.doc", buffer);

      expect(result.detectedFormat).toBe("DOC_OLE");
      expect(result.confidence).toBe("CERTAIN");
    });

    it("detectar PDF pelo header %PDF", () => {
      const buffer = Buffer.from("%PDF-1.4");
      const result = detectFormat("test.pdf", buffer);

      expect(result.detectedFormat).toBe("PDF");
      expect(result.confidence).toBe("CERTAIN");
    });

    it("detectar TXT como fallback para texto ASCII", () => {
      const buffer = Buffer.from("Hello, world!\nThis is plain text.");
      const result = detectFormat("test.txt", buffer);

      expect(result.detectedFormat).toBe("TXT");
    });

    it("CASO CRÍTICO: RTF mascarado como .doc (GEN-041)", () => {
      const buffer = Buffer.from("{\\rtf1\\ansi\\deff0");
      const result = detectFormat("gn-37.doc", buffer);

      expect(result.detectedFormat).toBe("RTF");
      expect(result.declaredExtension).toBe(".doc");
      expect(result.reason).toContain("formato legado mascarado");
    });
  });

  describe("Text Extraction", () => {
    it("extrair arquivo TXT simples", async () => {
      // Criar arquivo TXT temporário
      const tmpFile = path.join(process.cwd(), "test-simple.txt");
      const content = "Hello, world!\nThis is a test file with enough content to pass the 50 character minimum.";
      fs.writeFileSync(tmpFile, content);

      try {
        const report = await extractFile(tmpFile);

        expect(report.status).toBe("SUCCESS");
        expect(report.detectedFormat).toBe("TXT");
        expect(report.textContent).toContain("Hello");
        expect(report.textCharacterCount).toBeGreaterThan(50);
      } finally {
        if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
      }
    });

    it("rejeitar arquivo muito pequeno", async () => {
      const tmpFile = path.join(process.cwd(), "test-tiny.txt");
      fs.writeFileSync(tmpFile, "x");

      try {
        const report = await extractFile(tmpFile);

        expect(report.status).toBe("HOLD_EMPTY");
        expect(report.textCharacterCount).toBeLessThan(50);
      } finally {
        if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
      }
    });

    it("normalizar quebras de linha Windows → Unix", async () => {
      const tmpFile = path.join(process.cwd(), "test-crlf.txt");
      // Escrever com CRLF
      fs.writeFileSync(tmpFile, "Line 1\r\nLine 2\r\nLine 3\r\n", "utf-8");

      try {
        const report = await extractFile(tmpFile);

        expect(report.textContent).not.toContain("\r");
        expect(report.textContent).toContain("\n");
      } finally {
        if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
      }
    });

    it("computar SHA-256", async () => {
      const tmpFile = path.join(process.cwd(), "test-sha.txt");
      fs.writeFileSync(tmpFile, "test content", "utf-8");

      try {
        const report = await extractFile(tmpFile);

        expect(report.sha256).toHaveLength(64); // SHA-256 hex = 64 chars
        expect(report.sha256).toMatch(/^[a-f0-9]{64}$/);
      } finally {
        if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
      }
    });
  });

  describe("Error Handling", () => {
    it("lidar com arquivo não existente", async () => {
      const report = await extractFile("/nonexistent/file.txt");

      expect(report.status).toBe("HOLD_EXTRACTION_ERROR");
      expect(report.extractionMethod).toBe("ERROR_UNHANDLED");
    });

    it("lidar com arquivo binário desconhecido", async () => {
      const tmpFile = path.join(process.cwd(), "test-binary.bin");
      // Escrever bytes aleatórios
      fs.writeFileSync(tmpFile, Buffer.from([0xff, 0xfe, 0xfd, 0xfc, 0xfb]));

      try {
        const report = await extractFile(tmpFile);

        expect([
          "HOLD_EXTRACTION_ERROR",
          "HOLD_UNSUPPORTED",
        ]).toContain(report.status);
      } finally {
        if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
      }
    });
  });
});
