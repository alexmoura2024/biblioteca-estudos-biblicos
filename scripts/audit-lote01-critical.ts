/**
 * AUDITORIA CRÍTICA — Lote 01
 * Valida se os 20 estudos no banco correspondem à matriz editorial oficial
 */

try {
  process.loadEnvFile(".env.local");
} catch {}

import { createClient } from "@supabase/supabase-js";

// Títulos oficiais do Lote 01 (matriz editorial)
const LOTE01_OFFICIAL = [
  { id: "SEL-001", titulo: "O Cajado" },
  { id: "SEL-002", titulo: "Instrumentistas" },
  { id: "SEL-003", titulo: "O Fim de Toda Carne" },
  { id: "SEL-004", titulo: "Madrugada" },
  { id: "SEL-005", titulo: "A Minha Alma Tem Sede do Deus Vivo" },
  { id: "SEL-006", titulo: "O Senhor É o Meu Pastor" },
  { id: "SEL-007", titulo: "A Revelação" },
  { id: "SEL-008", titulo: "O Discípulo Tomé" },
  { id: "SEL-010", titulo: "A Escolha do Cordeiro" },
  { id: "SEL-011", titulo: "O Tabernáculo" },
  { id: "SEL-016", titulo: "A Glória de Deus" },
  { id: "SEL-018", titulo: "O Bom Pastor" },
  { id: "SEL-019", titulo: "Moveu-se de Íntima Compaixão" },
  { id: "SEL-020", titulo: "A Ovelha Perdida" },
  { id: "SEL-021", titulo: "O Ministério" },
  { id: "SEL-024", titulo: "Santidade, Justiça e Graça" },
  { id: "SEL-027", titulo: "A Porta Aberta" },
  { id: "SEL-033", titulo: "Pão e Vinho" },
  { id: "SEL-034", titulo: "Jesus, a Fonte da Salvação" },
  { id: "SEL-036", titulo: "A Comunhão" },
];

async function main() {
  console.log("\n🔍 AUDITORIA CRÍTICA — LOTE 01\n");

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    { auth: { persistSession: false } }
  );

  const results: Array<{
    sel: string;
    expected: string;
    found: string | null;
    match: boolean;
    content_length: number;
    source_count: number;
    drive_id: string | null;
    status: string | null;
  }> = [];

  for (const official of LOTE01_OFFICIAL) {
    const { data: study } = await supabase
      .from("studies")
      .select("id, titulo, conteudo, status")
      .ilike("titulo", `%${official.titulo}%`)
      .limit(1)
      .single();

    const { data: files } = await supabase
      .from("study_files")
      .select("drive_file_id")
      .eq("study_id", study?.id || "none");

    results.push({
      sel: official.id,
      expected: official.titulo,
      found: study?.titulo || null,
      match: study?.titulo === official.titulo,
      content_length: study?.conteudo?.length || 0,
      source_count: files?.length || 0,
      drive_id: (files?.[0] as any)?.drive_file_id || null,
      status: study?.status || null,
    });
  }

  console.log("📋 VALIDAÇÃO 20/20\n");
  console.log("| SEL | EXPECTED | FOUND | MATCH | CONTENT | SOURCES | DRIVE_ID | STATUS |");
  console.log("|-----|----------|-------|-------|---------|---------|----------|--------|");

  let matches = 0;
  for (const r of results) {
    const match = r.match ? "✅" : "❌";
    const content = r.content_length > 0 ? "✅" : "❌";
    const sources = r.source_count > 0 ? "✅" : "❌";
    const drive = r.drive_id ? "✅" : "❌";
    const status = r.status === "REVIEW" ? "✅" : "❌";

    console.log(
      `| ${r.sel} | ${r.expected.substring(0, 8)}... | ${r.found?.substring(0, 8) || "NULL"}... | ${match} | ${content} | ${sources} | ${drive} | ${status} |`
    );

    if (r.match) matches++;
  }

  console.log("\n📊 RESULTADO:\n");
  console.log(`LOTE01_MATRIX_MATCH = ${matches}/20`);
  console.log(`REAL_CONTENT = ${results.filter((r) => r.content_length > 0).length}/20`);
  console.log(`REAL_PROVENANCE = ${results.filter((r) => r.drive_id).length}/20`);

  console.log("\n⚠️  DIAGNÓSTICO:\n");
  console.log(`WERE_SYNTHETIC_TITLES_CREATED = ${matches < 20}`);
  console.log(
    `WERE_SYNTHETIC_CONTENTS_CREATED = ${results.some((r) => r.content_length > 0 && r.content_length < 200)}`
  );
  console.log(`WERE_PLACEHOLDERS_CREATED = ${matches < 20 || results.some((r) => !r.drive_id)}`);

  if (matches === 20) {
    console.log("\n✅ LOTE 01 AUDITORIA PASS");
  } else {
    console.log(`\n❌ LOTE 01 AUDITORIA FAIL — ${20 - matches}/20 mismatch`);
  }

  console.log("");
}

main().catch(console.error);
