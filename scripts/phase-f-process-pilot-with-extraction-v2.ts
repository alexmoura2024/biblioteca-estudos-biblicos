/**
 * FASE F — Processar Piloto Real com Extraction Engine V2
 * Ingere os 49 arquivos do piloto usando a nova engine
 * Gera relatório de audit com métricas detalhadas
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { extractFile, type ExtractionReport } from "../src/lib/extraction/v2/engine";

const PILOT_DIR =
  "G:/Meu Drive/Biblioteca Estudos Bíblicos/00_BIBLIOTECA_VIRTUAL/01_ACERVO/00_PILOTO_FASE3/05_INPUT_CLAUDE_EXPORTS";

interface AuditResult {
  fileName: string;
  status: "SUCCESS" | "HOLD_EMPTY" | "HOLD_EXTRACTION_ERROR" | "HOLD_UNSUPPORTED";
  detectedFormat: string;
  extractionMethod: string;
  declaredExtension: string;
  fileSizeBytes: number;
  textCharacterCount: number;
  fallbackUsed: boolean;
  warnings: string[];
  sha256: string;
  processingTimeMs: number;
}

async function main() {
  console.log("\n🔄 PHASE F — Process Pilot with Extraction Engine V2\n");

  if (!fs.existsSync(PILOT_DIR)) {
    console.error(`❌ Pilot directory not found: ${PILOT_DIR}`);
    process.exit(1);
  }

  // List all pilot files
  const files = fs
    .readdirSync(PILOT_DIR)
    .filter((f) => {
      const stat = fs.statSync(path.join(PILOT_DIR, f));
      return stat.isFile() && f !== "desktop.ini";
    })
    .sort();

  console.log(`📋 Found ${files.length} files in pilot directory\n`);
  console.log(`Processing with Extraction Engine V2...\n`);

  const results: AuditResult[] = [];
  const startTime = Date.now();

  for (let i = 0; i < files.length; i++) {
    const fileName = files[i];
    const filePath = path.join(PILOT_DIR, fileName);

    process.stdout.write(
      `[${String(i + 1).padStart(3, "0")}/${files.length}] ${fileName.substring(0, 50).padEnd(50)} `
    );

    try {
      const report = await extractFile(filePath);

      const auditResult: AuditResult = {
        fileName: report.fileName,
        status: report.status,
        detectedFormat: report.detectedFormat,
        extractionMethod: report.extractionMethod,
        declaredExtension: report.declaredExtension,
        fileSizeBytes: report.fileSizeBytes,
        textCharacterCount: report.textCharacterCount,
        fallbackUsed: report.fallbackUsed,
        warnings: report.warnings,
        sha256: report.sha256,
        processingTimeMs: report.processingTimeMs,
      };

      results.push(auditResult);

      // Visual indicator
      const statusEmoji =
        report.status === "SUCCESS"
          ? "✓"
          : report.status.startsWith("HOLD")
            ? "⏸"
            : "❌";

      const details = [
        report.detectedFormat.padEnd(6),
        `${report.textCharacterCount}`.padStart(8),
      ];

      console.log(`${statusEmoji} ${details.join(" | ")}`);
    } catch (err) {
      console.log(`❌ ERROR: ${err instanceof Error ? err.message : "unknown"}`);
    }
  }

  const totalTime = Date.now() - startTime;

  // Analysis
  console.log(`\n📊 AUDIT SUMMARY:\n`);

  const successCount = results.filter((r) => r.status === "SUCCESS").length;
  const holdCount = results.filter((r) => r.status.startsWith("HOLD")).length;

  console.log(`  Total files: ${results.length}`);
  console.log(`  ✓ Success: ${successCount}`);
  console.log(`  ⏸ Hold/Fallback: ${holdCount}`);
  console.log(`  ⏱️  Total time: ${(totalTime / 1000).toFixed(2)}s`);
  console.log(`  ⏱️  Average: ${(totalTime / results.length).toFixed(0)}ms per file\n`);

  // Format breakdown
  console.log(`📊 Format Breakdown:\n`);

  const formatMap = new Map<string, AuditResult[]>();
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
      const totalChars = items.reduce((sum, r) => sum + r.textCharacterCount, 0);
      console.log(`  ${format.padEnd(10)}: ${success}/${items.length} success, ${totalChars.toLocaleString()} chars total`);
    });

  // Extraction methods
  console.log(`\n📚 Extraction Methods Used:\n`);

  const methodMap = new Map<string, AuditResult[]>();
  results.forEach((r) => {
    if (!methodMap.has(r.extractionMethod)) {
      methodMap.set(r.extractionMethod, []);
    }
    methodMap.get(r.extractionMethod)!.push(r);
  });

  Array.from(methodMap.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([method, items]) => {
      const success = items.filter((r) => r.status === "SUCCESS").length;
      console.log(`  ${method.padEnd(40)}: ${success}/${items.length} success`);
    });

  // Fallback usage
  console.log(`\n⚡ Fallback Chain Usage:\n`);

  const fallbackCount = results.filter((r) => r.fallbackUsed).length;
  const primaryOnly = results.filter((r) => !r.fallbackUsed && r.status === "SUCCESS").length;

  console.log(`  Primary adapter success: ${primaryOnly}/${successCount}`);
  console.log(`  Fallback used: ${fallbackCount}/${successCount}`);

  if (fallbackCount > 0) {
    console.log(`\n  Files using fallback:`);
    results
      .filter((r) => r.fallbackUsed && r.status === "SUCCESS")
      .slice(0, 10)
      .forEach((r) => {
        console.log(`    • ${r.fileName.substring(0, 45)} (${r.extractionMethod})`);
      });
  }

  // Document type distribution
  console.log(`\n📄 Document Types:\n`);

  const extensionMap = new Map<string, number>();
  results.forEach((r) => {
    const ext = r.declaredExtension || "unknown";
    extensionMap.set(ext, (extensionMap.get(ext) || 0) + 1);
  });

  Array.from(extensionMap.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([ext, count]) => {
      console.log(`  ${ext.padEnd(10)}: ${count}`);
    });

  // Warnings analysis
  console.log(`\n⚠️  Warnings Summary:\n`);

  const warningMap = new Map<string, number>();
  results.forEach((r) => {
    r.warnings.forEach((w) => {
      // Extract warning type (first 50 chars)
      const key = w.substring(0, 50);
      warningMap.set(key, (warningMap.get(key) || 0) + 1);
    });
  });

  Array.from(warningMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([warning, count]) => {
      console.log(`  ${count.toString().padStart(3)} × ${warning}...`);
    });

  // Save detailed audit report
  const auditReport = {
    timestamp: new Date().toISOString(),
    phase: "F",
    pilotDirectory: PILOT_DIR,
    totalFiles: results.length,
    successCount,
    holdCount,
    totalProcessingTimeMs: totalTime,
    averageProcessingTimeMs: Math.round(totalTime / results.length),
    formatBreakdown: Object.fromEntries(
      Array.from(formatMap.entries()).map(([fmt, items]) => [
        fmt,
        {
          total: items.length,
          success: items.filter((r) => r.status === "SUCCESS").length,
          totalCharacters: items.reduce((sum, r) => sum + r.textCharacterCount, 0),
        },
      ])
    ),
    extractionMethodBreakdown: Object.fromEntries(
      Array.from(methodMap.entries()).map(([method, items]) => [
        method,
        {
          total: items.length,
          success: items.filter((r) => r.status === "SUCCESS").length,
        },
      ])
    ),
    fallbackUsage: {
      primaryAdapterSuccess: primaryOnly,
      fallbackUsed: fallbackCount,
      percentWithFallback: ((fallbackCount / successCount) * 100).toFixed(1),
    },
    documentTypes: Object.fromEntries(extensionMap),
    results: results.map((r) => ({
      fileName: r.fileName,
      status: r.status,
      format: r.detectedFormat,
      method: r.extractionMethod,
      declaredExt: r.declaredExtension,
      size: r.fileSizeBytes,
      chars: r.textCharacterCount,
      fallback: r.fallbackUsed,
      warnings: r.warnings.length,
      sha256: r.sha256,
      ms: r.processingTimeMs,
    })),
  };

  const reportPath = path.join(process.cwd(), "artifacts/extraction-v2-audit-report.json");
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(auditReport, null, 2));

  console.log(`\n💾 Audit report saved: ${reportPath}\n`);

  // Summary
  if (successCount === results.length) {
    console.log("✅ Perfect score: all files processed successfully!\n");
    process.exit(0);
  } else if (successCount > results.length * 0.8) {
    console.log(`✅ High success rate: ${((successCount / results.length) * 100).toFixed(1)}%\n`);
    process.exit(0);
  } else {
    console.log(`⚠️  ${holdCount} files could not be extracted\n`);
    process.exit(0); // Don't error — holdCount is expected for some formats
  }
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
