import { describe, expect, it } from "vitest";
import { ingestFile } from "@/lib/ingestion/pipeline";
import { splitFileIntoStudies, type ManualSplitInput } from "@/lib/ingestion/manualSplit";
import { InMemoryIngestionRepository } from "@/lib/ingestion/repository.inMemory";
import { InMemorySourceAdapter } from "@/lib/ingestion/sources/inMemoryAdapter";
import type { ManifestRow } from "@/lib/ingestion/manifest";

/**
 * "Uma fonte → múltiplos estudos" (DEC-042, checkpoint 15) — caso real
 * SEL-017: um único arquivo-fonte contém duas mensagens independentes
 * (Isaías 25:8-9 e Lucas 24:18) que uma decisão editorial HUMANA
 * determina que devem virar dois `study` distintos, preservando um único
 * `files`/arquivo-fonte e a proveniência original.
 */

const DRIVE_FILE_ID = "drive-sel-017";
const CONTEUDO_COMBINADO =
  "Tema: A promessa e a esperança em Jesus\nIs 25:8-9\nAniquilará a morte para sempre...\n\n" +
  "Tema: O homem não tem dado lugar em sua vida para Jesus\nLucas 24:18 E, respondendo um...";

function manifestRow(): ManifestRow {
  return {
    pilotId: "SEL-017",
    queue: "SELECIONADOS",
    sourcePath: "01 - Antigo Testamento / 23 - Isaías",
    testament: "AT",
    bookOrScope: "Isaías",
    title: "Aniquilará a morte para sempre - Is25.8-9.doc",
    driveFileId: DRIVE_FILE_ID,
    mimeType: "text/plain",
    preliminaryReference: "Isaías 25:8–9",
    duplicateGroup: "",
    notes: "DOC legado; referência explícita",
    sourceUrl: `https://drive.google.com/open?id=${DRIVE_FILE_ID}`,
  };
}

function buildSplitInput(): ManualSplitInput {
  return {
    autor: "Autor não identificado",
    dataOrigem: "1970-01-01",
    motivo: "SEL-017 contém duas mensagens independentes concatenadas no mesmo arquivo — decisão editorial humana, ver docs/DECISIONS.md DEC-042.",
    partes: [
      {
        titulo: "A Promessa e a Esperança em Jesus",
        conteudo: "Tema: A promessa e a esperança em Jesus\nIs 25:8-9\nAniquilará a morte para sempre...",
        resumo: "A promessa da vitória sobre a morte em Isaías 25:8-9.",
        palavrasChave: ["promessa", "esperança", "morte"],
        passagens: [{ bookSlug: "isaias", capitulo: 25, versiculoInicio: 8, versiculoFim: 9, referenciaNormalizada: "Isaías 25:8-9", tipoRelacao: "principal", prioridade: 1 }],
        topicIds: [],
        characterIds: [],
      },
      {
        titulo: "O Homem Não Tem Dado Lugar em Sua Vida para Jesus",
        conteudo: "Tema: O homem não tem dado lugar em sua vida para Jesus\nLucas 24:18 E, respondendo um...",
        resumo: "Os discípulos de Emaús e a experiência com Jesus em Lucas 24:18.",
        palavrasChave: ["discípulos", "Emaús", "caminho"],
        passagens: [{ bookSlug: "lucas", capitulo: 24, versiculoInicio: 18, referenciaNormalizada: "Lucas 24:18", tipoRelacao: "principal", prioridade: 1 }],
        topicIds: [],
        characterIds: [],
      },
    ],
  };
}

async function ingestOriginal(repo: InMemoryIngestionRepository) {
  const row = manifestRow();
  const source = new InMemorySourceAdapter(new Map([[DRIVE_FILE_ID, { buffer: Buffer.from(CONTEUDO_COMBINADO, "utf8"), mimeType: "text/plain", nomeOriginal: row.title }]]));
  const outcome = await ingestFile({ manifestRow: row, sourceAdapter: source, repository: repo, topics: [], characters: [] });
  if (outcome.outcome !== "processado") throw new Error(`esperado 'processado', recebido '${outcome.outcome}'`);
  return outcome;
}

