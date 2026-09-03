/**
 * PIPELINE GENESIS RAW — Converter arquivos em Markdown RAW fiel
 * Fase 2: ARQUIVO ORIGINAL → MARKDOWN RAW
 *
 * Preserva conteúdo integral, nenhuma alteração editorial
 * Front matter YAML com metadados completos
 * Idempotente: SHA-256 não mudou = skip
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

const { ExtractorFactory } = require("word-extractor");

// Tipos
interface ExtractionResult {
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

interface PipelineManifest {
  timestamp: string;
  book: string;
  totalProcessed: number;
  successCount: number;
  holdCount: number;
  results: ExtractionResult[];
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

// Extrair com word-extractor
async function extractTextWithWordExtractor(filePath: string): Promise<string | null> {
  try {
    const extractor = ExtractorFactory.parse(filePath);
    const text = extractor.getText();
    return text || null;
  } catch (err) {
    console.error(
      `  Extração word-extractor falhou: ${err instanceof Error ? err.message : "unknown"}`
    );
    return null;
  }
}

// Detectar referências bíblicas (simples)
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

  return Array.from(refs).slice(0, 10); // Máx 10
}

// Sanitizar filename
function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\-_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

// Gerar Markdown RAW com front matter
function generateMarkdownRaw(
  sourceId: string,
  fileName: string,
  content: string,
  sha256: string,
  sizeBytes: number,
  extractionMethod: string,
  references: string[],
  warnings: string[]
): string {
  const now = new Date().toISOString();

  const frontMatter = `---
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
extraction_method: "${extractionMethod}"
references_detected: ${JSON.stringify(references)}
warnings: ${JSON.stringify(warnings)}
created_at_pipeline: "${now}"
---

${content}`;

  return frontMatter;
}

// Processar um arquivo
async function processFile(
  filePath: string,
  fileName: string,
  existingState: Record<string, any>
): Promise<ExtractionResult> {
  const ext = path.extname(fileName).toLowerCase();
  const stat = fs.statSync(filePath);

  try {
    const sha256 = await computeSha256(filePath);
    const sourceId = sha256.substring(0, 16);

    // Verificar idempotência
    if (existingState[sourceId] && existingState[sourceId].sha256 === sha256) {
      return {
        sourceId,
        fileName,
        sha256,
        status: "SUCCESS",
        extractionMethod: "SKIPPED_ALREADY_PROCESSED",
        markdownPath: existingState[sourceId].outputPath,
        warnings: ["Arquivo já processado (SHA-256 idêntico)"],
      };
    }

    // Extrair conteúdo
    let content: string | null = null;

    if ([".doc", ".docx"].includes(ext)) {
      console.log(`  Extrator: word-extractor...`);
      content = await extractTextWithWordExtractor(filePath);
    }

    if (!content) {
      return {
        sourceId,
        fileName,
        sha256,
        status: "HOLD_CONVERSION",
        warnings: ["Extração retornou vazio ou falhou"],
        errorMessage: "Nenhum texto foi extraído",
      };
    }

    // Validar conteúdo
    const textLength = content.length;
    if (textLength < 100) {
      return {
        sourceId,
        fileName,
        sha256,
        status: "HOLD_CONVERSION",
        warnings: [`Conteúdo muito curto (${textLength} chars)`],
        errorMessage: "Menos de 100 caracteres extraídos",
      };
    }

    // Detectar referências e gerar Markdown
    const refs = detectBibleReferences(content);
    const warnings: string[] = [];

    if (refs.length === 0) {
      warnings.push("Nenhuma referência bíblica detectada");
    }

    const markdown = generateMarkdownRaw(
      sourceId,
      fileName,
      content,
      sha256,
      stat.size,
      "WORD_EXTRACTOR",
      refs,
      warnings
    );

    // Salvar Markdown
    const sanitized = sanitizeFilename(fileName.replace(ext, ""));
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
      extractionMethod: "WORD_EXTRACTOR",
      textLength,
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
  console.log("\n🔄 PIPELINE GENESIS RAW PROCESSING\n");

  const genesisPath =
    "G:\\Meu Drive\\Biblioteca Estudos Bíblicos\\00_BIBLIOTECA_VIRTUAL\\06_EDITORIAL\\04_BACKLOG_EDITORIAL\\01_GENESIS\\01_ARQUIVOS_DE_TEXTO";

  const files = fs
    .readdirSync(genesisPath)
    .filter((f) => {
      const stat = fs.statSync(path.join(genesisPath, f));
      return stat.isFile() && f !== "desktop.ini";
    })
    .sort();

  // Carregar state anterior para idempotência
  const stateFile = "artifacts/bible-markdown-pipeline/pipeline-state.json";
  let existingState: Record<string, any> = {};
  if (fs.existsSync(stateFile)) {
    const stateData = JSON.parse(fs.readFileSync(stateFile, "utf-8"));
    existingState = stateData.genesis?.processed || {};
  }

  const results: ExtractionResult[] = [];
  let successCount = 0;
  let holdCount = 0;

  console.log(`📄 Processando ${files.length} arquivos...\n`);

  for (const file of files) {
    const filePath = path.join(genesisPath, file);
    const result = await processFile(filePath, file, existingState);
    results.push(result);

    const icon =
      result.status === "SUCCESS"
        ? "✓"
        : result.extractionMethod === "SKIPPED_ALREADY_PROCESSED"
          ? "⊘"
          : "⏸";
    const suffix =
      result.extractionMethod === "SKIPPED_ALREADY_PROCESSED"
        ? " (SKIP)"
        : result.status === "SUCCESS"
          ? ` (${result.textLength} chars)`
          : ` (${result.status})`;

    console.log(`${icon} ${file.substring(0, 45)}${suffix}`);

    if (result.status === "SUCCESS") successCount++;
    if (result.status.startsWith("HOLD")) holdCount++;
  }

  console.log(`\n📊 RESUMO:\n`);
  console.log(`  Success: ${successCount}`);
  console.log(`  Hold: ${holdCount}`);
  console.log(`  Total: ${results.length}\n`);

  // Salvar manifesto atualizado
  const manifest: PipelineManifest = {
    timestamp: new Date().toISOString(),
    book: "Gênesis",
    totalProcessed: results.length,
    successCount,
    holdCount,
    results,
  };

  const manifestPath =
    "artifacts/bible-markdown-pipeline/manifests/manifest-01-genesis-raw-2026-09-03.json";
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  console.log(`💾 Manifesto RAW salvo: ${manifestPath}\n`);

  // Mostrar alguns sucessos
  const successes = results.filter((r) => r.status === "SUCCESS");
  if (successes.length > 0) {
    console.log(`✅ Exemplos de arquivos processados:\n`);
    successes.slice(0, 5).forEach((r) => {
      console.log(`  - ${r.fileName}`);
      console.log(`    → ${r.markdownPath}`);
    });
  }
}

main().catch(console.error);
