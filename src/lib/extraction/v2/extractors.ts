/**
 * EXTRACTORS — Adapters para extrair texto de cada formato
 * Cada adapter retorna texto FIEL ao original, sem edição
 */

import { readFileSync } from "fs";

export interface ExtractionResult {
  status: "SUCCESS" | "HOLD_EXTRACTION_ERROR" | "HOLD_EMPTY";
  content: string;
  extractionMethod: string;
  confidence: "CERTAIN" | "LIKELY" | "FALLBACK";
  warnings: string[];
  characterCount: number;
}

/**
 * Extrair DOCX usando Mammoth
 * Preserva parágrafos, listas, etc.
 */
export async function extractDocx(filePath: string): Promise<ExtractionResult> {
  try {
    const mammoth = require("mammoth");

    const result = await mammoth.extractRawText({
      path: filePath,
    });

    const content = result.value || "";

    if (content.length < 50) {
      return {
        status: "HOLD_EMPTY",
        content,
        extractionMethod: "MAMMOTH_DOCX",
        confidence: "CERTAIN",
        warnings: [`Conteúdo muito curto (${content.length} chars)`],
        characterCount: content.length,
      };
    }

    const warnings: string[] = [];
    if (result.messages && result.messages.length > 0) {
      warnings.push(`Mammoth reportou ${result.messages.length} mensagens`);
    }

    return {
      status: "SUCCESS",
      content: normalizeWhitespace(content),
      extractionMethod: "MAMMOTH_DOCX",
      confidence: "CERTAIN",
      warnings,
      characterCount: content.length,
    };
  } catch (err) {
    return {
      status: "HOLD_EXTRACTION_ERROR",
      content: "",
      extractionMethod: "MAMMOTH_DOCX",
      confidence: "CERTAIN",
      warnings: [
        `Extração Mammoth falhou: ${err instanceof Error ? err.message : "unknown"}`,
      ],
      characterCount: 0,
    };
  }
}

/**
 * Extrair RTF usando regex simples
 * Remove comandos RTF, preserva texto
 */
export function extractRtf(filePath: string): ExtractionResult {
  try {
    const buffer = readFileSync(filePath);
    const rtf = buffer.toString("utf-8", 0, Math.min(buffer.length, 1_000_000));

    // Remover comandos RTF: \comando{...}
    let text = rtf.replace(/\\[a-z]+\d*\s?/gi, " ");
    // Remover chaves de controle
    text = text.replace(/[{}]/g, "");
    // Remover linhas de junk
    text = text.replace(/\\[*'?]/g, "");
    // Normalizar espaços
    text = normalizeWhitespace(text);

    if (text.length < 50) {
      return {
        status: "HOLD_EMPTY",
        content: text,
        extractionMethod: "REGEX_RTF",
        confidence: "LIKELY",
        warnings: [`Conteúdo muito curto após extração (${text.length} chars)`],
        characterCount: text.length,
      };
    }

    return {
      status: "SUCCESS",
      content: text,
      extractionMethod: "REGEX_RTF",
      confidence: "LIKELY",
      warnings: ["Extração com regex — formatação pode estar parcialmente perdida"],
      characterCount: text.length,
    };
  } catch (err) {
    return {
      status: "HOLD_EXTRACTION_ERROR",
      content: "",
      extractionMethod: "REGEX_RTF",
      confidence: "LIKELY",
      warnings: [`RTF extraction falhou: ${err instanceof Error ? err.message : "unknown"}`],
      characterCount: 0,
    };
  }
}

/**
 * Extrair TXT com detecção segura de encoding
 */
export function extractTxt(filePath: string): ExtractionResult {
  try {
    const buffer = readFileSync(filePath);

    // Tentar UTF-8 primeiro
    let text = buffer.toString("utf-8");

    // Validar UTF-8
    try {
      Buffer.from(text, "utf-8");
    } catch {
      // Fallback para latin1
      text = buffer.toString("latin1");
    }

    // Normalizar
    text = normalizeWhitespace(text);

    if (text.length < 50) {
      return {
        status: "HOLD_EMPTY",
        content: text,
        extractionMethod: "NATIVE_TXT",
        confidence: "CERTAIN",
        warnings: [`Arquivo muito curto (${text.length} chars)`],
        characterCount: text.length,
      };
    }

    return {
      status: "SUCCESS",
      content: text,
      extractionMethod: "NATIVE_TXT",
      confidence: "CERTAIN",
      warnings: [],
      characterCount: text.length,
    };
  } catch (err) {
    return {
      status: "HOLD_EXTRACTION_ERROR",
      content: "",
      extractionMethod: "NATIVE_TXT",
      confidence: "CERTAIN",
      warnings: [`TXT extraction falhou: ${err instanceof Error ? err.message : "unknown"}`],
      characterCount: 0,
    };
  }
}

/**
 * Extrair PDF usando pdf-parse
 * Apenas texto nativo, sem OCR
 */
export async function extractPdf(filePath: string): Promise<ExtractionResult> {
  try {
    const fs = require("fs");
    const pdfParse = require("pdf-parse");

    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);

    const content = data.text || "";

    if (content.length < 50) {
      return {
        status: "HOLD_EMPTY",
        content,
        extractionMethod: "PDF_PARSE",
        confidence: "CERTAIN",
        warnings: [`Conteúdo muito curto (${content.length} chars)`],
        characterCount: content.length,
      };
    }

    return {
      status: "SUCCESS",
      content: normalizeWhitespace(content),
      extractionMethod: "PDF_PARSE",
      confidence: "CERTAIN",
      warnings: ["Extração de texto nativo — sem OCR"],
      characterCount: content.length,
    };
  } catch (err) {
    return {
      status: "HOLD_EXTRACTION_ERROR",
      content: "",
      extractionMethod: "PDF_PARSE",
      confidence: "CERTAIN",
      warnings: [
        `PDF extraction falhou: ${err instanceof Error ? err.message : "unknown"}`,
      ],
      characterCount: 0,
    };
  }
}

/**
 * Extrair DOC OLE — não suportado nesta fase
 * Fallback: HOLD com aviso
 */
export function extractDocOle(filePath: string): ExtractionResult {
  return {
    status: "HOLD_EXTRACTION_ERROR",
    content: "",
    extractionMethod: "DOC_OLE_UNSUPPORTED",
    confidence: "CERTAIN",
    warnings: [
      "DOC OLE (legado) requer LibreOffice fallback ou conversão externa",
      "Próximas fases podem usar `libreoffice --headless --convert-to docx`",
    ],
    characterCount: 0,
  };
}

/**
 * Normalizar espaços e quebras de linha
 */
function normalizeWhitespace(text: string): string {
  return (
    text
      // Windows → Unix
      .replace(/\r\n/g, "\n")
      // Old Mac
      .replace(/\r/g, "\n")
      // Múltiplas quebras → máximo 2
      .replace(/\n{3,}/g, "\n\n")
      // Espaços em branco no final de linha
      .split("\n")
      .map((line) => line.replace(/\s+$/, ""))
      .join("\n")
      // Trim geral
      .trim()
  );
}
