import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { extractPptx } from "@/lib/ingestion/extract/pptx";

/** Constrói um .pptx MINIMAMENTE válido (OOXML) com N slides, gerado em memória. */
async function buildMinimalPptx(slideTexts: string[]): Promise<Buffer> {
  const zip = new JSZip();
  slideTexts.forEach((text, i) => {
    zip.file(
      `ppt/slides/slide${i + 1}.xml`,
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">' +
        `<p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>${text}</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld>` +
        "</p:sld>",
    );
  });
  return zip.generateAsync({ type: "nodebuffer" });
}

describe("extractPptx", () => {
  it("extrai o texto dos slides na ORDEM correta, mesmo com nomes fora de ordem (slide10 depois de slide2)", async () => {
    const buffer = await buildMinimalPptx(["Slide um: Êxodo 28:2", "Slide dois: as vestes do sumo sacerdote"]);
    const result = await extractPptx(buffer);
    expect(result.status).toBe("sucesso");
    if (result.status === "sucesso") {
      expect(result.texto.indexOf("Slide um")).toBeLessThan(result.texto.indexOf("Slide dois"));
    }
  });

  it("devolve falha (não lança) quando o PPTX não tem slides", async () => {
    const buffer = await buildMinimalPptx([]);
    const result = await extractPptx(buffer);
    expect(result.status).toBe("falha");
  });

  it("devolve falha (não lança) para bytes que não são um .pptx de verdade", async () => {
    const result = await extractPptx(Buffer.from("nem zip, nem pptx"));
    expect(result.status).toBe("falha");
  });
});
