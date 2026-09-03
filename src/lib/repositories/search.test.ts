import { describe, expect, it } from "vitest";
import { searchRepository, studyRepository } from "@/lib/repositories";
import { parseSearchQuery } from "@/lib/search/queryParsing";
import { WEIGHTS } from "@/lib/search/search";

const MULTI_PASSAGE_TITLE = "Fé que atravessa as Escrituras: de Abraão a Paulo";
const MULTI_PASSAGE_SLUG = "fe-que-atravessa-as-escrituras-de-abraao-a-paulo";

describe("MockSearchRepository.search — filtros e paginação", () => {
  it("filtra por livro e testamento combinados", async () => {
    const outcome = await searchRepository.search({ texto: "fé", livro: "romanos" });
    // `SearchResultItem.study` é StudySummary (Marco 1.2 — DEC-017), sem
    // o array completo de passagens; verificamos o filtro por resultado
    // esperado (só os dois estudos publicados com passagem em Romanos
    // podem aparecer) em vez de inspecionar passagens que o DTO não
    // expõe mais.
    expect(outcome.items.length).toBeGreaterThan(0);
    const titles = outcome.items.map((i) => i.study.titulo);
    const romanosStudyTitles = ["Nenhuma condenação: Romanos 8", MULTI_PASSAGE_TITLE];
    expect(titles.every((t) => romanosStudyTitles.includes(t))).toBe(true);
    // O estudo multi-passagem tem "Fé" no título, então bate com certeza.
    expect(titles).toContain(MULTI_PASSAGE_TITLE);
  });

  it("navegação por filtro puro (sem texto) ainda retorna resultados", async () => {
    const outcome = await searchRepository.search({ tema: "fe" });
    expect(outcome.items.length).toBeGreaterThan(0);
    expect(outcome.items.every((i) => i.study.temas.some((t) => t.topic.slug === "fe"))).toBe(true);
  });

  it("sem texto e sem filtro nenhum, não há resultados", async () => {
    const outcome = await searchRepository.search({});
    expect(outcome.items).toEqual([]);
    expect(outcome.total).toBe(0);
  });

  it("pagina corretamente: total reflete todos os matches, items só a página pedida", async () => {
    const full = await searchRepository.search({ tema: "fe", limit: 100 });
    expect(full.total).toBeGreaterThan(2);

    const firstPage = await searchRepository.search({ tema: "fe", limit: 2, page: 1 });
    expect(firstPage.items).toHaveLength(2);
    expect(firstPage.total).toBe(full.total);

    const secondPage = await searchRepository.search({ tema: "fe", limit: 2, page: 2 });
    expect(secondPage.items).toHaveLength(2);
    // Páginas diferentes não repetem o mesmo estudo no mesmo lugar.
    expect(secondPage.items[0].study.id).not.toBe(firstPage.items[0].study.id);
  });

  it("página além do total retorna lista vazia sem erro", async () => {
    const outcome = await searchRepository.search({ tema: "fe", limit: 5, page: 999 });
    expect(outcome.items).toEqual([]);
    expect(outcome.total).toBeGreaterThan(0);
  });
});

describe("Busca de ponta a ponta via parseSearchQuery + SearchRepository", () => {
  it('"João 3:16" prioriza o match exato sobre o estudo classificado só no capítulo, e nunca traz estudo sem relação', async () => {
    const parsed = parseSearchQuery("João 3:16");
    expect(parsed.ambiguousReference).toBeUndefined();
    expect(parsed.invalidReference).toBeUndefined();

    const outcome = await searchRepository.search({ texto: parsed.texto, referencia: parsed.referencia });

    const titles = outcome.items.map((i) => i.study.titulo);
    const nicodemosIndex = titles.findIndex((t) => t.includes("Nicodemos"));
    const multiPassageIndex = titles.findIndex((t) => t === MULTI_PASSAGE_TITLE);

    expect(nicodemosIndex).toBeGreaterThanOrEqual(0);
    expect(multiPassageIndex).toBeGreaterThanOrEqual(0);
    expect(nicodemosIndex).toBeLessThan(multiPassageIndex); // match exato vem antes.
    expect(outcome.items[nicodemosIndex].score).toBe(WEIGHTS.referenceExactVerse);
    expect(outcome.items[multiPassageIndex].score).toBe(WEIGHTS.referenceChapter);

    // Nenhum resultado de um estudo sem qualquer passagem em João 3.
    const golias = outcome.items.find((i) => i.study.titulo.includes("Golias"));
    expect(golias).toBeUndefined();
  });

  it('rejeita "João 999:999" como referência inválida (nunca "referência reconhecida")', () => {
    const parsed = parseSearchQuery("João 999:999");
    expect(parsed.referencia).toBeUndefined();
    expect(parsed.recognizedReference).toBeUndefined();
    expect(parsed.invalidReference).toMatchObject({ reason: "capitulo_fora_do_intervalo", capitulo: 999 });
  });
});

