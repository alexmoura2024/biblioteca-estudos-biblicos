/**
 * PIPELINE GENESIS AUDIT — Inventariar todos os arquivos textuais de Gênesis
 * Snapshot: tamanho, hash SHA-256, MIME, últimas linhas de extração
 * Nenhum arquivo é modificado.
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

interface FileAudit {
  name: string;
  relativePath: string;
  absolutePath: string;
  extension: string;
  sizeBytes: number;
  mtime: string;
  sha256: string;
  detectedMime?: string;
  category: "TEXTUAL" | "PRESENTATION" | "OTHER";
  error?: string;
}

async function computeSha256(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}

function detectMime(ext: string, buffer: Buffer): string {
  ext = ext.toLowerCase();

  // Magic bytes
  if (buffer[0] === 0xd0 && buffer[1] === 0xcf) return "application/msword"; // OLE/DOC
  if (buffer[0] === 0x50 && buffer[1] === 0x4b) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"; // DOCX
  if (buffer.subarray(0, 2).toString() === "\x7b\x5c") return "text/rtf"; // RTF starts with {\

  // Fallback to extension
  if (ext === ".docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (ext === ".doc") return "application/msword";
  if (ext === ".rtf") return "text/rtf";
  if (ext === ".txt") return "text/plain";
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".pptx") return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  if (ext === ".ppt") return "application/vnd.ms-powerpoint";

  return "application/octet-stream";
}

function categorizeFile(ext: string, mime: string): "TEXTUAL" | "PRESENTATION" | "OTHER" {
  ext = ext.toLowerCase();
  if ([".ppt", ".pptx", ".pps", ".ppsx"].includes(ext)) return "PRESENTATION";
  if ([".doc", ".docx", ".rtf", ".txt", ".pdf"].includes(ext)) return "TEXTUAL";
  if (mime.includes("powerpoint") || mime.includes("presentation")) return "PRESENTATION";
  return "OTHER";
}

async function auditGenesisFiles(): Promise<FileAudit[]> {
  const genesisPath = "G:\\Meu Drive\\Biblioteca Estudos Bíblicos\\00_BIBLIOTECA_VIRTUAL\\06_EDITORIAL\\04_BACKLOG_EDITORIAL\\01_GENESIS\\01_ARQUIVOS_DE_TEXTO";

  if (!fs.existsSync(genesisPath)) {
    console.error(`❌ Genesis path not found: ${genesisPath}`);
    process.exit(1);
  }

  console.log(`\n🔍 Auditando arquivos de Gênesis...\n`);

  const files = fs.readdirSync(genesisPath).filter((f) => {
    const stat = fs.statSync(path.join(genesisPath, f));
    return stat.isFile();
  });

  const audits: FileAudit[] = [];

  for (const file of files) {
    const absolutePath = path.join(genesisPath, file);
    const stat = fs.statSync(absolutePath);
    const ext = path.extname(file);

    try {
      const buffer = fs.readFileSync(absolutePath);
      const sha256 = await computeSha256(absolutePath);
      const mime = detectMime(ext, buffer);
      const category = categorizeFile(ext, mime);

      const audit: FileAudit = {
        name: file,
        relativePath: `01_GÊNESIS/${file}`,
        absolutePath,
        extension: ext,
        sizeBytes: stat.size,
        mtime: stat.mtime.toISOString(),
        sha256,
        detectedMime: mime,
        category,
      };

      audits.push(audit);
      console.log(`✓ ${file}`);
    } catch (err) {
      console.log(`✗ ${file} — Error: ${err instanceof Error ? err.message : "unknown"}`);
      audits.push({
        name: file,
        relativePath: `01_GÊNESIS/${file}`,
        absolutePath,
        extension: ext,
        sizeBytes: stat.size,
        mtime: stat.mtime.toISOString(),
        sha256: "ERROR",
        category: "OTHER",
        error: `${err instanceof Error ? err.message : "unknown"}`,
      });
    }
  }

  return audits;
}

async function main() {
  console.log("\n📋 GENESIS AUDIT\n");

  const audits = await auditGenesisFiles();

  console.log(`\n\n📊 RESUMO:\n`);
  console.log(`Total de arquivos: ${audits.length}`);

  const byCategory = audits.reduce((acc: Record<string, number>, a) => {
    acc[a.category] = (acc[a.category] || 0) + 1;
    return acc;
  }, {});

  Object.entries(byCategory).forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count}`);
  });

  const textualFiles = audits.filter((a) => a.category === "TEXTUAL");
  console.log(`\n✓ TEXTUAL arquivos: ${textualFiles.length}`);

  // Salvar snapshot
  const snapshotPath = path.join(
    process.cwd(),
    "artifacts/bible-markdown-pipeline/snapshots",
    `genesis-audit-${new Date().toISOString().split("T")[0]}.json`
  );

  fs.writeFileSync(
    snapshotPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        source_path: "G:\\Meu Drive\\Biblioteca Estudos Bíblicos\\00_BIBLIOTECA_VIRTUAL\\06_EDITORIAL\\04_BACKLOG_EDITORIAL\\01_GENESIS\\01_ARQUIVOS_DE_TEXTO",
        total_files: audits.length,
        textual_files: textualFiles.length,
        summary: byCategory,
        files: audits,
      },
      null,
      2
    )
  );

  console.log(`\n💾 Snapshot salvo: ${snapshotPath}\n`);
}

main().catch(console.error);
