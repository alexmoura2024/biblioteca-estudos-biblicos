/**
 * PURGE CRÍTICO — Remover TODOS os dados fake do banco editorial
 *
 * Classificação:
 * - VERIFIED_REAL: estudo comprovado real (provenance, conteúdo real, arquivo real)
 * - MOCK: seed/prototipo/exemplo (nunca deve chegar ao operacional)
 * - PLACEHOLDER: criado artificialmente sem dados reais
 * - SYNTHETIC: conteúdo gerado/fake
 * - UNVERIFIED: sem evidência de origem real
 *
 * AÇÃO: Remover tudo que não seja VERIFIED_REAL
 */

try {
  process.loadEnvFile(".env.local");
} catch {}

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  { auth: { persistSession: false } }
);

interface AuditedStudy {
  id: string;
  titulo: string;
  autor: string;
  status: string;
  conteudo_length: number;
  has_files: boolean;
  drive_file_id: string | null;
  classification: "VERIFIED_REAL" | "MOCK" | "PLACEHOLDER" | "SYNTHETIC" | "UNVERIFIED";
  reason: string;
}

async function auditStudy(study: Record<string, unknown>): Promise<AuditedStudy> {
  const { data: files } = await supabase
    .from("study_files")
    .select("drive_file_id")
    .eq("study_id", study.id as string)
    .limit(1);

  const titulo = study.titulo as string;
  const autor = (study.autor as string) || "";
  const conteudo = (study.conteudo as string) || "";
  const status = study.status as string;

  let classification: "VERIFIED_REAL" | "MOCK" | "PLACEHOLDER" | "SYNTHETIC" | "UNVERIFIED" = "UNVERIFIED";
  let reason = "";

  // Detectar MOCK / SEED
  if (autor.includes("Prototipo") || autor.includes("prototype")) {
    classification = "MOCK";
    reason = "Autor contém 'Prototipo' — seed de demonstração";
  }

  // Detectar PLACEHOLDER
  else if (conteudo.includes("Estudo restaurado:") && conteudo.includes("Conteúdo integral a ser verificado")) {
    classification = "PLACEHOLDER";
    reason = "Conteúdo reconhecido como placeholder do restore-lote01-quick.ts";
  }

  // Detectar SYNTHETIC (resumo genérico padrão)
  else if (conteudo.includes("Estudo do Lote 01:") && conteudo.length < 200) {
    classification = "SYNTHETIC";
    reason = "Conteúdo sintético gerado (restauração incompleta)";
  }

  // Detectar VERIFIED_REAL (tem provenance)
  else if (files && files.length > 0 && (files[0] as Record<string, unknown>).drive_file_id) {
    classification = "VERIFIED_REAL";
    reason = "Tem drive_file_id real na tabela files";
  }

  // Sem provenance = não é real
  else if (!files || files.length === 0) {
    classification = "UNVERIFIED";
    reason = "Sem study_files ou drive_file_id";
  }

  return {
    id: study.id as string,
    titulo,
    autor,
    status,
    conteudo_length: conteudo.length,
    has_files: (files?.length || 0) > 0,
    drive_file_id: files && files.length > 0 ? ((files[0] as Record<string, unknown>).drive_file_id as string) : null,
    classification,
    reason,
  };
}

