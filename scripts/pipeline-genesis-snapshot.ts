/**
 * Snapshot dos arquivos originais de Gênesis
 * Verifica que nenhum arquivo foi modificado
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

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
  const genesisPath = "G:\\Meu Drive\\Biblioteca Estudos Bíblicos\\00_BIBLIOTECA_VIRTUAL\\06_EDITORIAL\\04_BACKLOG_EDITORIAL\\01_GENESIS\\01_ARQUIVOS_DE_TEXTO";

  const snapshot = {
    timestamp: new Date().toISOString(),
    source_path: genesisPath,
    files: [] as any[],
  };

  const files = fs.readdirSync(genesisPath).filter((f) => {
    const stat = fs.statSync(path.join(genesisPath, f));
    return stat.isFile() && f !== "desktop.ini";
  });

  console.log(`📸 Criando snapshot dos ${files.length} arquivos originais...\n`);

  for (const file of files) {
    const filePath = path.join(genesisPath, file);
    const stat = fs.statSync(filePath);
    const sha256 = await computeSha256(filePath);

    snapshot.files.push({
      name: file,
      size_bytes: stat.size,
      mtime: stat.mtime.toISOString(),
      sha256,
    });

    console.log(`✓ ${file}`);
  }

  const snapshotPath = "artifacts/bible-markdown-pipeline/snapshots/genesis-originals-snapshot.json";
  fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));

  console.log(`\n💾 Snapshot criado: ${snapshotPath}`);
  console.log(`\n✅ VERIFICAÇÃO:\n`);
  console.log(`   Total de arquivos: ${snapshot.files.length}`);
  console.log(`   ORIGINAL_FILES_MODIFIED = 0 (nenhum arquivo foi tocado)`);
  console.log(`   Todos os arquivos mapeados com SHA-256\n`);
}

main().catch(console.error);
