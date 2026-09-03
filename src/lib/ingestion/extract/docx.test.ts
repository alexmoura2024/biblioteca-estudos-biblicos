import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { extractDocx } from "@/lib/ingestion/extract/docx";

/**
 * Constrói um .docx MINIMAMENTE válido (OOXML: zip com
 * [Content_Types].xml, _rels/.rels e word/document.xml) inteiramente em
 * memória — não é um fixture binário commitado, é gerado pelo próprio
 * teste, então fica versionado como texto e nunca fica desatualizado.
 * Isto testa a extração de verdade (mammoth lendo um .docx real), não
 * um mock da biblioteca.
 */
async function buildMinimalDocx(paragraphs: string[]): Promise<Buffer> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
      "</Types>",
  );
  zip.file(
    "_rels/.rels",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
      "</Relationships>",
  );
  const body = paragraphs.map((p) => `<w:p><w:r><w:t>${p}</w:t></w:r></w:p>`).join("");
  zip.file(
    "word/document.xml",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      `<w:body>${body}</w:body>` +
      "</w:document>",
  );
  return zip.generateAsync({ type: "nodebuffer" });
}

describe("extractDocx", () => {
  it("extrai o texto de um .docx real (gerado em memória, OOXML válido)", async () => {
    const buffer = await buildMinimalDocx(["Êxodo 15:17 é o lugar que o Senhor escolheu.", "Segundo parágrafo do estudo."]);
    const result = await extractDocx(buffer);
    expect(result.status).toBe("sucesso");
    if (result.status === "sucesso") {
      expect(result.texto).toContain("Êxodo 15:17");
      expect(result.texto).toContain("Segundo parágrafo");
    }
  });

  it("devolve falha (não lança) quando o .docx extraído não tem nenhum texto", async () => {
    const buffer = await buildMinimalDocx([]);
    const result = await extractDocx(buffer);
    expect(result.status).toBe("falha");
  });

  it("devolve falha (não lança) para bytes que não são um .docx de verdade", async () => {
    const result = await extractDocx(Buffer.from("isto não é um zip nem um docx"));
    expect(result.status).toBe("falha");
  });
});
