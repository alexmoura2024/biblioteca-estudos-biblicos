/**
 * Lista estudos Fase 1 pelo conteúdo/slug pattern
 * Os reais têm títulos dos arquivos, os mockados têm padrão diferente
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "http://127.0.0.1:54321",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"
);

async function main() {
  console.log(
    "\n📋 LOTE 01 — Estudos REVIEW + DRAFT (20 reais que ingerimos)\n"
  );
  console.log("Status  | Título (50 char)                           | Slug");
  console.log("------- | -------------------------------------------- | --------------------");

  const { data: studies } = await supabase
    .from("studies")
    .select("id, titulo, status, slug")
    .in("status", ["REVIEW", "DRAFT"])
    .order("created_at", { ascending: false });

  if (!studies) {
    console.log("Erro ao consultar banco");
    return;
  }

  const reviewCount = studies.filter((s) => s.status === "REVIEW").length;
  const draftCount = studies.filter((s) => s.status === "DRAFT").length;

  console.log(
    `${studies
      .slice(0, 20)
      .map((s) => {
        const titulo = (s.titulo || "N/A").substring(0, 44).padEnd(44);
        return `${s.status.padEnd(7)}| ${titulo} | ${s.slug}`;
      })
      .join("\n")}`
  );

  console.log("\n📊 RESUMO");
  console.log(`Total REVIEW: ${reviewCount}`);
  console.log(`Total DRAFT:  ${draftCount}`);
  console.log(`Total (REVIEW+DRAFT): ${reviewCount + draftCount}`);

  // Identifique os DRAFT
  if (draftCount > 0) {
    console.log("\n⚠️ ESTUDOS EM DRAFT:");
    studies
      .filter((s) => s.status === "DRAFT")
      .forEach((s) => {
        console.log(`  - ${s.slug}: "${s.titulo}"`);
      });
  }

  // Check se foi bem-sucedido
  if (reviewCount + draftCount === 20) {
    console.log(
      `\n✅ LOTE 01 INGERE COMPLETO: 20 estudos (${reviewCount} REVIEW + ${draftCount} DRAFT)`
    );
  }
}

main();
