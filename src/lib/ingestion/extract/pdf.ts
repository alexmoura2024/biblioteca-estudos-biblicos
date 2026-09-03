import { PDFParse } from "pdf-parse";
import type { ExtractionOutcome } from "@/lib/ingestion/extract/types";

/**
 * PDF com texto (não digitalizado/imagem) — `application/pdf`. Um PDF só
 * de imagens escaneadas não tem texto para `getText()` extrair; isso
 * resulta em `falha`, nunca em OCR (fora de escopo desta fase — ver
 * docs/fase3-piloto/CLAUDE_FASE3_EXECUCAO_PILOTO.md, Etapa 5).
 */
export async function extractPdf(buffer: Buffer): Promise<ExtractionOutcome> {
  let parser: PDFParse | undefined;
  try {
    parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    const texto = result.text.trim();
    if (!texto) {
      return {
        status: "falha",
        motivo: "PDF extraído sem nenhum texto — possivelmente um documento escaneado (imagem), sem camada de texto.",
      };
    }
    return { status: "sucesso", texto, avisos: [] };
  } catch (error) {
    return { status: "falha", motivo: `Erro ao extrair PDF: ${(error as Error).message}` };
  } finally {
    await parser?.destroy();
  }
}
