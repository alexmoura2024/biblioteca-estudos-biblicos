import { describe, expect, it } from "vitest";
import { ingestFile } from "@/lib/ingestion/pipeline";
import { InMemoryIngestionRepository } from "@/lib/ingestion/repository.inMemory";
import { InMemorySourceAdapter } from "@/lib/ingestion/sources/inMemoryAdapter";
import type { ManifestRow } from "@/lib/ingestion/manifest";
import type { Character, Topic } from "@/lib/types";

function manifestRow(overrides: Partial<ManifestRow> = {}): ManifestRow {
  return {
    pilotId: "SEL-999",
    queue: "SELECIONADOS",
    sourcePath: "01 - Antigo Testamento / 02 - Êxodo",
    testament: "AT",
    bookOrScope: "Êxodo",
    title: "Êxodo 15:7 — A Eira de Araúna",
    driveFileId: "drive-id-999",
    mimeType: "text/plain",
    preliminaryReference: "Êxodo 15:7",
    duplicateGroup: "",
    notes: "",
    sourceUrl: "https://drive.google.com/open?id=drive-id-999",
    ...overrides,
  };
}

const TOPICS: Topic[] = [{ id: "topic-fe", nome: "Fé", slug: "fe", descricao: "" }];
const CHARACTERS: Character[] = [{ id: "char-moises", nome: "Moisés", slug: "moises", descricao: "" }];

