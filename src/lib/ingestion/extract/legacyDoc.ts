import WordExtractor from "word-extractor";
import type { ExtractionOutcome } from "@/lib/ingestion/extract/types";

/**
 * DOC legado (binário Word 97-2003) — `application/msword`. Boa parte do
 * acervo real do piloto está nesse formato (ver
 * docs/fase3-piloto/PILOTO_FASE3_MANIFEST.csv). `word-extractor` é puro
 * JS (sem depender de LibreOffice/antiword externos) — CLAUDE_FASE3_
 * EXECUCAO_PILOTO.md pede para não construir OCR complexo, mas extração
 * de texto de um `.doc` legado não é OCR.
 *
 * Diagnóstico do achado real DUP-002 (Fase 3.1, checkpoint 14, DEC-040):
 * `word-extractor` só sabe ler o FIB (File Information Block) na
 * "assinatura mágica" 0xA5EC (Word 97-2003). O ponteiro `assinaturaFIB`
 * abaixo traduz a mensagem crua da lib ("Invalid magic number: a5dc")
 * num diagnóstico legível — sem tentar adivinhar/parsear o conteúdo do
 * formato mais antigo (isso exigiria reimplementar a leitura do FIB e da
 * tabela de peças do Word 6.0/95, uma estrutura binária DIFERENTE da que
 * `word-extractor` já implementa para Word 97+, não uma correção pontual
 * — deixado fora do escopo desta etapa). O arquivo em si é um Composite
 * Document File (OLE/CFB) genuíno — não corrompido, não outro formato
 * disfarçado de `.doc` — só uma sub-versão binária mais antiga do MESMO
 * formato Word que a biblioteca atual não implementa.
 */
const FIB_MAGIC_TO_KNOWN_FORMAT: Record<string, string> = {
  a5ec: "Word 97-2003 (o formato que word-extractor já suporta — se esta mensagem apareceu mesmo assim, o problema é outro, não a versão do formato)",
  a5dc: "Word 6.0/95 (formato binário mais antigo, com FIB e tabela de peças estruturalmente diferentes do Word 97+; não é corrupção nem MIME incorreto)",
};

/** Exportado só para teste direto (evita ter que fabricar um Composite Document File binário completo só para exercitar a tradução da mensagem). */
export function diagnoseInvalidMagicNumber(message: string): string | undefined {
  const match = message.match(/Invalid magic number:\s*([0-9a-f]+)/i);
  if (!match) return undefined;
  const hex = match[1].toLowerCase();
  const known = FIB_MAGIC_TO_KNOWN_FORMAT[hex];
  return known
    ? `Erro ao extrair DOC legado: o arquivo é um Composite Document File (OLE/CFB) genuíno, mas no formato binário ${known}. ` +
        "Recuperar o texto exigiria um extrator dedicado a essa versão do formato (fora do escopo desta etapa) — não corrigido automaticamente; " +
        "requer reconversão manual do arquivo de origem ou decisão humana se o conteúdo for necessário."
    : undefined;
}

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
    const rawMessage = (error as Error).message;
    const diagnosed = diagnoseInvalidMagicNumber(rawMessage);
    return { status: "falha", motivo: diagnosed ?? `Erro ao extrair DOC legado: ${rawMessage}` };
  }
}
