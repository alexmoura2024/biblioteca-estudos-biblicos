/**
 * FORMAT DETECTOR — Detectar formato REAL de arquivo
 * Não confiar em extensão
 *
 * Magic bytes:
 * - DOCX: PK\x03\x04 (ZIP header)
 * - RTF: {\rtf
 * - DOC OLE: \xD0\xCF\x11\xE0 (OLE Compound Document)
 * - PDF: %PDF
 * - TXT: texto plano
 */

export type DetectedFormat =
  | "DOCX"
  | "DOC_OLE"
  | "RTF"
  | "TXT"
  | "PDF"
  | "UNKNOWN";

export interface FormatDetectionResult {
  declaredExtension: string;
  detectedFormat: DetectedFormat;
  confidence: "CERTAIN" | "LIKELY" | "FALLBACK";
  magicBytes?: string;
  reason: string;
}

/**
 * Detectar formato real analisando magic bytes
 */
export function detectFormatReal(buffer: Buffer): FormatDetectionResult {
  const ext = ".unknown";
  const magic = buffer.subarray(0, 8).toString("hex");

  // ZIP (DOCX)
  if (buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) {
    return {
      declaredExtension: ext,
      detectedFormat: "DOCX",
      confidence: "CERTAIN",
      magicBytes: "504b0304",
      reason: "ZIP header detected — DOCX format",
    };
  }

  // OLE Compound Document (DOC, XLS antigo)
  if (
    buffer[0] === 0xd0 &&
    buffer[1] === 0xcf &&
    buffer[2] === 0x11 &&
    buffer[3] === 0xe0
  ) {
    return {
      declaredExtension: ext,
      detectedFormat: "DOC_OLE",
      confidence: "CERTAIN",
      magicBytes: "d0cf11e0",
      reason: "OLE Compound Document header — legacy DOC/Word format",
    };
  }

  // RTF
  if (
    buffer[0] === 0x7b &&
    buffer[1] === 0x5c &&
    buffer[2] === 0x72 &&
    buffer[3] === 0x74
  ) {
    // {\rt
    return {
      declaredExtension: ext,
      detectedFormat: "RTF",
      confidence: "CERTAIN",
      magicBytes: "7c5c7274",
      reason: "RTF header detected ({\\rtf)",
    };
  }

  // PDF
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    // %PDF
    return {
      declaredExtension: ext,
      detectedFormat: "PDF",
      confidence: "CERTAIN",
      magicBytes: "25504446",
      reason: "PDF header detected (%PDF)",
    };
  }

  // Text plano (UTF-8 ou ASCII)
  try {
    const text = buffer.toString("utf-8", 0, Math.min(512, buffer.length));
    if (/^[\x20-\x7e\n\r\t]*$/.test(text)) {
      return {
        declaredExtension: ext,
        detectedFormat: "TXT",
        confidence: "LIKELY",
        reason: "Conteúdo ASCII/UTF-8 — texto plano",
      };
    }
  } catch {
    // continue
  }

  // Fallback: texto UTF-8 válido
  try {
    const text = buffer.toString("utf-8");
    if (text.length > 10) {
      return {
        declaredExtension: ext,
        detectedFormat: "TXT",
        confidence: "FALLBACK",
        reason: "Interpretado como texto UTF-8",
      };
    }
  } catch {
    // continue
  }

  return {
    declaredExtension: ext,
    detectedFormat: "UNKNOWN",
    confidence: "FALLBACK",
    magicBytes: magic,
    reason: `Nenhum formato identificado. Magic bytes: ${magic}`,
  };
}

/**
 * Detectar formato combinando extensão declarada + magic bytes
 */
export function detectFormat(filePath: string, buffer: Buffer): FormatDetectionResult {
  const ext = filePath.split(".").pop()?.toLowerCase() || "";
  const realDetection = detectFormatReal(buffer);

  // Se extensão e magic bytes concordam, alta confiança
  if (
    (ext === "docx" && realDetection.detectedFormat === "DOCX") ||
    (ext === "rtf" && realDetection.detectedFormat === "RTF") ||
    (ext === "pdf" && realDetection.detectedFormat === "PDF") ||
    (ext === "txt" && realDetection.detectedFormat === "TXT") ||
    (ext === "doc" && realDetection.detectedFormat === "DOC_OLE")
  ) {
    return {
      ...realDetection,
      declaredExtension: `.${ext}`,
      confidence: "CERTAIN",
    };
  }

  // Caso CRÍTICO: .doc mas RTF (GEN-041)
  if (ext === "doc" && realDetection.detectedFormat === "RTF") {
    return {
      ...realDetection,
      declaredExtension: `.${ext}`,
      confidence: "CERTAIN",
      reason: "Arquivo .doc contém RTF — formato legado mascarado",
    };
  }

  // Caso CRÍTICO: .doc mas DOCX
  if (ext === "doc" && realDetection.detectedFormat === "DOCX") {
    return {
      ...realDetection,
      declaredExtension: `.${ext}`,
      confidence: "CERTAIN",
      reason: "Arquivo .doc contém DOCX — formato moderno com extensão legada",
    };
  }

  // Conflito: extensão não corresponde a formato real
  if (
    ext &&
    realDetection.detectedFormat !== "UNKNOWN" &&
    realDetection.detectedFormat !== "TXT"
  ) {
    return {
      ...realDetection,
      declaredExtension: `.${ext}`,
      confidence: "LIKELY",
      reason: `Conflito: extensão .${ext} mas conteúdo é ${realDetection.detectedFormat}`,
    };
  }

  // Fallback: confiar na extensão se presente
  if (ext === "docx") {
    return {
      declaredExtension: ".docx",
      detectedFormat: "DOCX",
      confidence: "FALLBACK",
      reason: "Assumindo DOCX pela extensão (magic bytes inconclusivos)",
    };
  }

  if (ext === "rtf") {
    return {
      declaredExtension: ".rtf",
      detectedFormat: "RTF",
      confidence: "FALLBACK",
      reason: "Assumindo RTF pela extensão (magic bytes inconclusivos)",
    };
  }

  if (ext === "doc") {
    return {
      declaredExtension: ".doc",
      detectedFormat: "DOC_OLE",
      confidence: "FALLBACK",
      reason: "Assumindo DOC OLE pela extensão (magic bytes inconclusivos)",
    };
  }

  return {
    declaredExtension: `.${ext}`,
    ...realDetection,
  };
}
