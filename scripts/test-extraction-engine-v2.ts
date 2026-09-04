/**
 * FASE E — Testar Extraction Engine V2 com Golden Set
 * Processar os 9 arquivos representativos e validar
 */

import * as fs from "fs";
import * as path from "path";
import { extractFile, type ExtractionReport } from "../src/lib/extraction/v2/engine";

const fixturesDir = path.join(process.cwd(), "test-fixtures/genesis-golden-set");

async function main() {
  console.log("\n🧪 PHASE E — Testar Extraction Engine V2\n");

  if (!fs.existsSync(fixturesDir)) {
    console.error(`❌ Diretório de fixtures não encontrado: ${fixturesDir}`);
    process.exit(1);
  }

  // Ler manifesto do golden set
  const manifestPath = path.join(fixturesDir, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    console.error(`❌ Manifesto não encontrado: ${manifestPath}`);
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  const testFiles = manifest.files as Array<{
    fileName: string;
    relativePath: string;
    sizeBytes: number;
    format: string;
  }>;

  console.log(`📋 Processando ${testFiles.length} arquivos de teste...\n`);

  const results: ExtractionReport[] = [];
  const startTime = Date.now();

  for (let i = 0; i < testFiles.length; i++) {
    const test = testFiles[i];
    const filePath = path.join(fixturesDir, test.relativePath);

    process.stdout.write(
      `[${String(i + 1).padStart(2, "0")}/${testFiles.length}] ${test.fileName.padEnd(35)} `
    );

    if (!fs.existsSync(filePath)) {
      console.log(`❌ ARQUIVO NÃO ENCONTRADO`);
      continue;
    }

    try {
      const report = await extractFile(filePath);
      results.push(report);

      // Indicador de status visual
      const statusEmoji =
        report.status === "SUCCESS"
          ? "✓"
          : report.status.startsWith("HOLD")
            ? "⏸"
            : "❌";

      const details = [
        `${report.detectedFormat.padEnd(6)}`,
        `${report.extractionMethod.substring(0, 20).padEnd(20)}`,
      ];

      if (report.status === "SUCCESS") {
        details.push(`${report.textCharacterCount} chars`);
      } else {
        details.push(report.status);
      }

      console.log(`${statusEmoji} ${details.join(" | ")}`);
    } catch (err) {
      console.log(`❌ ERRO: ${err instanceof Error ? err.message : "unknown"}`);
    }
  }

  const totalTime = Date.now() - startTime;

  // Análise dos resultados
  console.log(`\n📊 RESUMO DOS TESTES:\n`);

  const successCount = results.filter((r) => r.status === "SUCCESS").length;
  const holdCount = results.filter((r) => r.status.startsWith("HOLD")).length;
  const errorCount = results.filter((r) => r.status.startsWith("ERROR")).length;

  console.log(`  Total testado: ${results.length}/${testFiles.length}`);
  console.log(`  ✓ Sucesso: ${successCount}`);
  console.log(`  ⏸ Hold/Fallback: ${holdCount}`);
  console.log(`  ❌ Erro: ${errorCount}`);
  console.log(`  ⏱️  Tempo total: ${(totalTime / 1000).toFixed(2)}s\n`);

  // Breakdown por formato detectado
  console.log(`📊 Breakdown por formato detectado:\n`);

  const formatGroups = new Map<string, ExtractionReport[]>();
  results.forEach((r) => {
    if (!formatGroups.has(r.detectedFormat)) {
      formatGroups.set(r.detectedFormat, []);
    }
    formatGroups.get(r.detectedFormat)!.push(r);
  });

  formatGroups.forEach((reports, format) => {
    const success = reports.filter((r) => r.status === "SUCCESS").length;
    console.log(`  ${format.padEnd(10)}: ${success}/${reports.length} sucesso`);
    reports.forEach((r) => {
      if (r.status === "SUCCESS") {
        console.log(
          `    • ${r.fileName.padEnd(35)} (${r.textCharacterCount} chars, ${r.extractionMethod})`
        );
      }
    });
  });

  // Breakdown por método de extração
  console.log(`\n📚 Métodos de extração utilizados:\n`);

  const methodGroups = new Map<string, ExtractionReport[]>();
  results.forEach((r) => {
    if (!methodGroups.has(r.extractionMethod)) {
      methodGroups.set(r.extractionMethod, []);
    }
    methodGroups.get(r.extractionMethod)!.push(r);
  });

  methodGroups.forEach((reports, method) => {
    const success = reports.filter((r) => r.status === "SUCCESS").length;
    console.log(`  ${method.padEnd(35)}: ${success}/${reports.length} sucesso`);
  });

  // Validações críticas
  console.log(`\n🔍 Validações críticas:\n`);

  const criticalChecks = [
    {
      name: "GEN-041 (RTF mascarado como .doc)",
      check: () => {
        const rtfDoc = results.find((r) => r.fileName === "gen-003-rtf-masqueraded-as-doc.doc");
        return (
          rtfDoc &&
          rtfDoc.detectedFormat === "RTF" &&
          rtfDoc.declaredExtension === ".doc"
        );
      },
    },
    {
      name: "Arquivo pequeno rejeitado (<50 chars)",
      check: () => {
        const small = results.find((r) => r.fileName === "gen-006-small-file.txt");
        return small && small.status === "HOLD_EMPTY";
      },
    },
    {
      name: "Arquivo grande processado (>1MB)",
      check: () => {
        const large = results.find((r) => r.fileName === "gen-007-large-file.txt");
        return large && large.status === "SUCCESS" && large.textCharacterCount > 100000;
      },
    },
    {
      name: "Tabela preservada em RTF",
      check: () => {
        const table = results.find((r) => r.fileName === "gen-005-doc-with-table.rtf");
        return (
          table &&
          table.status === "SUCCESS" &&
          (table.textContent.includes("Passagem") || table.textContent.includes("Gênesis"))
        );
      },
    },
    {
      name: "Conteúdo 'Entra Bendito do Senhor' extraído",
      check: () => {
        const blessed = results.find((r) => r.fileName === "gen-008-blessed-content.rtf");
        return (
          blessed &&
          blessed.status === "SUCCESS" &&
          blessed.textContent.includes("Entra Bendito do Senhor")
        );
      },
    },
    {
      name: "Múltiplas referências detectadas",
      check: () => {
        const mixed = results.find((r) => r.fileName === "gen-009-mixed-references.txt");
        return (
          mixed &&
          mixed.status === "SUCCESS" &&
          (mixed.textContent.includes("Gênesis 1") ||
            mixed.textContent.includes("Gênesis 2") ||
            mixed.textContent.includes("Gênesis 3"))
        );
      },
    },
  ];

  const passedChecks = criticalChecks.filter((check) => check.check()).length;

  criticalChecks.forEach((check) => {
    const passed = check.check();
    const icon = passed ? "✓" : "❌";
    console.log(`  ${icon} ${check.name}`);
  });

  console.log(`\n  Passou ${passedChecks}/${criticalChecks.length} validações críticas\n`);

  // Salvar relatório de teste detalhado
  const testReport = {
    timestamp: new Date().toISOString(),
    phase: "E",
    totalFiles: testFiles.length,
    processedFiles: results.length,
    successCount,
    holdCount,
    errorCount,
    processingTimeMs: totalTime,
    criticalChecks: {
      total: criticalChecks.length,
      passed: passedChecks,
      checks: criticalChecks.map((c) => ({
        name: c.name,
        passed: c.check(),
      })),
    },
    results: results.map((r) => ({
      fileName: r.fileName,
      declaredExtension: r.declaredExtension,
      detectedFormat: r.detectedFormat,
      status: r.status,
      extractionMethod: r.extractionMethod,
      textCharacterCount: r.textCharacterCount,
      warnings: r.warnings,
      confidence: r.confidence,
      processingTimeMs: r.processingTimeMs,
    })),
  };

  const reportPath = path.join(fixturesDir, "test-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(testReport, null, 2));

  console.log(`💾 Relatório de teste salvo: ${reportPath}\n`);

  if (passedChecks === criticalChecks.length) {
    console.log("✅ Todos os testes críticos PASSARAM!\n");
    console.log("Próximas fases:");
    console.log("  Phase F: Processar Gênesis real e gerar audit report\n");
    process.exit(0);
  } else {
    console.log(`⚠️  ${criticalChecks.length - passedChecks} validação(ões) falharam.\n`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("❌ Erro:", err);
  process.exit(1);
});
