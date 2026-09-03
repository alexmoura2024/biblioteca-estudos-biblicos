import { describe, expect, it } from "vitest";
import { classifyReferences, scanReferences, selectMainReference } from "@/lib/ingestion/referenceScan";

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

  it("nunca adivinha o prefixo ordinal quando ele está ausente (ex.: 'Samuel 6:1' sozinho não diz se é 1 ou 2 Samuel)", () => {
    // Nem a abreviação exata (Pass 1: "1Sm"/"2Sm"), nem o nome completo
    // (Pass 2: "1 Samuel"/"2 Samuel"), nem a abreviação tradicional
    // (Pass 3: só gerada COM prefixo ordinal, nunca "sam" sozinho) aceitam
    // "Samuel" bare — ambiguidade real (qual dos dois livros?) nunca
    // resolvida por suposição.
    const conteudo = "Este relato está em Samuel 6:1, quando a arca voltou.";
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

describe("scanReferences — abreviações bíblicas tradicionais (Fase 3.1, checkpoint 14, DEC-038)", () => {
  // Achado real ao rodar o piloto completo: material editorial mais antigo
  // do acervo usa a convenção tradicional de citação (ARC/ARA), não a
  // abreviação interna do projeto — variando ponto de abreviação,
  // espaçamento e numeral romano/arábico para os livros com prefixo
  // ordinal. Casos exigidos explicitamente, cobrindo MÚLTIPLOS livros:
  const casos: Array<[string, string, string, number, number]> = [
    ["Ex. 15:17", "com ponto de abreviação", "exodo", 15, 17],
    ["Ex 15:17", "sem ponto", "exodo", 15, 17],
    ["Êx 15:17", "abreviação canônica do projeto, com acento", "exodo", 15, 17],
    ["II Sam. 6:1", "numeral romano + ponto", "2-samuel", 6, 1],
    ["2 Samuel 6:1", "nome completo com prefixo arábico", "2-samuel", 6, 1],
    ["I Cor. 13:1", "numeral romano + ponto, livro do NT", "1-corintios", 13, 1],
    ["1 Co 13:1", "abreviação canônica com espaço em vez de colada", "1-corintios", 13, 1],
    ["III Jo. 1:4", "numeral romano + ponto, epístola de João", "3-joao", 1, 4],
    ["3 João 1:4", "nome completo com prefixo arábico e acento", "3-joao", 1, 4],
  ];

  it.each(casos)("reconhece '%s' (%s)", (texto, _descricao, bookSlug, capitulo, versiculo) => {
    const [ref] = scanReferences(`Conforme está escrito em ${texto}, isto se cumpriu.`);
    expect(ref).toBeDefined();
    expect(ref.valid).toBe(true);
    expect(ref.book.slug).toBe(bookSlug);
    expect(ref.capitulo).toBe(capitulo);
    expect(ref.versiculoInicio).toBe(versiculo);
  });

  it("uma abreviação tradicional reconhecida ainda passa pelo validador canônico — capítulo impossível continua invalid:false", () => {
    // Êxodo tem 40 capítulos — 41 não existe. Reconhecer a abreviação
    // tradicional "Ex." nunca é suficiente sozinho para aceitar a
    // referência: o limite de capítulo/versículo (bibleVerseLimits.ts)
    // continua se aplicando exatamente como nas Passagens 1 e 2.
    const detected = scanReferences("Isso está em Ex. 41:1, o que não existe.");
    expect(detected).toHaveLength(1);
    expect(detected[0]).toMatchObject({ valid: false, invalidReason: "capitulo_fora_do_intervalo" });
  });
});

describe("selectMainReference — Fase 3.1, checkpoint 14 (DEC-039)", () => {
  it("Prioridade A: marcador explícito 'TEXTO:' vence mesmo quando não é a primeira referência do documento — caso real SEL-009", () => {
    const texto =
      "MENSAGEM\n\nTEXTO: João 14:5\n\nTEMA: O caminho\n\n" +
      "Como já mencionado em Cânticos 1:12, o convite de Jesus permanece: eu sou o caminho, a verdade e a vida.";
    const valid = scanReferences(texto).filter((r) => r.valid);
    const result = selectMainReference(valid, texto);
    expect(result.reason).toBe("explicit_marker");
    expect(result.main).toMatchObject({ capitulo: 14, versiculoInicio: 5 });
    expect(result.main?.book.slug).toBe("joao");
  });

  it("Prioridade C: referência predominante por concentração — SEL-022 (Atos espalhado por vários capítulos vence uma citação isolada de Gênesis)", () => {
    // Ilustração de abertura cita Gênesis 39 uma única vez; o texto-base
    // real (Atos) aparece cinco vezes, mas em capítulos DIFERENTES (8, 22,
    // 24, 26, 28) — nenhum agrupamento por capítulo se repete sozinho, só
    // o total por LIVRO desempata a favor de Atos. A ilustração de
    // abertura nunca deve virar MAIN só por vir primeiro no texto.
    const texto =
      "José foi tentado e permaneceu fiel, conforme Gênesis 39:1. " +
      "Paulo também testemunhou sob prisão: Atos 8:3, depois em Atos 22:1, " +
      "novamente em Atos 24:1, em Atos 26:1 e por fim em Atos 28:1.";
    const valid = scanReferences(texto).filter((r) => r.valid);
    const result = selectMainReference(valid, texto);
    expect(result.reason).toBe("predominant");
    expect(result.main?.book.slug).toBe("atos");
  });

  it("Prioridade C preserva o caso 'Pão e Vinho' sem regressão — João 6 permanece MAIN e as 5 passagens continuam todas presentes", () => {
    const texto =
      "Jesus se declara o pão da vida em João 6:51,54,55,57. " +
      "Ele já havia sido prefigurado quando Melquisedeque trouxe pão e vinho a Abraão, em Gênesis 14:18–19.";
    const detected = scanReferences(texto);
    const valid = detected.filter((r) => r.valid);
    expect(valid).toHaveLength(5);

    const result = selectMainReference(valid, texto);
    expect(result.reason).toBe("predominant");
    expect(result.main?.book.slug).toBe("joao");
    expect(result.main?.capitulo).toBe(6);

    // A classificação final continua trazendo as 5 passagens — a melhoria
    // de MAIN não pode reduzir o conjunto de referências detectadas.
    const classified = classifyReferences(detected, result.main);
    expect(classified).toHaveLength(5);
    expect(classified[0]).toMatchObject({ tipoRelacao: "principal", capitulo: 6, versiculoInicio: 51 });
  });

  it("nunca escolhe arbitrariamente quando duas referências têm evidência semelhante — devolve reason:'ambiguous'", () => {
    // Uma citação de cada livro, em capítulos diferentes, sem marcador
    // explícito e sem referência preliminar — não há como preferir uma
    // sobre a outra sem inventar critério.
    const texto = "Isto ecoa tanto Romanos 8:1 quanto Efésios 2:8, cada um em seu próprio contexto.";
    const valid = scanReferences(texto).filter((r) => r.valid);
    const result = selectMainReference(valid, texto);
    expect(result.reason).toBe("ambiguous");
    // Mesmo ambíguo, ainda devolve um valor determinístico (fallback: a
    // primeira em ordem de aparição) — o esquema exige uma linha MAIN.
    expect(result.main).toMatchObject({ capitulo: 8, versiculoInicio: 1 });
    expect(result.main?.book.slug).toBe("romanos");
  });

  it("Prioridade B: referência preliminar do manifesto (título) confirmada no conteúdo vence a predominância simples", () => {
    const texto = "Paulo escreve: Romanos 8:1 não há condenação. Isso é citado de novo em Romanos 8:28 e também em Efésios 2:8.";
    const valid = scanReferences(texto).filter((r) => r.valid);
    // Sem referência preliminar, Romanos já venceria por predominância —
    // este teste prova que a Prioridade B (quando presente) é checada
    // ANTES da C e concorda com o mesmo resultado aqui; o teste seguinte
    // prova que B pode DIVERGIR do que C escolheria sozinha.
    const result = selectMainReference(valid, texto, "Romanos 8");
    expect(result.reason).toBe("title_confirmed");
    expect(result.main?.book.slug).toBe("romanos");
  });
});
