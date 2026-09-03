/**
 * Fase 3 — Etapa 10 / Fase 3.1 — Etapa 6: visualização administrativa/local
 * de DRAFT/REVIEW, agora organizada em 4 grupos editoriais (checkpoint 14)
 * para reduzir o trabalho manual da primeira leitura humana, sem cruzar a
 * fronteira editorial (CLAUDE.md §3) — nenhuma decisão de mérito é tomada
 * aqui, só agrupamento por TIPO de decisão pendente:
 *
 *   A — PRONTO PARA APROVAÇÃO HUMANA: nenhuma divergência técnica/editorial
 *       relevante, metadados sugeridos não vazios.
 *   B — REVISÃO DE REFERÊNCIA: MAIN ambíguo, ou referência do
 *       título/manifesto diverge da referência do conteúdo, ou nenhuma
 *       referência foi reconhecida (DRAFT).
 *   C — REVISÃO DE METADADOS: nenhum tema nem personagem sugerido — decisão
 *       humana sobre tema/personagem/série/título/pasta.
 *   D — DUPLICATA/VERSÃO: pertence a um grupo de possível duplicidade
 *       (`duplicate_group` do manifesto, incluindo quando o próprio
 *       candidato SELECIONADO/REVISAR é o alvo canônico de um alias em
 *       DUPLICADOS_POSSIVEIS) — nunca publicar até decidir a versão
 *       canônica.
 *
 * Prioridade de classificação: D > B > C > A (uma duplicata em potencial
 * nunca é escondida atrás de "pronto para aprovar" só por acaso não ter
 * divergência de referência).
 *
 * Sem construir um CMS completo, e sem expor `service_role` em nenhuma
 * rota pública: este é um SCRIPT local, nunca uma página em src/app/**.
 * A área pública do site continua mostrando só PUBLISHED (RLS garante
 * isso independentemente deste relatório).
 *
 * Uso: npx tsx scripts/fase3-review-report.ts > docs/fase3-piloto/RELATORIO_REVISAO.md
 */
try {
  process.loadEnvFile(".env.local");
} catch {
  // pode já estar carregado
}

import { loadManifest, validateManifest, type ManifestRow } from "../src/lib/ingestion/manifest";
import { classifyReferences, scanReferences, selectMainReference, type ClassifiedReference } from "../src/lib/ingestion/referenceScan";
import { getSupabaseServiceClient } from "../src/lib/supabase/serviceClient";

type EditorialGroup = "A" | "B" | "C" | "D";
type Recommendation = "APROVAR" | "REVISAR" | "COMPARAR DUPLICATA";

interface StudyReviewRow {
  pilotId: string;
  study: { id: string; titulo: string; slug: string; status: string; resumo: string; conteudo: string; autor: string; dataOrigem: string };
  file: { nomeOriginal: string; driveUrl: string; mimeType: string; driveFileId: string };
  referencias: string[];
  temas: string[];
  personagens: string[];
  divergencias: string[];
  duplicateGroupKey?: string;
  grupo: EditorialGroup;
  recomendacao: Recommendation;
}

/**
 * Recalcula a mesma lógica de `pipeline.ts` (seleção de MAIN + divergências
 * — DEC-035/DEC-039) a partir do `conteudo` já salvo, só para exibir no
 * relatório (nada disto é persistido em coluna própria; recalcular é mais
 * simples do que adicionar uma). Mantém a MESMA lógica de `pipeline.ts`
 * deliberadamente — se um dia divergir, é sinal de que vale a pena extrair
 * um helper compartilhado.
 */
function recomputeClassification(manifestRow: ManifestRow | undefined, conteudo: string): { classified: ClassifiedReference[]; divergencias: string[] } {
  const detected = scanReferences(conteudo);
  const validDetected = detected.filter((ref) => ref.valid);
  const mainSelection = selectMainReference(validDetected, conteudo, manifestRow?.preliminaryReference);
  const classified = classifyReferences(detected, mainSelection.main);
  const principal = classified[0];

  const divergencias: string[] = [];
  if (!manifestRow) return { classified, divergencias };

  if (manifestRow.testament && principal && principal.book.testamento !== manifestRow.testament) {
    divergencias.push(`Origem classificada como ${manifestRow.testament}, mas a referência principal do conteúdo (${principal.book.nome} ${principal.capitulo}) é do ${principal.book.testamento}.`);
  }
  if (manifestRow.preliminaryReference && principal) {
    const preliminaryParsed = classifyReferences(scanReferences(manifestRow.preliminaryReference))[0];
    if (
      preliminaryParsed &&
      (preliminaryParsed.book.slug !== principal.book.slug || preliminaryParsed.capitulo !== principal.capitulo || preliminaryParsed.versiculoInicio !== principal.versiculoInicio)
    ) {
      divergencias.push(`Referência preliminar do manifesto ("${manifestRow.preliminaryReference}") diverge da referência principal do conteúdo (${principal.matchedText}).`);
    }
  }
  if (mainSelection.reason === "ambiguous" && principal) {
    divergencias.push(`MAIN_REFERENCE_AMBIGUOUS: duas ou mais referências têm evidência semelhante para ser a principal — "${principal.matchedText}" escolhida só como fallback determinístico.`);
  }
  return { classified, divergencias };
}

