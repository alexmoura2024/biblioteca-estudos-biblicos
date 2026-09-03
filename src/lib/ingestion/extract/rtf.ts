/**
 * Extrator de texto de arquivos RTF
 * Usado como fallback quando word-extractor falha em formatos legados
 * Detecta RTF por assinatura ({\rtf1) e extrai texto limpo
 */

export function isRTFFile(buffer: Buffer): boolean {
  const header = buffer.toString("utf8", 0, 20);
  return header.startsWith("{\\rtf");
}

/**
 * Extrai texto limpo de arquivo RTF
 * Remove controles, espaços vazios, mantém estrutura básica
 */
export function extractRTFText(buffer: Buffer): string {
  let text = buffer.toString("utf8", 0, Math.min(buffer.length, 1000000));

  // Remove grupos de controle (ignorar aninhamento completo)
  text = text.replace(/\\\*[a-z]+[\d]*\s*/gi, "");

  // Remove comandos de formatação
  text = text.replace(/\\[a-z]+[\d]*\s*/gi, "");

  // Remove chaves de grupo (cuidado com estrutura aninhada)
  text = text.replace(/[{}]/g, "");

  // Normaliza espaços (mas preserva quebras de linha significativas)
  text = text.replace(/[ \t]+/g, " ");
  text = text.replace(/\r?\n\s*\r?\n/g, "\n\n");

  // Remove caracteres de controle
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  // Decode entidades comuns (RTF usa codificação especial)
  text = text.replace(/\\'([0-9a-f]{2})/gi, (match, hex) => {
    try {
      return String.fromCharCode(parseInt(hex, 16));
    } catch {
      return match;
    }
  });

  // Limpa sequências de símbolos inúteis
  text = text.replace(/[^a-záàâãäèéêëìíîïòóôõöùúûüçñ0-9.,;:!?\-\s()\[\]"'\n]/gi, "");

  // Remove linhas vazias ou muito curtas
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 3);

  return lines.join("\n").trim();
}

/**
 * Valida conteúdo extraído (não apenas metadados)
 */
export function isValidExtractedContent(text: string): boolean {
  // Mínimo 100 caracteres de conteúdo real
  if (text.length < 100) return false;

  // Pode estar em uma linha única após limpeza, mas deve ter volume
  // Validar com base em comprimento mínimo
  return text.trim().length > 100;
}
