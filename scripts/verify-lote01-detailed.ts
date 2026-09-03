/**
 * Verifica em detalhe os 20 estudos do Lote 01
 * Lista: pilot_id | título | status | referência principal
 * Busca via ingestion_jobs.file_id → files.drive_file_id (pilot_id)
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "http://127.0.0.1:54321",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"
);

const LOTE01_IDS = [
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

interface StudyDetail {
  pilot_id: string;
  titulo: string;
  status: string;
  passagens: string[];
}

async function main() {
  console.log("\n📋 VERIFICAÇÃO FINAL — LOTE 01 TEXTUAL (20 ESTUDOS)\n");
  console.log(
    "pilot_id  | Status   | Título (primeiros 40 char)             | Referência Principal"
  );
  console.log(
    "--------  | -------- | -------------------------------------- | --------------------"
  );

  const studies: StudyDetail[] = [];

  for (const pilot_id of LOTE01_IDS) {
    // Query: buscar arquivo via drive_file_id (que é o pilot_id)
    const { data: files, error: fileErr } = await supabase
      .from("files")
      .select("id, study_id, studies(id, titulo, status)")
      .eq("drive_file_id", pilot_id)
      .single();

    if (fileErr || !files) {
      console.log(`${pilot_id}  | ERROR    | File not found in files table          | N/A`);
      continue;
    }

    if (!files.study_id) {
      console.log(`${pilot_id}  | PENDING  | No study linked to file yet            | N/A`);
      continue;
    }

    const study = Array.isArray(files.studies) ? files.studies[0] : files.studies;
    if (!study) {
      console.log(`${pilot_id}  | ERROR    | Study not found                        | N/A`);
      continue;
    }

    // Query: buscar passagens deste study (usar study.id)
    const { data: passages } = await supabase
      .from("study_passages")
      .select("passages(referencia_normalizada), priority")
      .eq("study_id", study.id)
      .order("priority", { ascending: true })
      .limit(1);

    const mainRef =
      passages && passages.length > 0
        ? (passages[0].passages as any)?.referencia_normalizada || "Nenhuma"
        : "Nenhuma";

    const titulo = (study.titulo || "N/A").substring(0, 36).padEnd(36);
    const status = (study.status || "?").padEnd(8);

    console.log(`${pilot_id}  | ${status} | ${titulo} | ${mainRef}`);

    studies.push({
      pilot_id,
      titulo: study.titulo || "N/A",
      status: study.status || "UNKNOWN",
      passagens: passages?.map((p: any) => (p.passages as any)?.referencia_normalizada) || [],
    });
  }

  // Resumo
  const statusCounts = {
    REVIEW: studies.filter((s) => s.status === "REVIEW").length,
    DRAFT: studies.filter((s) => s.status === "DRAFT").length,
    PUBLISHED: studies.filter((s) => s.status === "PUBLISHED").length,
  };

  console.log("\n📊 RESUMO LOTE 01");
  console.log(`Total encontrado: ${studies.length}/${LOTE01_IDS.length}`);
  console.log(`  REVIEW:     ${statusCounts.REVIEW}`);
  console.log(`  DRAFT:      ${statusCounts.DRAFT}`);
  console.log(`  PUBLISHED:  ${statusCounts.PUBLISHED}`);

  // Diagnosticar DRAFT
  if (statusCounts.DRAFT > 0) {
    console.log("\n⚠️ ESTUDOS EM DRAFT:");
    studies
      .filter((s) => s.status === "DRAFT")
      .forEach((s) => {
        const reason =
          s.passagens.length > 0
            ? `tem ${s.passagens.length} passagem(ns) mas ainda em DRAFT`
            : "NENHUMA PASSAGEM (detector automático falhou)";
        console.log(`  ${s.pilot_id}: "${s.titulo.substring(0, 50)}" — ${reason}`);
      });
  }

  console.log("\n🎯 OBJETIVO FINAL");
  if (statusCounts.REVIEW === 20 && statusCounts.DRAFT === 0 && statusCounts.PUBLISHED === 0) {
    console.log("✅ LOTE 01 PERFEITO: 20 REVIEW, 0 DRAFT, 0 PUBLISHED");
  } else if (studies.length === 20) {
    console.log(
      `⚠️ LOTE 01 STATUS MISTO: ${statusCounts.REVIEW} REVIEW, ${statusCounts.DRAFT} DRAFT, ${statusCounts.PUBLISHED} PUBLISHED`
    );
    if (statusCounts.DRAFT > 0) {
      console.log(
        "   → AÇÃO: Aplicar referências editoriais aprovadas aos DRAFT para converter para REVIEW"
      );
    }
  } else {
    console.log(
      `❌ LOTE 01 INCOMPLETO: ${studies.length} estudos encontrados (esperado 20)`
    );
  }
}

main().catch((err) => {
  console.error("❌ Erro:", err);
  process.exit(1);
});