/** Mapa pilot_id -> chave de grupo de duplicidade, incluindo o alvo canônico de um alias (ver `ManifestAlias`). */
function buildDuplicateGroupMap(manifest: ManifestRow[]): Map<string, string> {
  const validation = validateManifest(manifest);
  const map = new Map<string, string>();
  for (const row of manifest) {
    if (row.duplicateGroup) map.set(row.pilotId, row.duplicateGroup);
  }
  for (const alias of validation.aliases) {
    const aliasRow = manifest.find((r) => r.pilotId === alias.aliasPilotId);
    if (aliasRow?.duplicateGroup && !map.has(alias.canonicalPilotId)) {
      map.set(alias.canonicalPilotId, aliasRow.duplicateGroup);
    }
  }
  return map;
}

function classifyGroup(row: { status: string; divergencias: string[]; temas: string[]; personagens: string[]; duplicateGroupKey?: string }): EditorialGroup {
  if (row.duplicateGroupKey) return "D";
  if (row.status === "DRAFT" || row.divergencias.length > 0) return "B";
  if (row.temas.length === 0 && row.personagens.length === 0) return "C";
  return "A";
}

function recommendationFor(grupo: EditorialGroup): Recommendation {
  if (grupo === "D") return "COMPARAR DUPLICATA";
  if (grupo === "A") return "APROVAR";
  return "REVISAR";
}