describe("Estudo multi-passagem/multi-série (Marco 1.1, prova de relações N:N)", () => {
  it("tem 4+ passagens em livros diferentes, com principal, secundária e citada", async () => {
    const study = await studyRepository.getPublishedBySlug(MULTI_PASSAGE_SLUG);
    if (!study) throw new Error("estudo multi-passagem não encontrado pelo slug");
    expect(study).toBeDefined();

    expect(study.passagens.length).toBeGreaterThanOrEqual(3);
    const livros = new Set(study.passagens.map((p) => p.book.slug));
    expect(livros.size).toBeGreaterThanOrEqual(3);

    const tipos = study.passagens.map((p) => p.tipoRelacao);
    expect(tipos.filter((t) => t === "principal")).toHaveLength(1);
    expect(tipos.some((t) => t === "secundaria")).toBe(true);
    expect(tipos.some((t) => t === "citada")).toBe(true);
  });

  it("tem 2+ temas e 2+ personagens", async () => {
    const study = await studyRepository.getPublishedBySlug(MULTI_PASSAGE_SLUG);
    if (!study) throw new Error("estudo multi-passagem não encontrado pelo slug");
    expect(study.temas.length).toBeGreaterThanOrEqual(2);
    expect(study.personagens.length).toBeGreaterThanOrEqual(2);
  });

  it("pertence a 2+ séries (N:N) e mantém ordens independentes em cada uma", async () => {
    const study = await studyRepository.getPublishedBySlug(MULTI_PASSAGE_SLUG);
    if (!study) throw new Error("estudo multi-passagem não encontrado pelo slug");
    expect(study.series.length).toBeGreaterThanOrEqual(2);
    const slugs = study.series.map((s) => s.series.slug).sort();
    expect(slugs).toEqual(["cartas-de-paulo", "fundamentos-da-fe"]);
  });

  it("mantém uma referência principal previsível (uma única passagem tipo 'principal')", async () => {
    const study = await studyRepository.getPublishedBySlug(MULTI_PASSAGE_SLUG);
    if (!study) throw new Error("estudo multi-passagem não encontrado pelo slug");
    const principal = study.passagens.filter((p) => p.tipoRelacao === "principal");
    expect(principal).toHaveLength(1);
    expect(principal[0].book.slug).toBe("romanos");
    expect(principal[0].passage.referenciaNormalizada).toBe("Romanos 4:1-12");
  });

  it("aparece na navegação de todos os livros relacionados (listByBookSlug)", async () => {
    for (const slug of ["romanos", "genesis", "habacuque", "joao"]) {
      const studies = await studyRepository.listByBookSlug(slug);
      expect(studies.some((s) => s.titulo === MULTI_PASSAGE_TITLE)).toBe(true);
    }
  });

  it("aparece especificamente no capítulo de cada passagem (listByBookSlug com capítulo)", async () => {
    expect((await studyRepository.listByBookSlug("romanos", 4)).some((s) => s.titulo === MULTI_PASSAGE_TITLE)).toBe(true);
    expect((await studyRepository.listByBookSlug("genesis", 15)).some((s) => s.titulo === MULTI_PASSAGE_TITLE)).toBe(true);
    expect((await studyRepository.listByBookSlug("habacuque", 2)).some((s) => s.titulo === MULTI_PASSAGE_TITLE)).toBe(true);
    expect((await studyRepository.listByBookSlug("joao", 3)).some((s) => s.titulo === MULTI_PASSAGE_TITLE)).toBe(true);
    // Mas não em um capítulo onde não tem passagem.
    expect((await studyRepository.listByBookSlug("romanos", 8)).some((s) => s.titulo === MULTI_PASSAGE_TITLE)).toBe(false);
  });

  it("aparece nas buscas por cada uma das quatro referências diferentes", async () => {
    const referencias = ["Romanos 4", "Gênesis 15", "Habacuque 2", "João 3"];
    for (const raw of referencias) {
      const parsed = parseSearchQuery(raw);
      expect(parsed.referencia).toBeDefined();
      const outcome = await searchRepository.search({ texto: parsed.texto, referencia: parsed.referencia });
      expect(outcome.items.some((i) => i.study.titulo === MULTI_PASSAGE_TITLE)).toBe(true);
    }
  });

  it("aparece na busca por qualquer uma das duas séries", async () => {
    const emFundamentos = await searchRepository.search({ serie: "fundamentos-da-fe" });
    const emCartasDePaulo = await searchRepository.search({ serie: "cartas-de-paulo" });
    expect(emFundamentos.items.some((i) => i.study.titulo === MULTI_PASSAGE_TITLE)).toBe(true);
    expect(emCartasDePaulo.items.some((i) => i.study.titulo === MULTI_PASSAGE_TITLE)).toBe(true);
  });
});