describe("splitFileIntoStudies — uma fonte, múltiplos estudos (DEC-042)", () => {
  it("cria dois estudos distintos a partir de um único arquivo-fonte, com study_id/slug/título/MAIN próprios e conteúdo não misturado", async () => {
    const repo = new InMemoryIngestionRepository();
    const originalOutcome = await ingestOriginal(repo);
    const file = [...repo.files.values()].find((f) => f.driveFileId === DRIVE_FILE_ID)!;

    const result = await splitFileIntoStudies(repo, file, buildSplitInput());

    expect(result.jaDividido).toBe(false);
    expect(result.studyIds).toHaveLength(2);
    const [id1, id2] = result.studyIds;
    expect(id1).not.toBe(id2);

    // A primeira parte reaproveita o estudo já criado pela ingestão normal.
    expect(id1).toBe(originalOutcome.studyId);

    const study1 = repo.studies.get(id1)!;
    const study2 = repo.studies.get(id2)!;

    expect(study1.titulo).toBe("A Promessa e a Esperança em Jesus");
    expect(study2.titulo).toBe("O Homem Não Tem Dado Lugar em Sua Vida para Jesus");
    expect(study1.slug).not.toBe(study2.slug);

    // Conteúdo de cada estudo corresponde SÓ à respectiva mensagem —
    // nunca mistura a mensagem do outro.
    expect(study1.conteudo).toContain("promessa e a esperança em Jesus");
    expect(study1.conteudo).not.toContain("Lucas 24:18");
    expect(study2.conteudo).toContain("Lucas 24:18");
    expect(study2.conteudo).not.toContain("Is 25:8-9");

    // Referência MAIN própria de cada um.
    expect(study1.passages).toHaveLength(1);
    expect(study1.passages[0]).toMatchObject({ bookSlug: "isaias", capitulo: 25, versiculoInicio: 8, tipoRelacao: "principal" });
    expect(study2.passages).toHaveLength(1);
    expect(study2.passages[0]).toMatchObject({ bookSlug: "lucas", capitulo: 24, versiculoInicio: 18, tipoRelacao: "principal" });

    // Nenhum dos dois nasce PUBLISHED — ambos ficam em REVIEW até
    // aprovação/publicação humana.
    expect(study1.status).toBe("REVIEW");
    expect(study2.status).toBe("REVIEW");
    expect(study1.status).not.toBe("PUBLISHED");
    expect(study2.status).not.toBe("PUBLISHED");

    // Ambos continuam vinculados ao MESMO arquivo-fonte original — nenhum
    // arquivo novo/duplicado foi criado (só 1 linha em `files`).
    expect(repo.files.size).toBe(1);
    const linked = await repo.listLinkedStudyIds(file.id);
    expect(linked.sort()).toEqual([id1, id2].sort());

    // O arquivo fica marcado como dividido manualmente.
    const updatedFile = [...repo.files.values()].find((f) => f.driveFileId === DRIVE_FILE_ID)!;
    expect(updatedFile.statusProcessamento).toBe("DIVIDIDO_MANUALMENTE");

    // O motivo da decisão humana fica registrado no log de ingestão.
    const splitLog = repo.jobLog.find((j) => j.errorMessage?.includes("DIVISÃO EDITORIAL HUMANA"));
    expect(splitLog).toBeDefined();
    expect(splitLog?.errorMessage).toContain("decisão editorial humana");
  });

  it("é idempotente: reexecutar splitFileIntoStudies não recria os estudos, devolve os mesmos study_id", async () => {
    const repo = new InMemoryIngestionRepository();
    await ingestOriginal(repo);
    const file = [...repo.files.values()].find((f) => f.driveFileId === DRIVE_FILE_ID)!;

    const primeiraExecucao = await splitFileIntoStudies(repo, file, buildSplitInput());
    const totalEstudosApos1 = repo.studies.size;

    const fileAtualizado = [...repo.files.values()].find((f) => f.driveFileId === DRIVE_FILE_ID)!;
    const segundaExecucao = await splitFileIntoStudies(repo, fileAtualizado, buildSplitInput());

    expect(segundaExecucao.jaDividido).toBe(true);
    expect(segundaExecucao.studyIds.sort()).toEqual(primeiraExecucao.studyIds.sort());
    expect(repo.studies.size).toBe(totalEstudosApos1); // nenhum estudo novo criado na 2ª execução
  });

  it("reexecutar a pipeline AUTOMÁTICA (ingestFile) depois da divisão manual não reprocessa o arquivo nem sobrescreve o conteúdo já dividido", async () => {
    const repo = new InMemoryIngestionRepository();
    await ingestOriginal(repo);
    const file = [...repo.files.values()].find((f) => f.driveFileId === DRIVE_FILE_ID)!;
    const { studyIds } = await splitFileIntoStudies(repo, file, buildSplitInput());

    const conteudoAntes1 = repo.studies.get(studyIds[0])!.conteudo;
    const conteudoAntes2 = repo.studies.get(studyIds[1])!.conteudo;

    // Simula uma reexecução do lote completo (ex.: `fase3-ingest-piloto.ts`
    // rodado de novo no futuro) — o mesmo manifestRow/source de sempre.
    const row = manifestRow();
    const source = new InMemorySourceAdapter(new Map([[DRIVE_FILE_ID, { buffer: Buffer.from(CONTEUDO_COMBINADO, "utf8"), mimeType: "text/plain", nomeOriginal: row.title }]]));
    const outcome = await ingestFile({ manifestRow: row, sourceAdapter: source, repository: repo, topics: [], characters: [] });

    expect(outcome.outcome).toBe("ignorado_divisao_manual");

    // Nenhum estudo novo foi criado, e os dois já existentes continuam com
    // o conteúdo SEPARADO — não foram sobrescritos pelo texto combinado.
    expect(repo.studies.size).toBe(2);
    expect(repo.studies.get(studyIds[0])!.conteudo).toBe(conteudoAntes1);
    expect(repo.studies.get(studyIds[1])!.conteudo).toBe(conteudoAntes2);
  });

  it("rejeita uma parte sem exatamente uma passagem principal (MAIN) — nunca cria estudo sem referência decidida", async () => {
    const repo = new InMemoryIngestionRepository();
    await ingestOriginal(repo);
    const file = [...repo.files.values()].find((f) => f.driveFileId === DRIVE_FILE_ID)!;

    const input = buildSplitInput();
    input.partes[1].passagens = []; // sem MAIN nenhuma

    await expect(splitFileIntoStudies(repo, file, input)).rejects.toThrow(/exatamente 1 passagem "principal"/);
  });

  it("rejeita menos de 2 partes — divisão de 1 fonte em 1 único estudo deve usar a pipeline normal", async () => {
    const repo = new InMemoryIngestionRepository();
    await ingestOriginal(repo);
    const file = [...repo.files.values()].find((f) => f.driveFileId === DRIVE_FILE_ID)!;

    const input = buildSplitInput();
    input.partes = [input.partes[0]];

    await expect(splitFileIntoStudies(repo, file, input)).rejects.toThrow(/ao menos 2 partes/);
  });
});