describe("ingestFile", () => {
  it("cria um estudo com status REVIEW quando ao menos uma referência válida é detectada, e NUNCA PUBLISHED (garantido pelo tipo, testado em runtime também)", async () => {
    const row = manifestRow();
    const source = new InMemorySourceAdapter(
      new Map([[row.driveFileId, { buffer: Buffer.from("O lugar escolhido pelo Senhor está em Êxodo 15:17.", "utf8"), mimeType: "text/plain", nomeOriginal: row.title }]]),
    );
    const repo = new InMemoryIngestionRepository();

    const outcome = await ingestFile({ manifestRow: row, sourceAdapter: source, repository: repo, topics: TOPICS, characters: CHARACTERS });

    expect(outcome.outcome).toBe("processado");
    if (outcome.outcome !== "processado") throw new Error("esperado 'processado'");
    expect(outcome.status).toBe("REVIEW");
    expect(["DRAFT", "REVIEW"]).toContain(outcome.status);
    expect(outcome.status).not.toBe("PUBLISHED");

    const study = repo.studies.get(outcome.studyId);
    expect(study?.status).not.toBe("PUBLISHED");
  });

  it("extrai a referência do CONTEÚDO real (Êxodo 15:17), não do título do manifesto (que diz 15:7) — caso 'A Eira de Araúna'", async () => {
    const row = manifestRow({ title: "Êxodo 15:7 — A Eira de Araúna.doc", preliminaryReference: "Êxodo 15:7" });
    const source = new InMemorySourceAdapter(
      new Map([[row.driveFileId, { buffer: Buffer.from("O santuário está em Êxodo 15:17, lugar que o Senhor escolheu.", "utf8"), mimeType: "text/plain", nomeOriginal: row.title }]]),
    );
    const repo = new InMemoryIngestionRepository();

    const outcome = await ingestFile({ manifestRow: row, sourceAdapter: source, repository: repo, topics: [], characters: [] });
    if (outcome.outcome !== "processado") throw new Error("esperado 'processado'");

    expect(outcome.passagensValidas).toHaveLength(1);
    expect(outcome.passagensValidas[0]).toMatchObject({ capitulo: 15, versiculoInicio: 17 });
    // O título do estudo continua o do manifesto — o pipeline nunca
    // reescreve o título automaticamente, mesmo sabendo que o texto do
    // arquivo diz 15:17 e o título diz 15:7 (regra 6: nunca inventar).
    const study = repo.studies.get(outcome.studyId);
    expect(study?.titulo).toBe(row.title);
  });

  it("é IDEMPOTENTE: processar o mesmo arquivo duas vezes nunca cria um segundo files nem um segundo study", async () => {
    const row = manifestRow();
    const source = new InMemorySourceAdapter(
      new Map([[row.driveFileId, { buffer: Buffer.from("Conteúdo sobre Gênesis 1:1.", "utf8"), mimeType: "text/plain", nomeOriginal: row.title }]]),
    );
    const repo = new InMemoryIngestionRepository();

    const first = await ingestFile({ manifestRow: row, sourceAdapter: source, repository: repo, topics: [], characters: [] });
    const second = await ingestFile({ manifestRow: row, sourceAdapter: source, repository: repo, topics: [], characters: [] });

    expect(repo.files.size).toBe(1);
    expect(repo.studies.size).toBe(1);
    if (first.outcome !== "processado" || second.outcome !== "processado") throw new Error("esperado 'processado' nas duas execuções");
    expect(first.studyId).toBe(second.studyId);
    expect(first.fileId).toBe(second.fileId);
  });

  it("preserva a origem (drive_file_id e URL) exatamente como veio do manifesto", async () => {
    const row = manifestRow({ driveFileId: "abc-123-xyz", sourceUrl: "https://drive.google.com/open?id=abc-123-xyz" });
    const source = new InMemorySourceAdapter(new Map([[row.driveFileId, { buffer: Buffer.from("texto qualquer sem referência"), mimeType: "text/plain", nomeOriginal: row.title }]]));
    const repo = new InMemoryIngestionRepository();

    await ingestFile({ manifestRow: row, sourceAdapter: source, repository: repo, topics: [], characters: [] });

    const file = repo.files.get("abc-123-xyz");
    expect(file?.driveFileId).toBe("abc-123-xyz");
    expect(file?.driveUrl).toBe("https://drive.google.com/open?id=abc-123-xyz");
  });

  it("nasce DRAFT (classificação incompleta) quando a extração funciona mas nenhuma referência é reconhecida", async () => {
    const row = manifestRow();
    const source = new InMemorySourceAdapter(new Map([[row.driveFileId, { buffer: Buffer.from("Um texto sem nenhuma referência bíblica reconhecível."), mimeType: "text/plain", nomeOriginal: row.title }]]));
    const repo = new InMemoryIngestionRepository();

    const outcome = await ingestFile({ manifestRow: row, sourceAdapter: source, repository: repo, topics: [], characters: [] });
    if (outcome.outcome !== "processado") throw new Error("esperado 'processado'");
    expect(outcome.status).toBe("DRAFT");
    expect(outcome.passagensValidas).toHaveLength(0);
  });

  it("uma referência impossível no texto nunca vira study_passages — fica só como alerta de revisão", async () => {
    const row = manifestRow();
    const source = new InMemorySourceAdapter(
      new Map([[row.driveFileId, { buffer: Buffer.from("Isso é discutido em João 3:37, que na verdade não existe."), mimeType: "text/plain", nomeOriginal: row.title }]]),
    );
    const repo = new InMemoryIngestionRepository();

    const outcome = await ingestFile({ manifestRow: row, sourceAdapter: source, repository: repo, topics: [], characters: [] });
    if (outcome.outcome !== "processado") throw new Error("esperado 'processado'");
    expect(outcome.passagensValidas).toHaveLength(0);
    expect(outcome.referenciasInvalidas).toHaveLength(1);
    expect(outcome.referenciasInvalidas[0].invalidReason).toBe("versiculo_acima_do_maximo_do_capitulo");
    expect(outcome.status).toBe("DRAFT"); // nenhuma referência válida => classificação incompleta

    const study = repo.studies.get(outcome.studyId);
    expect(study?.passages).toHaveLength(0);
  });

  it("arquivo sem texto (extração 'bem-sucedida' mas vazia) resulta em falha rastreável, sem criar study", async () => {
    const row = manifestRow();
    const source = new InMemorySourceAdapter(new Map([[row.driveFileId, { buffer: Buffer.from("   \n\n  "), mimeType: "text/plain", nomeOriginal: row.title }]]));
    const repo = new InMemoryIngestionRepository();

    const outcome = await ingestFile({ manifestRow: row, sourceAdapter: source, repository: repo, topics: [], characters: [] });
    expect(outcome.outcome).toBe("falha");
    expect(repo.studies.size).toBe(0);
    expect(repo.jobLog.some((j) => j.stage === "EXTRACT" && j.status === "FAILED")).toBe(true);
  });

  it("erro de extração (bytes corrompidos de um DOC legado) não lança — vira falha rastreável e não trava o lote", async () => {
    const row = manifestRow({ mimeType: "application/msword" });
    const source = new InMemorySourceAdapter(new Map([[row.driveFileId, { buffer: Buffer.from("isto não é um .doc de verdade"), mimeType: "application/msword", nomeOriginal: row.title }]]));
    const repo = new InMemoryIngestionRepository();

    const result = await ingestFile({ manifestRow: row, sourceAdapter: source, repository: repo, topics: [], characters: [] });
    expect(result.outcome).toBe("falha");
    expect(repo.studies.size).toBe(0);
  });

  it("formato sem adaptador (ex.: RTF) vira nao_suportado, nunca finge sucesso", async () => {
    const row = manifestRow({ mimeType: "application/rtf" });
    const source = new InMemorySourceAdapter(new Map([[row.driveFileId, { buffer: Buffer.from("{\\rtf1 texto}"), mimeType: "application/rtf", nomeOriginal: row.title }]]));
    const repo = new InMemoryIngestionRepository();

    const outcome = await ingestFile({ manifestRow: row, sourceAdapter: source, repository: repo, topics: [], characters: [] });
    expect(outcome.outcome).toBe("nao_suportado");
    expect(repo.studies.size).toBe(0);
  });

  it("retomada de job: uma primeira tentativa que falha (fonte indisponível) não deixa nada pela metade; uma segunda tentativa com a fonte disponível processa normalmente, sem duplicar", async () => {
    const row = manifestRow();
    const emptySource = new InMemorySourceAdapter(new Map());
    const repo = new InMemoryIngestionRepository();

    const failedAttempt = await ingestFile({ manifestRow: row, sourceAdapter: emptySource, repository: repo, topics: [], characters: [] });
    expect(failedAttempt.outcome).toBe("falha");
    expect(repo.files.size).toBe(1); // proveniência já registrada, mesmo com a falha
    expect(repo.studies.size).toBe(0);

    const workingSource = new InMemorySourceAdapter(new Map([[row.driveFileId, { buffer: Buffer.from("Gênesis 1:1 no princípio."), mimeType: "text/plain", nomeOriginal: row.title }]]));
    const retried = await ingestFile({ manifestRow: row, sourceAdapter: workingSource, repository: repo, topics: [], characters: [] });

    expect(retried.outcome).toBe("processado");
    expect(repo.files.size).toBe(1);
    expect(repo.studies.size).toBe(1);
    expect(repo.jobLog.filter((j) => j.stage === "FETCH")).toHaveLength(2);
    expect(repo.jobLog.filter((j) => j.stage === "FETCH" && j.status === "FAILED")).toHaveLength(1);
    expect(repo.jobLog.filter((j) => j.stage === "FETCH" && j.status === "SUCCESS")).toHaveLength(1);
  });

  it("sugere palavras-chave e resumo a partir do texto real, nunca inventando o que o texto não diz", async () => {
    const row = manifestRow();
    const texto = "A fé de Moisés diante do Senhor é um exemplo de confiança e obediência em meio à adversidade.";
    const source = new InMemorySourceAdapter(new Map([[row.driveFileId, { buffer: Buffer.from(texto), mimeType: "text/plain", nomeOriginal: row.title }]]));
    const repo = new InMemoryIngestionRepository();

    const outcome = await ingestFile({ manifestRow: row, sourceAdapter: source, repository: repo, topics: TOPICS, characters: CHARACTERS });
    if (outcome.outcome !== "processado") throw new Error("esperado 'processado'");

    const study = repo.studies.get(outcome.studyId);
    expect(study?.resumo).toBe(texto);
    expect(study?.palavrasChave.length).toBeGreaterThan(0);
    expect(study?.topicIds).toContain("topic-fe"); // "fé" aparece no texto
    expect(study?.characterIds).toContain("char-moises"); // "Moisés" aparece no texto
  });

  it("nunca inventa autor/data quando desconhecidos — usa sentinelas explícitas, nunca um valor plausível", async () => {
    const row = manifestRow();
    const source = new InMemorySourceAdapter(
      new Map([[row.driveFileId, { buffer: Buffer.from("Gênesis 1:1 no princípio."), mimeType: "text/plain", nomeOriginal: row.title }]]), // sem modifiedTime
    );
    const repo = new InMemoryIngestionRepository();

    const outcome = await ingestFile({ manifestRow: row, sourceAdapter: source, repository: repo, topics: [], characters: [] });
    if (outcome.outcome !== "processado") throw new Error("esperado 'processado'");

    const study = repo.studies.get(outcome.studyId);
    expect(study?.autor).toBe("Autor não identificado");
    expect(study?.dataOrigem).toBe("1970-01-01"); // sentinela de data desconhecida — nunca a data de hoje
  });

  it("usa o modifiedTime do Drive como data_origem quando disponível (fato verificável, não invenção)", async () => {
    const row = manifestRow();
    const source = new InMemorySourceAdapter(
      new Map([[row.driveFileId, { buffer: Buffer.from("Gênesis 1:1 no princípio."), mimeType: "text/plain", nomeOriginal: row.title, modifiedTime: "2024-05-10T12:00:00.000Z" }]]),
    );
    const repo = new InMemoryIngestionRepository();

    const outcome = await ingestFile({ manifestRow: row, sourceAdapter: source, repository: repo, topics: [], characters: [] });
    if (outcome.outcome !== "processado") throw new Error("esperado 'processado'");

    const study = repo.studies.get(outcome.studyId);
    expect(study?.dataOrigem).toBe("2024-05-10");
  });

  it("detecta divergência de classificação (testamento do manifesto x testamento da referência do conteúdo) sem mover/renomear nada — caso 'O evangelho eterno'", async () => {
    const row = manifestRow({
      sourcePath: "01 - Antigo Testamento / 02 - Êxodo",
      testament: "AT", // arquivo está fisicamente classificado como AT (pasta Êxodo)
      title: "O evangelho eterno",
    });
    const source = new InMemorySourceAdapter(
      new Map([[row.driveFileId, { buffer: Buffer.from("Paulo afirma isso em Gálatas 1:11–12, o evangelho que ele pregou."), mimeType: "text/plain", nomeOriginal: row.title }]]),
    );
    const repo = new InMemoryIngestionRepository();

    const outcome = await ingestFile({ manifestRow: row, sourceAdapter: source, repository: repo, topics: [], characters: [] });
    if (outcome.outcome !== "processado") throw new Error("esperado 'processado'");

    expect(outcome.divergenciaClassificacao).toBeDefined();
    expect(outcome.divergenciaClassificacao).toContain("AT");
    expect(outcome.divergenciaClassificacao).toContain("NT");
    // Continua REVIEW (não DRAFT) — a referência foi detectada com
    // segurança; a divergência é um alerta à parte, não uma falha de
    // classificação.
    expect(outcome.status).toBe("REVIEW");
  });
});
