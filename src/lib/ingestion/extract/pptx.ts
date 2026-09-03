import JSZip from "jszip";
import type { ExtractionOutcome } from "@/lib/ingestion/extract/types";

/**
 * PPTX (OOXML) — `application/vnd.openxmlformats-officedocument.presentationml.presentation`.
 * PPTX é um zip de XML (mesma família OOXML do DOCX); cada slide é
 * `ppt/slides/slideN.xml`, com o texto em tags `<a:t>`. Não há uma
 * biblioteca de extração de PPTX tão estabelecida quanto mammoth (DOCX)
 * — em vez de adicionar uma dependência menos conhecida, extrai
 * diretamente o XML com `jszip` (já usado no ecossistema Node para ler
 * zips) e uma expressão regular sobre as tags de texto, escopo mínimo
 * suficiente para o que a Etapa 4/5 pede (texto de slides, não layout).
 */
const TEXT_RUN_REGEX = /<a:t>([^<]*)<\/a:t>/g;

function decodeXmlEntities(value: string): string {
  return value.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
}

function slideNumber(path: string): number {
  return Number(path.match(/slide(\d+)\.xml$/)?.[1] ?? 0);
}

export async function extractPptx(buffer: Buffer): Promise<ExtractionOutcome> {
  try {
    const zip = await JSZip.loadAsync(buffer);
    const slidePaths = Object.keys(zip.files)
      .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
      .sort((a, b) => slideNumber(a) - slideNumber(b));

    if (slidePaths.length === 0) {
      return { status: "falha", motivo: "PPTX não tem nenhum slide reconhecível (ppt/slides/slideN.xml ausente)." };
    }

    const slideTexts: string[] = [];
    for (const path of slidePaths) {
      const xml = await zip.files[path].async("text");
      const runs = [...xml.matchAll(TEXT_RUN_REGEX)].map((m) => decodeXmlEntities(m[1]));
      const slideText = runs.join(" ").trim();
      if (slideText) slideTexts.push(slideText);
    }

    const texto = slideTexts.join("\n\n").trim();
    if (!texto) {
      return { status: "falha", motivo: "PPTX extraído sem nenhum texto nos slides (podem conter só imagens)." };
    }
    return { status: "sucesso", texto, avisos: [] };
  } catch (error) {
    return { status: "falha", motivo: `Erro ao extrair PPTX: ${(error as Error).message}` };
  }
}
