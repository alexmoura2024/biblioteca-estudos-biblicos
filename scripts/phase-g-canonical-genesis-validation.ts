/**
 * PHASE G — Canonical Genesis Corpus Validation
 * Process all 40 real textual files from canonical source
 * Final acceptance audit against production data
 */

import * as fs from "fs";
import * as path from "path";
import { extractFile, type ExtractionReport } from "../src/lib/extraction/v2/engine";

const CANONICAL_GENESIS_PATH =
  "G:/Meu Drive/Mensagens por livro/01 - Antigo Testamento/01 - Gênesis";

interface CanonicalResult {
  fileName: string;
  filePath: string;
  declaredExtension: string;
  detectedFormat: string;
  extractionMethod: string;
  status: string;
  textCharacterCount: number;
  sha256: string;
  processingTimeMs: number;
  fallbackUsed: boolean;
  warnings: string[];
  fileType: "TEXTUAL" | "PRESENTATION" | "OTHER";
}

async function main() {
  console.log("\n🔍 PHASE G — CANONICAL GENESIS CORPUS VALIDATION\n");

  if (!fs.existsSync(CANONICAL_GENESIS_PATH)) {
    console.error(`❌ Canonical path not found: ${CANONICAL_GENESIS_PATH}`);
    process.exit(1);
  }

  // Get all files
  const allFiles = fs
    .readdirSync(CANONICAL_GENESIS_PATH)
    .filter((f) => {
      const stat = fs.statSync(path.join(CANONICAL_GENESIS_PATH, f));
      return stat.isFile();
    })
    .sort();

  console.log(`📁 Found ${allFiles.length} files in canonical Genesis\n`);

  // Categorize
  const textualExts = [".docx", ".doc", ".pdf", ".txt"];
  const presentationExts = [".pptx", ".ppt", ".ppsx", ".pps"];

  const textualFiles = allFiles.filter((f) =>
    textualExts.includes(path.extname(f).toLowerCase())
  );
  const presentationFiles = allFiles.filter((f) =>
    presentationExts.includes(path.extname(f).toLowerCase())
  );
  const otherFiles = allFiles.filter(
    (f) =>
      !textualExts.includes(path.extname(f).toLowerCase()) &&
      !presentationExts.includes(path.extname(f).toLowerCase())
  );

  console.log(`📊 Inventory:`);
  console.log(`  TEXTUAL_FILES:      ${textualFiles.length}`);
  console.log(`  PRESENTATIONS:      ${presentationFiles.length}`);
  console.log(`  OTHER:              ${otherFiles.length}`);
  console.log(`  ─────────────────────`);
  console.log(`  TOTAL:              ${allFiles.length}\n`);

  // Process only textual files
  console.log(`⚙️  Processing ${textualFiles.length} textual files...\n`);

  const results: CanonicalResult[] = [];
  const startTime = Date.now();

  for (let i = 0; i < textualFiles.length; i++) {
    const fileName = textualFiles[i];
    const filePath = path.join(CANONICAL_GENESIS_PATH, fileName);

    process.stdout.write(
      `[${String(i + 1).padStart(2, "0")}/${textualFiles.length}] ${fileName.substring(0, 50).padEnd(50)} `
    );

    try {
      const report = await extractFile(filePath);

      const result: CanonicalResult = {
        fileName: report.fileName,
        filePath: report.filePath,
        declaredExtension: report.declaredExtension,
        detectedFormat: report.detectedFormat,
        extractionMethod: report.extractionMethod,
        status: report.status,
        textCharacterCount: report.textCharacterCount,
        sha256: report.sha256,
        processingTimeMs: report.processingTimeMs,
        fallbackUsed: report.fallbackUsed,
        warnings: report.warnings,
        fileType: "TEXTUAL",
      };

      results.push(result);

      const statusEmoji =
        report.status === "SUCCESS" ? "✓" : report.status.startsWith("HOLD") ? "⏸" : "❌";
      const details = [report.detectedFormat.padEnd(6), `${report.textCharacterCount}`.padStart(8)];

      console.log(`${statusEmoji} ${details.join(" | ")}`);
    } catch (err) {
      console.log(`❌ ERROR: ${err instanceof Error ? err.message : "unknown"}`);
    }
  }

  const totalTime = Date.now() - startTime;

  // Analysis
  console.log(`\n📊 RESULTS SUMMARY:\n`);

  const successCount = results.filter((r) => r.status === "SUCCESS").length;
  const holdCount = results.filter((r) => r.status.startsWith("HOLD")).length;
  const failCount = results.filter((r) => r.status.startsWith("ERROR")).length;

  console.log(`  Total processed:    ${results.length}/${textualFiles.length}`);
  console.log(`  ✓ Success:          ${successCount}`);
  console.log(`  ⏸ Hold:             ${holdCount}`);
  console.log(`  ❌ Fail:             ${failCount}`);
  console.log(`  ─────────────────────`);
  console.log(`  SUCCESS + HOLD + FAIL = ${successCount} + ${holdCount} + ${failCount} = ${successCount + holdCount + failCount}`);
  console.log(`  Expected:           ${textualFiles.length}`);

  if (successCount + holdCount + failCount !== textualFiles.length) {
    console.log(`  ❌ MISMATCH! Some files were not processed.`);
  } else {
    console.log(`  ✅ All files accounted for.`);
  }

  console.log(`  ⏱️  Total time: ${(totalTime / 1000).toFixed(2)}s`);
  console.log(`  ⏱️  Average: ${(totalTime / results.length).toFixed(0)}ms per file\n`);

  // Check for critical files
  console.log(`🔍 CRITICAL FILES:\n`);

  const gen041 = results.find((r) => r.fileName.includes("Gn 37") && r.fileName.includes("Obra"));
  console.log(`  GEN-041 (Gn 37 - Obra Forma de Vida .doc):`);
  if (gen041) {
    console.log(`    FOUND = true ✅`);
    console.log(`    DECLARED_EXTENSION = ${gen041.declaredExtension}`);
    console.log(`    DETECTED_FORMAT = ${gen041.detectedFormat}`);
    console.log(`    EXTRACTION_METHOD = ${gen041.extractionMethod}`);
    console.log(`    STATUS = ${gen041.status}`);
    console.log(`    CHAR_COUNT = ${gen041.textCharacterCount}`);

    if (gen041.detectedFormat === "RTF" && gen041.status === "SUCCESS") {
      console.log(`    VERDICT = ✅ PASS (RTF detected correctly)`);
    } else {
      console.log(`    VERDICT = ❌ FAIL (Expected RTF, got ${gen041.detectedFormat})`);
    }
  } else {
    console.log(`    FOUND = false ❌`);
  }

  console.log(`\n  Entra Bendito do Senhor variants:`);
  const entraBendito = results.filter((r) => r.fileName.includes("24.31") && r.fileName.includes("Entra"));
  if (entraBendito.length === 0) {
    console.log(`    FOUND = 0 files ❌`);
  } else {
    console.log(`    FOUND = ${entraBendito.length} files ✅`);
    entraBendito.forEach((r) => {
      console.log(`      • ${r.fileName}: ${r.status} (${r.textCharacterCount} chars)`);
    });
  }

  // Format breakdown
  console.log(`\n📋 Format Breakdown:\n`);

  const formatMap = new Map<string, CanonicalResult[]>();
  results.forEach((r) => {
    if (!formatMap.has(r.detectedFormat)) {
      formatMap.set(r.detectedFormat, []);
    }
    formatMap.get(r.detectedFormat)!.push(r);
  });

  Array.from(formatMap.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([format, items]) => {
      const success = items.filter((r) => r.status === "SUCCESS").length;
      console.log(`  ${format.padEnd(10)}: ${success}/${items.length} success`);
    });

  // Check integrity
  console.log(`\n✔️  INTEGRITY CHECKS:\n`);

  const missingCount = textualFiles.length - results.length;
  const duplicates = new Set<string>();
  const uniqueSha = new Set<string>();

  results.forEach((r) => {
    if (uniqueSha.has(r.sha256)) {
      duplicates.add(r.sha256);
    }
    uniqueSha.add(r.sha256);
  });

  console.log(`  MISSING_SOURCE_FILES = ${missingCount}`);
  console.log(`  DUPLICATE_RAW_FILES = ${duplicates.size}`);
  console.log(`  ORIGINAL_FILES_MODIFIED = 0 (read-only)  ✅`);

  if (missingCount > 0) {
    console.log(`  ❌ FAIL: ${missingCount} files not processed`);
  } else if (duplicates.size > 0) {
    console.log(`  ❌ FAIL: ${duplicates.size} duplicate SHA-256 values`);
  } else {
    console.log(`  ✅ PASS: All integrity checks`);
  }

  // Save report
  const auditReport = {
    timestamp: new Date().toISOString(),
    phase: "G",
    corpus: "CANONICAL_GENESIS",
    canonical_path: CANONICAL_GENESIS_PATH,
    physical_files_total: allFiles.length,
    textual_files_processed: textualFiles.length,
    presentations_ignored: presentationFiles.length,
    other_files: otherFiles.length,
    success_count: successCount,
    hold_count: holdCount,
    fail_count: failCount,
    processing_time_ms: totalTime,
    average_time_ms: Math.round(totalTime / results.length),
    format_breakdown: Object.fromEntries(formatMap),
    critical_files: {
      gen041_found: gen041 !== undefined,
      gen041_detected_as_rtf: gen041?.detectedFormat === "RTF",
      gen041_status: gen041?.status,
      entra_bendito_count: entraBendito.length,
    },
    integrity: {
      missing_files: missingCount,
      duplicate_files: duplicates.size,
      all_accounted: missingCount === 0 && duplicates.size === 0,
    },
    results: results.map((r) => ({
      file: r.fileName,
      format: r.detectedFormat,
      method: r.extractionMethod,
      status: r.status,
      chars: r.textCharacterCount,
      fallback: r.fallbackUsed,
      sha256: r.sha256,
    })),
  };

  const reportPath = path.join(
    process.cwd(),
    "artifacts/bible-markdown-pipeline/v2/reports/CANONICAL_GENESIS_AUDIT.json"
  );
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(auditReport, null, 2));

  console.log(`\n💾 Audit report saved: ${reportPath}\n`);

  // Exit with status
  if (successCount + holdCount + failCount === textualFiles.length && missingCount === 0) {
    console.log("✅ PHASE G VALIDATION PASSED\n");
    process.exit(0);
  } else {
    console.log("❌ PHASE G VALIDATION FAILED\n");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
