import { describe, expect, it } from "vitest";
import {
  bookRepository,
  characterRepository,
  seriesRepository,
  studyRepository,
  topicRepository,
} from "@/lib/repositories";

describe("MockStudyRepository", () => {
  it("lista apenas estudos publicados", async () => {
    const studies = await studyRepository.listPublished();
    expect(studies.length).toBeGreaterThan(0);
    expect(studies.every((s) => s.status === "PUBLISHED")).toBe(true);
  });

  it("não retorna o estudo em DRAFT pelo slug", async () => {
    const draft = await studyRepository.getPublishedBySlug("a-mulher-virtuosa-rascunho-em-revisao");
    expect(draft).toBeUndefined();
  });

  it("busca por slug retorna o estudo esperado", async () => {
    const study = await studyRepository.getPublishedBySlug("o-senhor-e-o-meu-pastor");
    expect(study?.titulo).toBe("O Senhor é o meu pastor");
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
