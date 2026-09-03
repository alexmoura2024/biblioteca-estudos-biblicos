import WordExtractor from "word-extractor";
import type { ExtractionOutcome } from "@/lib/ingestion/extract/types";

/**
 * DOC legado (binário Word 97-2003) — `application/msword`. Boa parte do
 * acervo real do piloto está nesse formato (ver
 * docs/fase3-piloto/PILOTO_FASE3_MANIFEST.csv). `word-extractor` é puro
 * JS (sem depender de LibreOffice/antiword externos) — CLAUDE_FASE3_
 * EXECUCAO_PILOTO.md pede para não construir OCR complexo, mas extração
 * de texto de um `.doc` legado não é OCR.
 */
export async function extractLegacyDoc(buffer: Buffer): Promise<ExtractionOutcome> {
  try {
    const extractor = new WordExtractor();
    const document = await extractor.extract(buffer);
    const texto = document.getBody().trim();
    if (!texto) {
      return { status: "falha", motivo: "DOC (legado) extraído com sucesso pelo parser, mas sem nenhum texto no corpo do documento." };
    }
    return { status: "sucesso", texto, avisos: [] };
  } catch (error) {
    return { status: "falha", motivo: `Erro ao extrair DOC legado: ${(error as Error).message}` };
  }
}
