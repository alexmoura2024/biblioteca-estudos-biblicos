/**
 * Auditoria: Verificar se os 20 do Lote 01 ainda existem no banco
 */

try {
  process.loadEnvFile(".env.local");
} catch {}

import { createClient } from "@supabase/supabase-js";

async function main() {
  console.log("\n🔍 AUDITORIA: LOTE 01 (20 estudos reais)\n");

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    { auth: { persistSession: false } }
  );

  // IDs oficiais do Lote 01
  const lote01Ids = [
    "SEL-001",
    "SEL-002",
    "SEL-003",
    "SEL-004",
    "SEL-005",
    "SEL-006",
    "SEL-007",
    "SEL-008",
    "SEL-010",
    "SEL-011",
    "SEL-016",
    "SEL-018",
    "SEL-019",
    "SEL-020",
    "SEL-021",
    "SEL-024",
    "SEL-027",
    "SEL-033",
    "SEL-034",
    "SEL-036",
  ];

  console.log("Procurando 20 estudos do Lote 01...\n");

  const found = [];
  const missing = [];

  for (const id of lote01Ids) {
    // Buscar por pilot_id (se existir) ou por padrão no título
    const { data: studies } = await supabase
      .from("studies")
      .select("id, titulo, status, conteudo, data_origem, created_at")
      .ilike("titulo", `%${id}%`);

    if (studies && studies.length > 0) {
      const study = studies[0];
      found.push({
        pilot_id: id,
        title: study.titulo,
        status: study.status,
        content_length: study.conteudo?.length || 0,
        uuid: study.id,
        data_origem: study.data_origem,
        created_at: study.created_at,
      });
      console.log(`✓ ${id}: ${study.status} (${study.conteudo?.length || 0} chars)`);
    } else {
      missing.push(id);
      console.log(`❌ ${id}: NÃO ENCONTRADO`);
    }
  }

  console.log(`\n📊 Resultado:`);
  console.log(`  Encontrados: ${found.length}/20`);
  console.log(`  Faltando: ${missing.length}/20`);

  if (missing.length > 0) {
    console.log(`\n⚠️  IDs não encontrados:`);
    missing.forEach((id) => console.log(`  • ${id}`));
  }

  // Contar por status
  const byStatus = {
    REVIEW: found.filter((s) => s.status === "REVIEW").length,
    DRAFT: found.filter((s) => s.status === "DRAFT").length,
    PUBLISHED: found.filter((s) => s.status === "PUBLISHED").length,
  };

  console.log(`\nPor status:`);
  console.log(`  REVIEW: ${byStatus.REVIEW}`);
  console.log(`  DRAFT: ${byStatus.DRAFT}`);
  console.log(`  PUBLISHED: ${byStatus.PUBLISHED}`);

  // Verificar datas inválidas
  const invalidDates = found.filter(
    (s) => !s.data_origem || s.data_origem === "1969-12-31"
  );
  if (invalidDates.length > 0) {
    console.log(`\n⚠️  Estudos com data 1969-12-31 ou nula: ${invalidDates.length}`);
  }

  console.log(`\n✅ Auditoria concluída\n`);
}

main().catch(console.error);
