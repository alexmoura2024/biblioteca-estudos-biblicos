/**
 * Fase 3 — validação do manifesto do piloto (docs/fase3-piloto/) +
 * diagnóstico de duplicidade dos 12 candidatos. Não toca em nenhum
 * banco nem no Drive — só lê e valida o CSV já commitado. Rodar com:
 *   npx tsx scripts/fase3-validate-manifest.ts
 */
import { diagnoseDuplicates } from "../src/lib/ingestion/duplicates";
import { loadManifest, validateManifest } from "../src/lib/ingestion/manifest";

const manifest = loadManifest();
const validation = validateManifest(manifest);

console.log(`Total de candidatos: ${validation.totalRows}`);
console.log(`Por fila: ${JSON.stringify(validation.countsByQueue)}`);
console.log(`Válido (sem erros)? ${validation.ok ? "SIM" : "NÃO"}`);
console.log("");

if (validation.issues.length > 0) {
  console.log(`--- ${validation.issues.length} issue(s) ---`);
  for (const issue of validation.issues) {
    console.log(`[${issue.severity.toUpperCase()}] ${issue.code}: ${issue.message}`);
  }
  console.log("");
}

const dupRows = manifest.filter((r) => r.queue === "DUPLICADOS_POSSIVEIS");
const diagnoses = diagnoseDuplicates(dupRows);
console.log(`--- Diagnóstico de duplicidade (${dupRows.length} candidatos, ${diagnoses.length} pares) ---`);
for (const d of diagnoses) {
  console.log(`${d.duplicateGroup}: ${d.pilotIdA} x ${d.pilotIdB} -> ${d.classification} (${d.reason})`);
}
