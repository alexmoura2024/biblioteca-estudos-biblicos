/**
 * Fase 3 — Etapa 6: validação do banco após a ingestão do piloto.
 * Usa o cliente service_role (lê/escreve sem RLS) só para LER e
 * comprovar as invariantes pedidas pelo protocolo — não escreve nada.
 *
 * Uso: npx tsx scripts/fase3-validate-db.ts
 */
try {
  process.loadEnvFile(".env.local");
} catch {
  // pode já estar carregado
}

import { getSupabaseServiceClient } from "../src/lib/supabase/serviceClient";

async function main() {
  const client = getSupabaseServiceClient();

  const { data: files, error: filesError } = await client
    .from("files")
    .select("id, drive_file_id, nome_original, status_processamento, study_id");
  if (filesError) throw new Error(filesError.message);

  const { data: jobs, error: jobsError } = await client.from("ingestion_jobs").select("stage, status");
  if (jobsError) throw new Error(jobsError.message);

  const studyIds = [...new Set((files ?? []).map((f) => f.study_id).filter((id): id is string => Boolean(id)))];
  const { data: studies, error: studiesError } = await client
    .from("studies")
    .select("id, titulo, slug, status, autor, data_origem")
    .in("id", studyIds.length > 0 ? studyIds : ["00000000-0000-0000-0000-000000000000"]);
  if (studiesError) throw new Error(studiesError.message);

  console.log(`files: ${files?.length ?? 0} linhas`);
  console.log(`ingestion_jobs: ${jobs?.length ?? 0} linhas`);
  console.log(`studies vinculados a um files (reais, não mockados): ${studies?.length ?? 0}`);
  console.log("");

  const byStatus: Record<string, number> = {};
  for (const s of studies ?? []) byStatus[s.status] = (byStatus[s.status] ?? 0) + 1;
  console.log("Estudos reais por status:", byStatus);

  const published = (studies ?? []).filter((s) => s.status === "PUBLISHED");
  console.log(`\nZERO estudos reais PUBLISHED? ${published.length === 0 ? "SIM" : `NÃO — ${published.length} PUBLICADO(S): ${published.map((s) => s.titulo).join(", ")}`}`);

  const driveFileIds = (files ?? []).map((f) => f.drive_file_id);
  const uniqueDriveFileIds = new Set(driveFileIds);
  console.log(`\nZERO drive_file_id duplicado em files? ${driveFileIds.length === uniqueDriveFileIds.size ? "SIM" : "NÃO"} (${driveFileIds.length} linhas, ${uniqueDriveFileIds.size} ids únicos)`);

  console.log("\n--- Casos editoriais específicos ---");
  for (const s of studies ?? []) {
    if (s.titulo.includes("PÃO E VINHO")) {
      const { data: passages } = await client
        .from("study_passages")
        .select("tipo_relacao, prioridade, passages(referencia_normalizada)")
        .eq("study_id", s.id);
      console.log(`PÃO E VINHO (${s.status}): ${JSON.stringify(passages)}`);
    }
    if (s.titulo.includes("Caminho, Verdade e Vida")) {
      console.log(`SEL-009 "Caminho, Verdade e Vida" (${s.status}) — divergência título x conteúdo esperada, ver ingestion_jobs/relatório da ingestão.`);
    }
    if (s.titulo === "O evangelho eterno") {
      console.log(`O evangelho eterno (${s.status}) — deve permanecer não-PUBLISHED com divergência AT/NT registrada no relatório da ingestão.`);
    }
  }
}

main().catch((error) => {
  console.error("Erro na validação:", error);
  process.exit(1);
});
