/**
 * QUICK FIX — Contorno para limitação de word-extractor
 *
 * Estratégia:
 * 1. Copiar arquivo original para pasta ASCII temporária
 * 2. Processar com word-extractor
 * 3. Gerar Markdown RAW
 * 4. Mover para diretório permanente
 * 5. Limpar temporário
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { execSync } from "child_process";

const { default: WordExtractor } = require("word-extractor");

// Tipos
interface ProcessResult {
  sourceId: string;
  fileName: string;
  sha256: string;
  status: "SUCCESS" | "HOLD_CONVERSION" | "HOLD_CORRUPTED";
  extractionMethod?: string;
  textLength?: number;
  markdownPath?: string;
  warnings: string[];
  errorMessage?: string;
}

// SHA-256
async function computeSha256(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}

// Detectar referências bíblicas
function detectBibleReferences(text: string): string[] {
  const refs: Set<string> = new Set();
  const patterns = [
    /Gênesis\s+(\d+)[:\.](\d+)(?:-(\d+))?/gi,
    /Gn\s+(\d+)[:\.](\d+)(?:-(\d+))?/gi,
  ];

  patterns.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      refs.add(match[0].trim());
    }
  });

  return Array.from(refs).slice(0, 10);
}

// Gerar Markdown RAW
function generateMarkdownRaw(
  sourceId: string,
  fileName: string,
  content: string,
  sha256: string,
  sizeBytes: number,
  references: string[],
  warnings: string[]
): string {
  const now = new Date().toISOString();

  return `---
pipeline_version: "1.0"
source_id: "${sourceId}"
editorial_id: null
book: "Gênesis"
testament: "OLD"
source_file_name: "${fileName.replace(/"/g, '\\"')}"
source_relative_path: "01_GÊNESIS/${fileName}"
source_drive_id: null
source_mime_type: "application/msword"
source_extension: "${path.extname(fileName)}"
source_sha256: "${sha256}"
source_size_bytes: ${sizeBytes}
conversion_status: "SUCCESS"
extraction_method: "WORD_EXTRACTOR_VIA_ASCII_COPY"
references_detected: ${JSON.stringify(references)}
warnings: ${JSON.stringify(warnings)}
created_at_pipeline: "${now}"
---

${content}`;
}

// Processar arquivo via cópia ASCII
async function processFileViaAsciiCopy(
  sourceFilePath: string,
  fileName: string,
  index: number,
  tempDir: string
): Promise<ProcessResult> {
  const ext = path.extname(fileName).toLowerCase();
  const stat = fs.statSync(sourceFilePath);

  try {
    const sha256 = await computeSha256(sourceFilePath);
    const sourceId = sha256.substring(0, 16);

    // 1. Copiar para pasta ASCII temporária
    const tempFileName = `gn-${String(index + 1).padStart(3, "0")}${ext}`;
    const tempFilePath = path.join(tempDir, tempFileName);

    fs.copyFileSync(sourceFilePath, tempFilePath);
    console.log(`  📋 Copiado para temp: ${tempFileName}`);

    // 2. Extrair conteúdo
    let content: string | null = null;

    try {
      const extractor = new WordExtractor();
      const doc = extractor.extract(tempFilePath);
      content = doc.getBody();
    } catch (err) {
      console.error(`    ⚠️  Extração falhou: ${err instanceof Error ? err.message : "unknown"}`);
    }

    // 3. Limpar temporário
    fs.unlinkSync(tempFilePath);

    if (!content || content.length < 100) {
      return {
        sourceId,
        fileName,
        sha256,
        status: "HOLD_CONVERSION",
        warnings: [`Conteúdo muito curto (${content?.length || 0} chars)`],
        errorMessage: "Menos de 100 caracteres extraídos",
      };
    }

    // 4. Detectar referências
    const refs = detectBibleReferences(content);
    const warnings: string[] = [];
    if (refs.length === 0) {
      warnings.push("Nenhuma referência bíblica detectada");
    }

    // 5. Gerar Markdown
    const markdown = generateMarkdownRaw(
      sourceId,
      fileName,
      content,
      sha256,
      stat.size,
      refs,
      warnings
    );

    // 6. Salvar Markdown final
    const sanitized = fileName
      .toLowerCase()
      .replace(/[^a-z0-9\-_]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "")
      .replace(ext, "");

    const markdownPath = path.join(
      process.cwd(),
      `artifacts/bible-markdown-pipeline/raw/antigo_testamento/01_genesis/gn-${sanitized}__${sourceId.substring(0, 8)}.md`
    );

    fs.writeFileSync(markdownPath, markdown);

    return {
      sourceId,
      fileName,
      sha256,
      status: "SUCCESS",
      extractionMethod: "WORD_EXTRACTOR_VIA_ASCII_COPY",
      textLength: content.length,
      markdownPath,
      warnings,
    };
  } catch (err) {
    return {
      sourceId: "ERROR_" + fileName.substring(0, 8),
      fileName,
      sha256: "ERROR",
      status: "HOLD_CORRUPTED",
      warnings: [],
      errorMessage: `${err instanceof Error ? err.message : "unknown"}`,
    };
  }
}

// Main
async function main() {
  console.log("\n🔧 PIPELINE GENESIS — QUICK FIX (ASCII COPY WORKAROUND)\n");

  const genesisPath =
    "G:\\Meu Drive\\Biblioteca Estudos Bíblicos\\00_BIBLIOTECA_VIRTUAL\\06_EDITORIAL\\04_BACKLOG_EDITORIAL\\01_GENESIS\\01_ARQUIVOS_DE_TEXTO";

  const files = fs
    .readdirSync(genesisPath)
    .filter((f) => {
      const stat = fs.statSync(path.join(genesisPath, f));
      return stat.isFile() && f !== "desktop.ini";
    })
    .sort();

  // Criar temp dir
  const tempDir = "C:\\temp\\gn-extract";
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
    console.log(`📁 Pasta temporária criada: ${tempDir}\n`);
  }

  const results: ProcessResult[] = [];
  let successCount = 0;
  let holdCount = 0;

  console.log(`📄 Processando ${files.length} arquivos via ASCII copy...\n`);

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = path.join(genesisPath, file);

    process.stdout.write(`[${String(i + 1).padStart(2, "0")}/${files.length}] ${file.substring(0, 40).padEnd(40)} `);

    const result = await processFileViaAsciiCopy(filePath, file, i, tempDir);
    results.push(result);

    if (result.status === "SUCCESS") {
      console.log(`✓ (${result.textLength} chars)`);
      successCount++;
    } else {
      console.log(`⏸ (${result.status})`);
      holdCount++;
    }
  }

  console.log(`\n📊 RESUMO:\n`);
  console.log(`  ✓ Success: ${successCount}/${files.length}`);
  console.log(`  ⏸ Hold: ${holdCount}/${files.length}\n`);

  // Limpar temp dir
  if (fs.existsSync(tempDir) && fs.readdirSync(tempDir).length === 0) {
    fs.rmdirSync(tempDir);
    console.log(`🧹 Pasta temporária limpa.\n`);
  }

  // Salvar manifesto
  const manifest = {
    timestamp: new Date().toISOString(),
    book: "Gênesis",
    totalProcessed: results.length,
    successCount,
    holdCount,
    extractionMethod: "WORD_EXTRACTOR_VIA_ASCII_COPY",
    results,
  };

  const manifestPath =
    "artifacts/bible-markdown-pipeline/manifests/manifest-01-genesis-raw-quickfix-2026-09-03.json";
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  console.log(`💾 Manifesto salvo: ${manifestPath}\n`);

  // Estatísticas
  if (successCount > 0) {
    console.log(`✅ ${successCount} arquivos processados com sucesso!\n`);

    // Mostrar amostra
    const samples = results.filter((r) => r.status === "SUCCESS").slice(0, 3);
    console.log(`📝 Amostra de Markdown gerado:\n`);
    samples.forEach((s) => {
      console.log(`  • ${s.fileName}`);
      console.log(`    → ${s.markdownPath?.split("\\").pop()}`);
    });
  }
}

main().catch(console.error);