async function main() {
  console.log("\n🔍 AUDITORIA PRÉ-PURGE\n");

  // 1. Buscar todos os estudos
  const { data: allStudies, error: studiesError } = await supabase
    .from("studies")
    .select("id, titulo, autor, status, conteudo");

  if (studiesError || !allStudies) {
    console.error("❌ Erro ao buscar estudos:", studiesError);
    return;
  }

  console.log(`📊 Total de registros no banco: ${allStudies.length}\n`);

  // 2. Auditar cada estudo
  console.log("Auditando cada registro...\n");
  const audited: AuditedStudy[] = [];

  for (const study of allStudies) {
    const result = await auditStudy(study);
    audited.push(result);
  }

  // 3. Classificar
  const classified = {
    VERIFIED_REAL: audited.filter((a) => a.classification === "VERIFIED_REAL"),
    MOCK: audited.filter((a) => a.classification === "MOCK"),
    PLACEHOLDER: audited.filter((a) => a.classification === "PLACEHOLDER"),
    SYNTHETIC: audited.filter((a) => a.classification === "SYNTHETIC"),
    UNVERIFIED: audited.filter((a) => a.classification === "UNVERIFIED"),
  };

  console.log("📋 CLASSIFICAÇÃO:\n");
  console.log(`✅ VERIFIED_REAL:    ${classified.VERIFIED_REAL.length}`);
  console.log(`❌ MOCK:             ${classified.MOCK.length}`);
  console.log(`❌ PLACEHOLDER:      ${classified.PLACEHOLDER.length}`);
  console.log(`❌ SYNTHETIC:        ${classified.SYNTHETIC.length}`);
  console.log(`❓ UNVERIFIED:       ${classified.UNVERIFIED.length}\n`);

  // 4. Criar snapshot ANTES de deletar
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(process.cwd(), "artifacts", "database-cleanup");

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const backupPath = path.join(backupDir, `pre-purge-${timestamp}.json`);

  const backup = {
    timestamp: new Date().toISOString(),
    total_before: allStudies.length,
    audit_results: audited,
    summary: {
      verified_real: classified.VERIFIED_REAL.length,
      to_remove: classified.MOCK.length + classified.PLACEHOLDER.length + classified.SYNTHETIC.length + classified.UNVERIFIED.length,
      mocks: classified.MOCK.length,
      placeholders: classified.PLACEHOLDER.length,
      synthetic: classified.SYNTHETIC.length,
      unverified: classified.UNVERIFIED.length,
    },
  };

  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
  console.log(`💾 Snapshot criado: ${backupPath}\n`);

  // 5. Listar estudos a remover
  const toRemove = [
    ...classified.MOCK,
    ...classified.PLACEHOLDER,
    ...classified.SYNTHETIC,
    ...classified.UNVERIFIED,
  ];

  console.log("📝 REGISTROS A REMOVER:\n");
  console.log("| UUID | TITLE | CLASSIFICATION | REASON |");
  console.log("|------|-------|-----------------|--------|");

  for (const study of toRemove) {
    console.log(
      `| ${study.id.substring(0, 8)}... | ${study.titulo.substring(0, 20)} | ${study.classification} | ${study.reason.substring(0, 30)} |`
    );
  }

  console.log(`\n🗑️  PURGE_CANDIDATES = ${toRemove.length}\n`);

  if (toRemove.length === 0) {
    console.log("✅ Nenhum registro fake encontrado. Banco já limpo.\n");
    console.log("VERDICT: PASS\n");
    return;
  }

  // 6. Confirmar deleção
  console.log("⚠️  CONFIRMAÇÃO REQUERIDA\n");
  console.log("REMOVER:");
  console.log(`  • ${classified.MOCK.length} MOCK`);
  console.log(`  • ${classified.PLACEHOLDER.length} PLACEHOLDER`);
  console.log(`  • ${classified.SYNTHETIC.length} SYNTHETIC`);
  console.log(`  • ${classified.UNVERIFIED.length} UNVERIFIED`);
  console.log(`\nTotal a remover: ${toRemove.length}`);
  console.log(`Mantendo: ${classified.VERIFIED_REAL.length} estudos reais\n`);

  // ⚠️ Para este script de demostração, NÃO executar DELETE automaticamente
  // Esperando confirmação explícita do usuário ou script de delete separado

  console.log("STATUS: AUDITORIA COMPLETA — AGUARDANDO CONFIRMAÇÃO DE PURGE\n");
  console.log(
    "Para prosseguir com a exclusão, execute: npm run db:purge-confirmed\n"
  );
}

main().catch(console.error);
