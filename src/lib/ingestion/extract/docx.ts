import mammoth from "mammoth";
import type { ExtractionOutcome } from "@/lib/ingestion/extract/types";

/** DOCX (OOXML) — `application/vnd.openxmlformats-officedocument.wordprocessingml.document`. */
export async function extractDocx(buffer: Buffer): Promise<ExtractionOutcome> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    const texto = result.value.trim();
    if (!texto) {
      return { status: "falha", motivo: "DOCX extraído com sucesso pelo parser, mas sem nenhum texto no corpo do documento." };
    }
    return { status: "sucesso", texto, avisos: result.messages.map((m) => m.message) };
  } catch (error) {
    return { status: "falha", motivo: `Erro ao extrair DOCX: ${(error as Error).message}` };
  }
}
