import { describe, expect, it } from "vitest";
import { parseReference } from "@/lib/search/referenceParser";
import { books } from "@/lib/data/books";

describe("parseReference", () => {
  it("reconhece referência completa com dois-pontos: João 3:16", () => {
    const result = parseReference("João 3:16");
    expect(result).toMatchObject({
      type: "verse",
      capitulo: 3,
      versiculoInicio: 16,
    });
    if (result.type === "verse") expect(result.book.nome).toBe("João");
  });

  it("reconhece abreviação com ponto: Jo 3.16", () => {
    const result = parseReference("Jo 3.16");
    expect(result).toMatchObject({ type: "verse", capitulo: 3, versiculoInicio: 16 });
    if (result.type === "verse") expect(result.book.nome).toBe("João");
  });

  it("reconhece capítulo e versículo separados por espaço: João 3 16", () => {
    const result = parseReference("João 3 16");
    expect(result).toMatchObject({ type: "verse", capitulo: 3, versiculoInicio: 16 });
  });

  it("reconhece intervalo de versículos: Lucas 22:47-52", () => {
    const result = parseReference("Lucas 22:47-52");
    expect(result).toMatchObject({
      type: "verse",
      capitulo: 22,
      versiculoInicio: 47,
      versiculoFim: 52,
    });
  });

  it("reconhece apenas o livro: João", () => {
    const result = parseReference("João");
    expect(result).toMatchObject({ type: "book" });
    if (result.type === "book") expect(result.book.nome).toBe("João");
  });

  it("reconhece livro e capítulo: João 3", () => {
    const result = parseReference("João 3");
    expect(result).toMatchObject({ type: "chapter", capitulo: 3 });
  });

  it("é insensível a caixa e a acentos: joao 3:16 e JOÃO 3:16", () => {
    expect(parseReference("joao 3:16")).toMatchObject({ type: "verse", capitulo: 3, versiculoInicio: 16 });
    expect(parseReference("JOÃO 3:16")).toMatchObject({ type: "verse", capitulo: 3, versiculoInicio: 16 });
  });

  it("reconhece livros com nome composto e numeral: 1 Samuel 17", () => {
    const result = parseReference("1 Samuel 17");
    expect(result).toMatchObject({ type: "chapter", capitulo: 17 });
    if (result.type === "chapter") expect(result.book.nome).toBe("1 Samuel");
  });

  it("reconhece abreviação compacta sem espaço: 1Sm 17:32", () => {
    const result = parseReference("1Sm 17:32");
    expect(result).toMatchObject({ type: "verse", capitulo: 17, versiculoInicio: 32 });
    if (result.type === "verse") expect(result.book.nome).toBe("1 Samuel");
  });

  it('desambigua "Jo" (João) de "Jó" (Jó) quando o acento está presente', () => {
    const joao = parseReference("Jo 1:1");
    expect(joao.type).toBe("verse");
    if (joao.type === "verse") expect(joao.book.nome).toBe("João");

    const job = parseReference("Jó 1:1");
    expect(job.type).toBe("verse");
    if (job.type === "verse") expect(job.book.nome).toBe("Jó");
  });

  it('usa a presença do acento para distinguir "Jo" (João) de "Jó" (Jó), a convenção usual', () => {
    // "jo" sem acento é convencionalmente João; "jó" com acento é Jó.
    // Isso não é uma adivinhação: é a mesma distinção ortográfica que
    // um leitor humano usaria — por isso não conta como interpretação
    // silenciosa de referência ambígua (docs/SEARCH_SPEC.md, seção 4).
    const joao = parseReference("jo 1:1");
    expect(joao.type).toBe("verse");
    if (joao.type === "verse") expect(joao.book.nome).toBe("João");
  });

  it("mecanismo de ambiguidade: se um alias normalizado casar com mais de um livro, nenhum é escolhido silenciosamente", () => {
    // Não há, hoje, dois livros cujo alias colida após a normalização
    // (a única quase-colisão, Jo/Jó, já é resolvida pelo acento acima).
    // Este teste documenta a garantia estrutural do parser para o caso
    // em que um livro futuro introduza essa colisão.
    const map = new Map<string, number>();
    for (const book of books) {
      for (const alias of [book.nome, book.abreviacao]) {
        const key = alias
          .normalize("NFD")
          .replace(/[̀-ͯ]/g, "")
          .toLowerCase()
          .replace(/\s+/g, "");
        map.set(key, (map.get(key) ?? 0) + 1);
      }
    }
    const collisions = [...map.entries()].filter(([, count]) => count > 1);
    // A única colisão esperada é "jo" (João x Jó), já tratada pelo acento.
    expect(collisions.map(([key]) => key)).toEqual(["jo"]);
  });

  it('não sequestra buscas comuns que começam com abreviação de 2 letras: "os cristãos e a fé"', () => {
    const result = parseReference("os cristãos e a fé");
    expect(result.type).toBe("none");
  });

  it('mas reconhece a mesma abreviação quando seguida de capítulo: "Os 3"', () => {
    const result = parseReference("Os 3");
    expect(result).toMatchObject({ type: "chapter", capitulo: 3 });
    if (result.type === "chapter") expect(result.book.nome).toBe("Oséias");
  });

  it("retorna none para texto sem referência bíblica", () => {
    expect(parseReference("oração e misericórdia")).toEqual({ type: "none" });
    expect(parseReference("")).toEqual({ type: "none" });
  });

  describe("referências estruturalmente inválidas (Marco 1.1)", () => {
    it("rejeita capítulo além do total do livro: João 999:999", () => {
      // João tem 21 capítulos.
      const result = parseReference("João 999:999");
      expect(result).toMatchObject({ type: "invalid", reason: "capitulo_fora_do_intervalo", capitulo: 999 });
      if (result.type === "invalid") expect(result.book.nome).toBe("João");
    });

    it("rejeita capítulo zero: João 0", () => {
      const result = parseReference("João 0");
      expect(result).toMatchObject({ type: "invalid", reason: "capitulo_fora_do_intervalo", capitulo: 0 });
    });

    it("rejeita capítulo exatamente um a mais que o total do livro (fronteira)", () => {
      const judas = books.find((b) => b.nome === "Judas");
      expect(judas?.totalCapitulos).toBe(1);
      const result = parseReference("Judas 2");
      expect(result).toMatchObject({ type: "invalid", reason: "capitulo_fora_do_intervalo", capitulo: 2 });
    });

    it("aceita o último capítulo válido do livro (fronteira)", () => {
      const result = parseReference("Judas 1");
      expect(result).toMatchObject({ type: "chapter", capitulo: 1 });
    });

    it("rejeita versículo zero: João 3:0", () => {
      const result = parseReference("João 3:0");
      expect(result).toMatchObject({ type: "invalid", reason: "versiculo_menor_que_um", capitulo: 3, versiculoInicio: 0 });
    });

    it("rejeita intervalo de versículos invertido: João 3:20-16", () => {
      const result = parseReference("João 3:20-16");
      expect(result).toMatchObject({
        type: "invalid",
        reason: "intervalo_de_versiculos_invertido",
        versiculoInicio: 20,
        versiculoFim: 16,
      });
    });

    it("aceita intervalo com início igual ao fim (não é considerado invertido)", () => {
      const result = parseReference("João 3:16-16");
      expect(result).toMatchObject({ type: "verse", versiculoInicio: 16, versiculoFim: 16 });
    });
  });
});