async function main() {
  const manifest = loadManifest();
  const duplicateGroupMap = buildDuplicateGroupMap(manifest);
  const client = getSupabaseServiceClient();

  const { data: files, error: filesError } = await client
    .from("files")
    .select("id, drive_file_id, nome_original, drive_url, mime_type, status_processamento, study_id, hash_conteudo, modified_time")
    .not("study_id", "is", null);
  if (filesError) throw new Error(filesError.message);

  const { data: falhas } = await client.from("files").select("drive_file_id, nome_original, status_processamento").is("study_id", null).neq("status_processamento", "PENDENTE");

  const rows: StudyReviewRow[] = [];

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

    const manifestRow = manifest.find((r) => r.driveFileId === file.drive_file_id);
    const { divergencias } = recomputeClassification(manifestRow, study.conteudo);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase-js não infere a forma exata de um join aninhado; script local, não exportado.
    const referencias = (passages ?? []).map((p: any) => `${p.passages?.referencia_normalizada ?? "?"} (${p.tipo_relacao})`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const temas = (topicLinks ?? []).map((t: any) => t.topics?.nome).filter(Boolean);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const personagens = (characterLinks ?? []).map((c: any) => c.characters?.nome).filter(Boolean);

    const pilotId = manifestRow?.pilotId ?? "(fora do manifesto)";
    const duplicateGroupKey = duplicateGroupMap.get(pilotId);

    const base = { status: study.status as string, divergencias, temas, personagens, duplicateGroupKey };
    const grupo = classifyGroup(base);

    rows.push({
      pilotId,
      study: { id: study.id, titulo: study.titulo, slug: study.slug, status: study.status, resumo: study.resumo, conteudo: study.conteudo, autor: study.autor, dataOrigem: study.data_origem },
      file: { nomeOriginal: file.nome_original, driveUrl: file.drive_url, mimeType: file.mime_type, driveFileId: file.drive_file_id },
      referencias,
      temas,
      personagens,
      divergencias,
      duplicateGroupKey,
      grupo,
      recomendacao: recommendationFor(grupo),
    });
  }

  rows.sort((a, b) => a.pilotId.localeCompare(b.pilotId));

  console.log("# Relatório de revisão — piloto da Fase 3 (Fase 3.1, 4 grupos editoriais)\n");
  console.log(`Gerado em ${new Date().toISOString()}. ${rows.length} estudo(s) real(is) aguardando revisão humana.\n`);
  console.log("Nenhum destes estudos está publicamente visível (RLS restringe a `status='PUBLISHED'`) — todos nasceram `DRAFT`/`REVIEW`. Nenhum grupo, mesmo o A, é publicado automaticamente — a decisão final continua humana em todos os casos.\n");

  const groupInfo: Record<EditorialGroup, { titulo: string; explicacao: string }> = {
    A: { titulo: "Grupo A — Pronto para aprovação humana", explicacao: "Sem divergência técnica/editorial relevante detectada; metadados sugeridos não vazios. Ainda assim requer aprovação humana antes de publicar." },
    B: { titulo: "Grupo B — Revisão de referência", explicacao: "MAIN ambíguo, referência do título/manifesto diverge da referência do conteúdo, ou nenhuma referência foi reconhecida no texto." },
    C: { titulo: "Grupo C — Revisão de metadados", explicacao: "Nenhum tema nem personagem sugerido automaticamente — decisão humana sobre tema/personagem/série/título/pasta." },
    D: { titulo: "Grupo D — Duplicata/versão (não publicar até decidir a canônica)", explicacao: "Pertence a um grupo de possível duplicidade do manifesto — comparar as versões antes de qualquer decisão de publicação." },
  };

  const counts: Record<EditorialGroup, number> = { A: 0, B: 0, C: 0, D: 0 };
  for (const r of rows) counts[r.grupo] += 1;
  console.log(`**Resumo:** Grupo A: ${counts.A} · Grupo B: ${counts.B} · Grupo C: ${counts.C} · Grupo D: ${counts.D}\n`);
  console.log("---\n");

  for (const grupo of ["A", "B", "C", "D"] as EditorialGroup[]) {
    const info = groupInfo[grupo];
    const grupoRows = rows.filter((r) => r.grupo === grupo);
    console.log(`## ${info.titulo} (${grupoRows.length})\n`);
    console.log(`${info.explicacao}\n`);

    for (const r of grupoRows) {
      console.log(`### ${r.pilotId} — ${r.study.titulo}\n`);
      console.log(`- **Status:** ${r.study.status} · **Recomendação:** ${r.recomendacao}`);
      console.log(`- **Slug:** \`${r.study.slug}\``);
      console.log(`- **Origem (Drive):** [${r.file.nomeOriginal}](${r.file.driveUrl}) — drive_file_id \`${r.file.driveFileId}\` · MIME original: ${r.file.mimeType}`);
      console.log(`- **Autor:** ${r.study.autor} · **Data de origem:** ${r.study.dataOrigem}`);
      console.log(`- **Título sugerido:** igual ao título original — nenhum algoritmo de sugestão de título existe ainda (decisão de título é sempre humana)`);
      console.log(`- **Referências detectadas:** ${r.referencias.join("; ") || "NENHUMA — classificação incompleta"}`);
      console.log(`- **Temas sugeridos:** ${r.temas.join(", ") || "(nenhum)"}`);
      console.log(`- **Personagens sugeridos:** ${r.personagens.join(", ") || "(nenhum)"}`);
      if (r.duplicateGroupKey) console.log(`- **Grupo de duplicidade do manifesto:** \`${r.duplicateGroupKey}\``);
      if (r.divergencias.length > 0) {
        console.log("- **⚠ Divergências (revisão editorial necessária):**");
        for (const d of r.divergencias) console.log(`  - ${d}`);
      }
      console.log(`\n**Resumo auxiliar:** ${r.study.resumo}\n`);
      console.log("<details><summary>Texto extraído completo</summary>\n\n```\n" + r.study.conteudo + "\n```\n</details>\n");
    }
    console.log("---\n");
  }

  console.log("## Falhas de extração (não geraram estudo — fora dos 4 grupos)\n");
  if (!falhas || falhas.length === 0) {
    console.log("Nenhuma.\n");
  } else {
    for (const f of falhas) {
      console.log(`- **${f.nome_original}** — \`${f.status_processamento}\` (ver \`ingestion_jobs\` para o motivo detalhado; DUP-002 tem diagnóstico específico em docs/DECISIONS.md, DEC-040).`);
    }
    console.log();
  }

  console.log("## Possíveis duplicados (diagnóstico, Etapa 5)\n");
  console.log("Ver `npm run fase3:validate-manifest` para o diagnóstico completo dos pares em `DUPLICADOS_POSSIVEIS` (agora todos ingeridos como estudos reais, agrupados no Grupo D acima — comparar seus textos/referências extraídos manualmente é o próximo passo humano; nenhuma fusão/exclusão automática foi feita).\n");
}

main().catch((error) => {
  console.error("Erro ao gerar o relatório:", error);
  process.exit(1);
});
