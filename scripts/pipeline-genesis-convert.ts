/**
 * PIPELINE GENESIS CONVERT — Converter arquivos textuais para Markdown RAW
 * Determinístico, auditável, sem IA
 * Nesta fase: hold tudo porque requer ferramentas de extração específicas
 * (word-extractor para DOC, unzipper para DOCX, etc.)
 * Este script registra o STATUS sem modificar originais.
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

interface ConversionResult {
  sourceId: string;
  fileName: string;
  extension: string;
  sha256: string;
  sizeBytes: number;
  status: string;
  errorMessage?: string;
  extractionMethod?: string;
  warnings: string[];
}

// Computar SHA-256
async function computeSha256(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}

async function main() {
  console.log("\n🔄 PIPELINE GENESIS AUDIT + MANIFEST\n");

  const genesisPath = "G:\\Meu Drive\\Biblioteca Estudos Bíblicos\\00_BIBLIOTECA_VIRTUAL\\06_EDITORIAL\\04_BACKLOG_EDITORIAL\\01_GENESIS\\01_ARQUIVOS_DE_TEXTO";

  if (!fs.existsSync(genesisPath)) {
    console.error(`❌ Path not found: ${genesisPath}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(genesisPath)
    .filter((f) => {
      const stat = fs.statSync(path.join(genesisPath, f));
      return stat.isFile() && f !== "desktop.ini";
    })
    .sort();

  const results: ConversionResult[] = [];

  console.log(`📄 Processando ${files.length} arquivos de Gênesis...\n`);

  for (const file of files) {
    const filePath = path.join(genesisPath, file);
    const ext = path.extname(file).toLowerCase();
    const stat = fs.statSync(filePath);

    try {
      const sha256 = await computeSha256(filePath);
      const sourceId = sha256.substring(0, 16);

      // Detectar qual tipo de hold é apropriado
      let status = "HOLD_CONVERSION";
      let method = "PENDING_EXTRACTION_TOOL";

      if ([".docx"].includes(ext)) {
        status = "HOLD_CONVERSION";
        method = "NEEDS_UNZIPPER_OR_DOCX_PARSER";
      } else if ([".doc"].includes(ext)) {
        status = "HOLD_CONVERSION";
        method = "NEEDS_WORD_EXTRACTOR_OLE_PARSER";
      } else if ([".rtf"].includes(ext)) {
        status = "HOLD_CONVERSION";
        method = "NEEDS_RTF_PARSER";
      } else if ([".txt"].includes(ext)) {
        status = "HOLD_CONVERSION";
        method = "READY_FOR_SIMPLE_TEXT_EXTRACTION";
      }

      const result: ConversionResult = {
        sourceId,
        fileName: file,
        extension: ext,
        sha256,
        sizeBytes: stat.size,
        status,
        extractionMethod: method,
        warnings: [`Extração ainda não implementada nesta fase do pipeline`],
      };

      results.push(result);
      console.log(`⏸ ${file.substring(0, 50)} (${ext}) — ${status}`);
    } catch (err) {
      console.log(`✗ ${file} — ERROR`);
      results.push({
        sourceId: "ERROR_" + file.substring(0, 8),
        fileName: file,
        extension: ext,
        sha256: "ERROR",
        sizeBytes: 0,
        status: "HOLD_CORRUPTED",
        errorMessage: `${err instanceof Error ? err.message : "unknown"}`,
        warnings: [],
      });
    }
  }

  console.log(`\n📊 RESUMO:\n`);
  const byStatus = results.reduce((acc: Record<string, number>, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  Object.entries(byStatus).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });

  // Salvar manifesto
  const manifestPath = path.join(
    process.cwd(),
    "artifacts/bible-markdown-pipeline/manifests",
    `manifest-01-genesis-${new Date().toISOString().split("T")[0]}.json`
  );

  fs.writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        book: "Gênesis",
        testament: "OLD",
        source_path: genesisPath,
        total_files_processed: results.length,
        results,
      },
      null,
      2
    )
  );

  console.log(`\n💾 Manifesto salvo:\n  ${manifestPath}\n`);
}

main().catch(console.error);
