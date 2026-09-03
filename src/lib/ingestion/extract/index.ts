import { extractDocx } from "@/lib/ingestion/extract/docx";
import { extractLegacyDoc } from "@/lib/ingestion/extract/legacyDoc";
import { extractPdf } from "@/lib/ingestion/extract/pdf";
import { extractPptx } from "@/lib/ingestion/extract/pptx";
import type { ExtractionOutcome } from "@/lib/ingestion/extract/types";

export type { ExtractionOutcome } from "@/lib/ingestion/extract/types";

/**
 * Roteador de extração por MIME type (Fase 3, Etapa 4 "extrair texto",
 * Etapa 5 "formatos"). Cobre progressivamente Google Docs (texto já
 * exportado pela camada de origem — `src/lib/ingestion/sources/`, ver o
 * comentário abaixo), DOCX, DOC legado e PDF; PPTX quando há texto nos
 * slides. RTF ainda não tem adaptador — nenhum arquivo do lote piloto
 * usa RTF (ver docs/fase3-piloto/PILOTO_FASE3_MANIFEST.csv), então não
 * foi implementado adiantado; um RTF real cai em `nao_suportado`
 * (correto — nunca finge sucesso) até que a Etapa de escala do acervo
 * (Fase 10) precise dele de verdade.
 *
 * Um Google Doc nativo (`application/vnd.google-apps.document`) não tem
 * "bytes originais" para baixar — a API do Drive precisa exportá-lo como
 * texto/HTML/DOCX. Essa conversão é responsabilidade da camada de
 * ORIGEM (`SourceAdapter.fetchFile`), não desta função: quando o
 * adaptador busca um Google Doc, ele já devolve `SourceFile.buffer` como
 * texto plano UTF-8 (mimeType `text/plain`) — daí `text/plain` e
 * `application/vnd.google-apps.document` serem tratados igual aqui: só
 * decodificar o buffer, sem nenhum parser binário.
 */
export async function extractText(buffer: Buffer, mimeType: string): Promise<ExtractionOutcome> {
  switch (mimeType) {
    case "text/plain":
    case "application/vnd.google-apps.document": {
      const texto = buffer.toString("utf8").trim();
      if (!texto) return { status: "falha", motivo: "Texto plano vazio (Google Doc sem conteúdo, ou export vazio)." };
      return { status: "sucesso", texto, avisos: [] };
    }
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return extractDocx(buffer);
    case "application/msword":
      return extractLegacyDoc(buffer);
    case "application/pdf":
      return extractPdf(buffer);
    case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      return extractPptx(buffer);
    default:
      return { status: "nao_suportado", motivo: `MIME type "${mimeType}" ainda sem adaptador de extração (Etapa 5).` };
  }
}
