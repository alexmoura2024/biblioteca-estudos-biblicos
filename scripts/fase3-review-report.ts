/**
 * Fase 3 — Etapa 10: visualização administrativa/local de DRAFT/REVIEW.
 *
 * Gera um relatório Markdown com tudo que um revisor humano precisa
 * para aprovar/rejeitar cada estudo real ingerido — sem construir um
 * CMS completo, e sem expor `service_role` em nenhuma rota pública
 * (CLAUDE.md §3): este é um SCRIPT local, nunca uma página em
 * src/app/**. A área pública do site continua mostrando só PUBLISHED
 * (RLS garante isso independentemente deste relatório).
 *
 * Uso: npx tsx scripts/fase3-review-report.ts > docs/fase3-piloto/RELATORIO_REVISAO.md
 */
try {
  process.loadEnvFile(".env.local");
} catch {
  // pode já estar carregado
}

import { loadManifest } from "../src/lib/ingestion/manifest";
import { classifyReferences, scanReferences } from "../src/lib/ingestion/referenceScan";
import { getSupabaseServiceClient } from "../src/lib/supabase/serviceClient";

/**
 * Recalcula as mesmas divergências que `pipeline.ts` calcula durante a
 * ingestão (testamento da origem x testamento do conteúdo; referência
 * preliminar do manifesto x referência principal do conteúdo) — mas
 * aqui, DEPOIS do fato, a partir do `conteudo` já salvo, só para exibir
 * no relatório (as divergências em si não são persistidas em nenhuma
 * coluna; recalcular é mais simples do que adicionar uma). Mantém a
 * MESMA lógica de `pipeline.ts` deliberadamente — se um dia divergir,
 * é sinal de que vale a pena extrair um helper compartilhado.
 */
function computeDivergences(manifestRow: ReturnType<typeof loadManifest>[number] | undefined, conteudo: string): string[] {
  if (!manifestRow) return [];
  const classified = classifyReferences(scanReferences(conteudo));
  const principal = classified[0];
  if (!principal) return [];

  const divergencias: string[] = [];
  if (manifestRow.testament && principal.book.testamento !== manifestRow.testament) {
    divergencias.push(
      `Origem classificada como ${manifestRow.testament}, mas a referência principal do conteúdo (${principal.book.nome} ${principal.capitulo}) é do ${principal.book.testamento}.`,
    );
  }
  if (manifestRow.preliminaryReference) {
    const preliminaryParsed = classifyReferences(scanReferences(manifestRow.preliminaryReference))[0];
    if (
      preliminaryParsed &&
      (preliminaryParsed.book.slug !== principal.book.slug ||
        preliminaryParsed.capitulo !== principal.capitulo ||
        preliminaryParsed.versiculoInicio !== principal.versiculoInicio)
    ) {
      divergencias.push(`Referência preliminar do manifesto ("${manifestRow.preliminaryReference}") diverge da referência principal do conteúdo (${principal.matchedText}).`);
    }
  }
  return divergencias;
}

async function main() {
  const manifest = loadManifest();
  const client = getSupabaseServiceClient();

  const { data: files, error: filesError } = await client
    .from("files")
    .select("id, drive_file_id, nome_original, drive_url, mime_type, status_processamento, study_id, hash_conteudo, modified_time")
    .not("study_id", "is", null);
  if (filesError) throw new Error(filesError.message);

  console.log("# Relatório de revisão — piloto da Fase 3\n");
  console.log(`Gerado em ${new Date().toISOString()}. ${files?.length ?? 0} estudo(s) real(is) aguardando revisão humana.\n`);
  console.log("Nenhum destes estudos está publicamente visível (RLS restringe a `status='PUBLISHED'`) — todos nasceram `DRAFT`/`REVIEW`.\n");
  console.log("---\n");

  for (const file of files ?? []) {
    const { data: study } = await client
      .from("studies")
      .select("id, titulo, slug, status, resumo, conteudo, autor, data_origem, palavras_chave")
      .eq("id", file.study_id)
      .single();
    if (!study) continue;

    const { data: passages } = await client
      .from("study_passages")
      .select("tipo_relacao, prioridade, passages(referencia_normalizada)")
      .eq("study_id", study.id)
      .order("prioridade");
    const { data: topicLinks } = await client.from("study_topics").select("topics(nome)").eq("study_id", study.id);
    const { data: characterLinks } = await client.from("study_characters").select("characters(nome)").eq("study_id", study.id);

    console.log(`## ${study.titulo}\n`);
    console.log(`- **Status:** ${study.status}`);
    console.log(`- **Slug:** \`${study.slug}\``);
    console.log(`- **Origem (Drive):** [${file.nome_original}](${file.drive_url}) — drive_file_id \`${file.drive_file_id}\``);
    console.log(`- **MIME original:** ${file.mime_type}`);
    console.log(`- **Autor:** ${study.autor}`);
    console.log(`- **Data de origem:** ${study.data_origem}`);
    console.log(`- **Palavras-chave sugeridas:** ${(study.palavras_chave ?? []).join(", ") || "(nenhuma)"}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase-js não infere a forma exata de um join aninhado; script local, não exportado.
    const refs = (passages ?? []).map((p: any) => `${p.passages?.referencia_normalizada ?? "?"} (${p.tipo_relacao})`);
    console.log(`- **Referências detectadas:** ${refs.join("; ") || "NENHUMA — classificação incompleta"}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const topicsList = (topicLinks ?? []).map((t: any) => t.topics?.nome).filter(Boolean);
    console.log(`- **Temas sugeridos:** ${topicsList.join(", ") || "(nenhum)"}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const charactersList = (characterLinks ?? []).map((c: any) => c.characters?.nome).filter(Boolean);
    console.log(`- **Personagens sugeridos:** ${charactersList.join(", ") || "(nenhum)"}`);
    const manifestRow = manifest.find((r) => r.driveFileId === file.drive_file_id);
    const divergencias = computeDivergences(manifestRow, study.conteudo);
    if (divergencias.length > 0) {
      console.log("\n**⚠ Divergências (revisão editorial necessária):**");
      for (const d of divergencias) console.log(`- ${d}`);
    }

    console.log(`\n**Resumo auxiliar:** ${study.resumo}\n`);
    console.log("<details><summary>Texto extraído completo</summary>\n\n```\n" + study.conteudo + "\n```\n</details>\n");
    console.log("---\n");
  }

  console.log("## Possíveis duplicados (diagnóstico, Etapa 5)\n");
  console.log("Ver `npm run fase3:validate-manifest` para o diagnóstico completo dos 6 pares em `DUPLICADOS_POSSIVEIS` (agora todos ingeridos como estudos reais acima — comparar seus textos/referências extraídos manualmente é o próximo passo humano; nenhuma fusão/exclusão automática foi feita).\n");
}

main().catch((error) => {
  console.error("Erro ao gerar o relatório:", error);
  process.exit(1);
});
