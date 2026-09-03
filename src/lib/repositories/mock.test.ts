import { describe, expect, it } from "vitest";
import {
  bookRepository,
  characterRepository,
  seriesRepository,
  studyRepository,
  topicRepository,
} from "@/lib/repositories";

describe("MockStudyRepository", () => {
  it("listPublishedSlugs traz só slugs de estudos publicados (sem o DRAFT)", async () => {
    const slugs = await studyRepository.listPublishedSlugs();
    expect(slugs.length).toBeGreaterThan(0);
    expect(slugs).not.toContain("a-mulher-virtuosa-rascunho-em-revisao");
    expect(slugs).toContain("o-senhor-e-o-meu-pastor");
  });

  it("listRecent devolve StudySummary ordenado por data decrescente, limitado", async () => {
    const recentes = await studyRepository.listRecent(3);
    expect(recentes).toHaveLength(3);
    for (let i = 1; i < recentes.length; i++) {
      expect(recentes[i - 1].dataOrigem >= recentes[i].dataOrigem).toBe(true);
    }
    // StudySummary: sem `conteudo`, sem `passagens` completo.
    expect(recentes[0]).not.toHaveProperty("conteudo");
    expect(recentes[0]).not.toHaveProperty("passagens");
    expect(recentes[0].referenciaPrincipal?.referenciaNormalizada).toBeDefined();
  });

  it("não retorna o estudo em DRAFT pelo slug", async () => {
    const draft = await studyRepository.getPublishedBySlug("a-mulher-virtuosa-rascunho-em-revisao");
    expect(draft).toBeUndefined();
  });

  it("busca por slug retorna o estudo completo (Study, com conteudo)", async () => {
    const study = await studyRepository.getPublishedBySlug("o-senhor-e-o-meu-pastor");
    expect(study?.titulo).toBe("O Senhor é o meu pastor");
    expect(study?.conteudo).toBeTruthy();
  });

  it("filtra estudos por livro e capítulo", async () => {
    const studies = await studyRepository.listByBookSlug("joao", 3);
    // "Nicodemos..." (passagem principal em João 3) e "Fé que atravessa
    // as Escrituras..." (cita João 3 como passagem secundária/citada,
    // ver src/lib/data/studies.ts) — prova de que um capítulo pode ter
    // mais de um estudo relacionado.
    expect(studies.length).toBe(2);
    expect(studies.some((s) => s.titulo.includes("Nicodemos"))).toBe(true);
    expect(studies.some((s) => s.titulo.startsWith("Fé que atravessa"))).toBe(true);
  });

  it("filtra estudos por tema", async () => {
    const studies = await studyRepository.listByTopicSlug("fe");
    expect(studies.length).toBeGreaterThan(0);
    expect(studies.every((s) => s.temas.some((t) => t.topic.slug === "fe"))).toBe(true);
  });

  it("filtra estudos por personagem", async () => {
    const studies = await studyRepository.listByCharacterSlug("davi");
    expect(studies.length).toBeGreaterThanOrEqual(3);
  });

  it("filtra e ordena estudos por série", async () => {
    const studies = await studyRepository.listBySeriesSlug("vida-de-davi");
    expect(studies.length).toBe(2);
    expect(studies[0].titulo).toContain("Golias");
  });
});

describe("outros repositórios mockados", () => {
  it("bookRepository resolve por slug", async () => {
    const book = await bookRepository.getBySlug("joao");
    expect(book?.nome).toBe("João");
  });

  it("topicRepository lista todos os temas", async () => {
    const all = await topicRepository.listAll();
    expect(all.length).toBeGreaterThan(0);
  });

  it("characterRepository resolve por slug", async () => {
    const character = await characterRepository.getBySlug("paulo");
    expect(character?.nome).toBe("Paulo");
  });

  it("seriesRepository lista todas as séries", async () => {
    const all = await seriesRepository.listAll();
    expect(all.length).toBe(4);
  });
});

describe("countPublishedStudies (Marco 1.2 — agregação dedicada, sem carregar todos os estudos)", () => {
  it("topicRepository conta estudos publicados por tema", async () => {
    const [topics, counts] = await Promise.all([
      topicRepository.listAll(),
      topicRepository.countPublishedStudies(),
    ]);
    const fe = topics.find((t) => t.slug === "fe")!;
    const direct = (await studyRepository.listByTopicSlug("fe")).length;
    expect(counts[fe.id]).toBe(direct);
    expect(direct).toBeGreaterThan(0);
  });

  it("characterRepository conta estudos publicados por personagem", async () => {
    const [chars, counts] = await Promise.all([
      characterRepository.listAll(),
      characterRepository.countPublishedStudies(),
    ]);
    const davi = chars.find((c) => c.slug === "davi")!;
    expect(counts[davi.id]).toBe((await studyRepository.listByCharacterSlug("davi")).length);
  });

  it("seriesRepository conta estudos publicados por série", async () => {
    const [seriesAll, counts] = await Promise.all([
      seriesRepository.listAll(),
      seriesRepository.countPublishedStudies(),
    ]);
    const vidaDeDavi = seriesAll.find((s) => s.slug === "vida-de-davi")!;
    expect(counts[vidaDeDavi.id]).toBe(2);
  });

  it("uma entidade sem nenhum estudo publicado simplesmente não aparece no mapa de contagens (trate como 0)", async () => {
    const [chars, counts] = await Promise.all([
      characterRepository.listAll(),
      characterRepository.countPublishedStudies(),
    ]);
    const maria = chars.find((c) => c.slug === "maria")!;
    expect(maria).toBeDefined();
    expect(counts[maria.id] ?? 0).toBe(0);
  });
});
