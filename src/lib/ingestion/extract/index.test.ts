import { describe, expect, it } from "vitest";
import { extractText } from "@/lib/ingestion/extract";

describe("extractText (roteador por MIME type)", () => {
  it("trata text/plain e application/vnd.google-apps.document como texto já decodificado (nenhum parser binário)", async () => {
    const buffer = Buffer.from("Este texto já veio pronto do export do Google Docs.", "utf8");
    const asPlainText = await extractText(buffer, "text/plain");
    const asGoogleDoc = await extractText(buffer, "application/vnd.google-apps.document");
    expect(asPlainText).toEqual(asGoogleDoc);
    expect(asPlainText.status).toBe("sucesso");
  });

  it("devolve nao_suportado (nunca finge sucesso) para um MIME type sem adaptador, ex.: RTF", async () => {
    const result = await extractText(Buffer.from("{\\rtf1 texto}"), "application/rtf");
    expect(result.status).toBe("nao_suportado");
  });

  it("roteia application/msword para o extrator de DOC legado e devolve falha (não lança) para bytes inválidos", async () => {
    const result = await extractText(Buffer.from("não é um .doc de verdade"), "application/msword");
    expect(result.status).toBe("falha");
  });

  it("roteia application/pdf para o extrator de PDF e devolve falha (não lança) para bytes inválidos", async () => {
    const result = await extractText(Buffer.from("não é um PDF de verdade"), "application/pdf");
    expect(result.status).toBe("falha");
  });
});
