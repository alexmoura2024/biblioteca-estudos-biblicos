/**
 * EXTRACTION ENGINE V2 — Orquestrador com adapters + fallbacks
 * Determinístico, sem LLM, com detecção real de formato
 */

import * as fs from "fs";
import * as crypto from "crypto";
import { detectFormat, DetectedFormat } from "./detector";
import {
  extractDocx,
  extractRtf,
  extractTxt,
  extractPdf,
  extractDocOle,
  ExtractionResult,
} from "./extractors";

export interface ExtractionReport {
  sourceId: string;
  fileName: string;
  filePath: string;
  sha256: string;
  fileSizeBytes: number;
  declaredExtension: string;
  detectedFormat: DetectedFormat;
  status: "SUCCESS" | "HOLD_EXTRACTION_ERROR" | "HOLD_EMPTY" | "HOLD_UNSUPPORTED";
  extractionMethod: string;
  fallbackUsed: boolean;
  textContent: string;
  textCharacterCount: number;
  warnings: string[];
  confidence: "CERTAIN" | "LIKELY" | "FALLBACK";
  processingTimeMs: number;
}

/**
 * Computar SHA-256 de arquivo
 */
async function computeSha256(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}

/**
 * Processar arquivo com chain de adapters + fallbacks
 */
export async function extractFile(filePath: string): Promise<ExtractionReport> {
  const startTime = Date.now();
  const fileName = filePath.split("\\").pop() || filePath;
  const stat = fs.statSync(filePath);

  try {
    const sha256 = await computeSha256(filePath);
    const sourceId = sha256.substring(0, 16);
    const buffer = fs.readFileSync(filePath);
    const detection = detectFormat(filePath, buffer);

    let result: ExtractionResult | null = null;
    let fallbackUsed = false;

    // Chain de tentativas
    switch (detection.detectedFormat) {
      case "DOCX":
        result = await extractDocx(filePath);
        break;

      case "RTF":
        result = extractRtf(filePath);
        break;

      case "TXT":
        result = extractTxt(filePath);
        break;

      case "PDF":
        result = await extractPdf(filePath);
        break;

      case "DOC_OLE":
        result = extractDocOle(filePath);
        fallbackUsed = true;
        break;

      case "UNKNOWN":
        result = {
          status: "HOLD_UNSUPPORTED",
          content: "",
          extractionMethod: "UNKNOWN_FORMAT",
          confidence: "FALLBACK",
          warnings: [`Formato não identificado: ${detection.magicBytes || "sem magic bytes"}`],
          characterCount: 0,
        };
        fallbackUsed = true;
        break;
    }

    // Fallback: se extração falhou e é texto, tentar como TXT
    if (
      result.status === "HOLD_EXTRACTION_ERROR" &&
      detection.detectedFormat !== "TXT"
    ) {
      try {
        const txtResult = extractTxt(filePath);
        if (txtResult.status === "SUCCESS") {
          result = txtResult;
          result.extractionMethod = `${result.extractionMethod}_FALLBACK_TXT`;
          fallbackUsed = true;
        }
      } catch {
        // continue com resultado anterior
      }
    }

    return {
      sourceId,
      fileName,
      filePath,
      sha256,
      fileSizeBytes: stat.size,
      declaredExtension: detection.declaredExtension,
      detectedFormat: detection.detectedFormat,
      status: result.status,
      extractionMethod: result.extractionMethod,
      fallbackUsed,
      textContent: result.content,
      textCharacterCount: result.characterCount,
      warnings: [detection.reason, ...result.warnings],
      confidence: detection.confidence,
      processingTimeMs: Date.now() - startTime,
    };
  } catch (err) {
    const sha256 = await computeSha256(filePath);
    return {
      sourceId: "ERROR_" + fileName.substring(0, 12),
      fileName,
      filePath,
      sha256,
      fileSizeBytes: stat.size,
      declaredExtension: "unknown",
      detectedFormat: "UNKNOWN",
      status: "HOLD_EXTRACTION_ERROR",
      extractionMethod: "ERROR_UNHANDLED",
      fallbackUsed: false,
      textContent: "",
      textCharacterCount: 0,
      warnings: [
        `Erro não tratado: ${err instanceof Error ? err.message : "unknown"}`,
      ],
      confidence: "FALLBACK",
      processingTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Processar múltiplos arquivos
 */
export async function extractBatch(filePaths: string[]): Promise<ExtractionReport[]> {
  const reports: ExtractionReport[] = [];

  for (const filePath of filePaths) {
    const report = await extractFile(filePath);
    reports.push(report);
  }

  return reports;
}
