import { describe, expect, it } from "vitest";
import { classifyReferences, scanReferences } from "@/lib/ingestion/referenceScan";

describe("scanReferences", () => {
  it("reconhece múltiplas referências em qualquer posição do texto, não só no início", () => {
    const texto =
      "Neste estudo, Jesus se declara o pão da vida em João 6:51,54,55,57. " +
      "Ele já havia sido prefigurado quando Melquisedeque trouxe pão e vinho " +
      "a Abraão, em Gênesis 14:18–19.";

    const detected = scanReferences(texto);
    const validas = detected.filter((r) => r.valid);

    // João 6:51, 6:54, 6:55, 6:57 (quatro linhas distintas — lista separada
    // por vírgula não vira um intervalo largo e impreciso) + Gênesis 14:18–19.
    expect(validas).toHaveLength(5);
    expect(validas.slice(0, 4).map((r) => [r.book.slug, r.capitulo, r.versiculoInicio])).toEqual([
      ["joao", 6, 51],
      ["joao", 6, 54],
      ["joao", 6, 55],
      ["joao", 6, 57],
    ]);
    expect(validas[4]).toMatchObject({ capitulo: 14, versiculoInicio: 18, versiculoFim: 19 });
    expect(validas[4].book.slug).toBe("genesis");
  });

  it("classifica a primeira referência válida como principal e as demais como secundária (nunca citada automaticamente)", () => {
    const texto = "João 6:51,54,55,57 — pão da vida. Prefigurado em Gênesis 14:18–19.";
    const classified = classifyReferences(scanReferences(texto));

    expect(classified[0]).toMatchObject({ tipoRelacao: "principal", capitulo: 6, versiculoInicio: 51 });
    expect(classified.slice(1).every((r) => r.tipoRelacao === "secundaria")).toBe(true);
    expect(classified.some((r) => r.tipoRelacao === "citada")).toBe(false);
  });

  it("extrai a referência do CONTEÚDO, não do título/nome de arquivo — caso 'A Eira de Araúna'", () => {
    // O nome do arquivo do piloto diz "Êxodo 15:7", mas o conteúdo real
    // usa Êxodo 15:17 (ver docs/fase3-piloto/PILOTO_FASE3_MANIFEST.csv,
    // SEL-035). O scanner só lê o corpo do texto — nunca o título.
    const conteudo = "O lugar que o Senhor escolheu para sua habitação está em Êxodo 15:17, o santuário firmado por suas mãos.";
    const [ref] = classifyReferences(scanReferences(conteudo));
    expect(ref).toMatchObject({ capitulo: 15, versiculoInicio: 17, tipoRelacao: "principal" });
    expect(ref.book.slug).toBe("exodo");
  });

  it("extrai a referência do conteúdo — caso 'A Comunhão' (nome de arquivo traz 2:43-43, conteúdo traz 2:42–43)", () => {
    const conteudo = "A igreja primitiva perseverava na doutrina dos apóstolos e na comunhão, conforme Atos 2:42–43.";
    const [ref] = classifyReferences(scanReferences(conteudo));
    expect(ref).toMatchObject({ capitulo: 2, versiculoInicio: 42, versiculoFim: 43 });
    expect(ref.book.slug).toBe("atos");
  });

  it("reconhece referência simples de um único versículo — caso 'Jesus, a Fonte da Salvação'", () => {
    const conteudo = "Depois da grande matança dos filisteus, Sansão teve sede, conforme relata Juízes 15:18–19.";
    const [ref] = classifyReferences(scanReferences(conteudo));
    expect(ref).toMatchObject({ capitulo: 15, versiculoInicio: 18, versiculoFim: 19 });
    expect(ref.book.slug).toBe("juizes");
  });

  it("reconhece referência curta — caso 'Untitled document' (Apocalipse 4:1)", () => {
    const conteudo = "João viu uma porta aberta no céu, conforme Apocalipse 4:1.";
    const [ref] = classifyReferences(scanReferences(conteudo));
    expect(ref).toMatchObject({ capitulo: 4, versiculoInicio: 1 });
    expect(ref.book.slug).toBe("apocalipse");
  });

  it("uma referência estruturalmente impossível nunca é aceita — fica valid:false com o motivo, nunca armazenada como válida", () => {
    // João 3 tem 36 versículos (bibleVerseLimits.ts) — 37 não existe.
    const conteudo = "Como já dissemos em João 3:37, o amor de Deus é eterno.";
    const detected = scanReferences(conteudo);
    expect(detected).toHaveLength(1);
    expect(detected[0]).toMatchObject({ valid: false, invalidReason: "versiculo_acima_do_maximo_do_capitulo" });
    // Uma referência inválida nunca aparece na classificação MAIN/SECONDARY.
    expect(classifyReferences(detected)).toHaveLength(0);
  });

  it("não reconhece um livro sozinho sem capítulo (insuficiente para uma referência de ingestão)", () => {
    const conteudo = "Este estudo fala sobre Lucas e seu evangelho, sem citar um capítulo específico.";
    expect(scanReferences(conteudo)).toHaveLength(0);
  });

  it("reconhece nome completo de livro SEM o acento — achado real ao rodar contra o piloto (REV-001 escreve 'Galatas' sem acento)", () => {
    const conteudo = "Mas faço-vos saber, irmãos, que o evangelho por mim anunciado. Galatas 1:11-12.";
    const [ref] = classifyReferences(scanReferences(conteudo));
    expect(ref).toMatchObject({ capitulo: 1, versiculoInicio: 11, versiculoFim: 12 });
    expect(ref.book.slug).toBe("galatas");
  });

  it("nunca reconhece uma ABREVIAÇÃO sem o acento correto (só nomes completos ganham o fallback insensível a acento)", () => {
    // "Jo" já é a abreviação exata de João; o que este teste prova é que
    // uma abreviação com acento ERRADO/removido não ganha um fallback —
    // "Rm" é Romanos; sem o acento não faria diferença (não tem acento),
    // então usamos um caso onde a abreviação tem acento: "Êx" (Êxodo).
    const conteudo = "Isso é discutido em Ex 3:14, o nome revelado a Moisés.";
    expect(scanReferences(conteudo)).toHaveLength(0);
  });

  it("distingue João de Jó pelo acento da abreviação, sem fallback ambíguo (só a passagem sensível a acento é usada)", () => {
    // "Jo" (sem acento) é literalmente a abreviação de João; "Jó" (com
    // acento) é a de Jó — como a varredura de ingestão nunca cai para um
    // fallback sem acento (diferente do parser da busca), não há
    // ambiguidade real a resolver aqui: cada uma resolve para o livro
    // certo diretamente.
    expect(scanReferences("Jo 3:16 é conhecido.")[0].book.slug).toBe("joao");
    expect(scanReferences("Jó 3:16 fala do sofrimento.")[0].book.slug).toBe("jo");
  });
});
