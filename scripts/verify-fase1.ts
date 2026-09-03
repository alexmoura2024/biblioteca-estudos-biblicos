/**
 * Verifica e reporta os detalhes de Fase 1 no banco de dados
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "http://127.0.0.1:54321",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"
);

const FASE1_IDS = ["SEL-001", "SEL-002", "SEL-003", "SEL-004", "SEL-005", "SEL-006", "SEL-007", "SEL-008", "SEL-010", "SEL-011", "SEL-016", "SEL-018", "SEL-019", "SEL-020", "SEL-021", "SEL-024", "SEL-027", "SEL-033", "SEL-034", "SEL-036"];

async function main() {
  console.log("\n🔍 VALIDAÇÃO FASE 1 — CONTAGENS DO BANCO DE DADOS\n");

  // Get all studies to see what we have
  const { data: allStudies, error: err1 } = await supabase.from("studies").select("id, titulo, status, slug");

  if (err1) {
    console.error("❌ Erro consultando estudos:", err1);
    process.exit(1);
  }

  console.log("📊 ESTATÍSTICAS GERAIS");
  console.log(`  Total de estudos no banco: ${allStudies?.length || 0}`);

  // Status breakdown
  const statusCounts: Record<string, number> = {};
  allStudies?.forEach((s) => {
    statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
  });

  console.log("  Status breakdown:");
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`    - ${status}: ${count}`);
  });

  const published = statusCounts["PUBLISHED"] || 0;
  console.log(`\n  ✅ PUBLISHED count: ${published} (deve ser 0)`);

  // Estudos recentes (ingeridos nesta sessão)
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const recentStudies = allStudies?.filter((s) => new Date(s.slug) > oneHourAgo) || [];

  console.log(`\n📋 FASE 1 TEXTUAL — ${FASE1_IDS.length} ESTUDOS ESPERADOS`);
  console.log(`  Estudos criados nesta sessão (últimos 60 min): ${recentStudies.length}`);

  // Tentar encontrar estudos pela slug pattern de Fase 1 (que começam com "sel-" ou incluem os titles)
  // Na verdade, vamos listar todos os estudos e checar manualmente
  console.log("\n  Todos os estudos no banco:");
  allStudies?.forEach((s) => {
    const estatu = `[${s.status}]`;
    const title = s.titulo?.substring(0, 35) || "N/A";
    console.log(`    ${s.slug}: ${title} ${estatu}`);
  });

  // Count REVIEW + DRAFT
  const reviewDraft = allStudies?.filter((s) => s.status === "REVIEW" || s.status === "DRAFT") || [];
  console.log(`\n📊 RESUMO FINAL`);
  console.log(`  Total estudos: ${allStudies?.length || 0}`);
  console.log(`  REVIEW + DRAFT: ${reviewDraft.length}`);
  console.log(`  PUBLISHED: ${published} (deve ser 0 para reais)`);

  if (published === 0) {
    console.log("\n✅ VALIDAÇÃO — Nenhum estudo real marcado como PUBLISHED\n");
  } else {
    console.log("\n⚠️ ERRO — Estudos reais foram marcados como PUBLISHED\n");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("❌ Erro:", err);
  process.exit(1);
});
