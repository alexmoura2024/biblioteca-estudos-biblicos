import { describe, expect, it } from "vitest";
import {
  assembleStudy,
  assembleStudySummary,
  mapBookRow,
  mapTipoRelacao,
} from "@/lib/repositories/supabase/mappers";
import type {
  BookRow,
  StudyCharacterJoinRow,
  StudyPassageJoinRow,
  StudyRow,
  StudySeriesJoinRow,
  StudyTopicJoinRow,
} from "@/lib/repositories/supabase/rows";

const BOOK_ROW: BookRow = {
  id: "book-1",
  nome: "Romanos",
  abreviacao: "Rm",
  slug: "romanos",
  testamento: "NT",
  ordem_canonica: 45,
  total_capitulos: 16,
};

const BOOK_ROW_2: BookRow = {
  id: "book-2",
  nome: "Gênesis",
  abreviacao: "Gn",
  slug: "genesis",
  testamento: "AT",
  ordem_canonica: 1,
  total_capitulos: 50,
};

const STUDY_ROW: StudyRow = {
  id: "study-1",
  titulo: "Fé que atravessa as Escrituras",
  slug: "fe-que-atravessa-as-escrituras",
  resumo: "resumo",
  conteudo: "conteúdo completo",
  status: "PUBLISHED",
  visibilidade: "publico",
  autor: "Profa. Marta Nascimento",
  data_origem: "2024-10-15",
  palavras_chave: ["fé", "justificação"],
  created_at: "2024-10-15T09:00:00.000Z",
  updated_at: "2024-10-15T09:00:00.000Z",
};

describe("mapBookRow / mapTipoRelacao", () => {
  it("converte snake_case do Postgres para camelCase do domínio", () => {
    expect(mapBookRow(BOOK_ROW)).toEqual({
      id: "book-1",
      nome: "Romanos",
      abreviacao: "Rm",
      slug: "romanos",
      testamento: "NT",
      ordemCanonica: 45,
      totalCapitulos: 16,
    });
  });

  it("mapeia MAIN/SECONDARY/CITED (schema) para principal/secundaria/citada (domínio)", () => {
    expect(mapTipoRelacao("MAIN")).toBe("principal");
    expect(mapTipoRelacao("SECONDARY")).toBe("secundaria");
    expect(mapTipoRelacao("CITED")).toBe("citada");
  });
});

describe("assembleStudy (Study completo)", () => {
  it("monta um estudo com múltiplas passagens em livros diferentes, temas, personagens e séries (prova N:N)", () => {
    const passageRows: StudyPassageJoinRow[] = [
      {
        study_id: "study-1",
        tipo_relacao: "MAIN",
        prioridade: 1,
        passages: {
          id: "passage-1",
          book_id: "book-1",
          capitulo: 4,
          versiculo_inicio: 1,
          versiculo_fim: 12,
          referencia_normalizada: "Romanos 4:1-12",
          books: BOOK_ROW,
        },
      },
      {
        study_id: "study-1",
        tipo_relacao: "SECONDARY",
        prioridade: 2,
        passages: {
          id: "passage-2",
          book_id: "book-2",
          capitulo: 15,
          versiculo_inicio: 1,
          versiculo_fim: 6,
          referencia_normalizada: "Gênesis 15:1-6",
          books: BOOK_ROW_2,
        },
      },
    ];
    const topicRows: StudyTopicJoinRow[] = [
      { study_id: "study-1", peso: 3, topics: { id: "t1", nome: "Fé", slug: "fe", descricao: "" } },
      { study_id: "study-1", peso: 2, topics: { id: "t2", nome: "Graça", slug: "graca", descricao: "" } },
    ];
    const characterRows: StudyCharacterJoinRow[] = [
      { study_id: "study-1", papel: "citado", characters: { id: "c1", nome: "Abraão", slug: "abraao", descricao: "" } },
      { study_id: "study-1", papel: "autor", characters: { id: "c2", nome: "Paulo", slug: "paulo", descricao: "" } },
    ];
    const seriesRows: StudySeriesJoinRow[] = [
      { study_id: "study-1", ordem: 1, series: { id: "s1", nome: "Fundamentos da Fé", slug: "fundamentos-da-fe", descricao: "" } },
      { study_id: "study-1", ordem: 2, series: { id: "s2", nome: "Cartas de Paulo", slug: "cartas-de-paulo", descricao: "" } },
    ];

    const study = assembleStudy(STUDY_ROW, passageRows, topicRows, characterRows, seriesRows);

    expect(study.id).toBe("study-1");
    expect(study.conteudo).toBe("conteúdo completo");
    expect(study.passagens).toHaveLength(2);
    expect(study.passagens.map((p) => p.book.slug)).toEqual(["romanos", "genesis"]);
    expect(study.passagens[0].tipoRelacao).toBe("principal");
    expect(study.passagens[1].tipoRelacao).toBe("secundaria");
    expect(study.temas).toHaveLength(2);
    expect(study.personagens).toHaveLength(2);
    expect(study.series.map((s) => s.series.slug)).toEqual(["fundamentos-da-fe", "cartas-de-paulo"]);
  });

  it("descarta uma linha de junção cuja relação embutida veio null (join sem match)", () => {
    const passageRows: StudyPassageJoinRow[] = [{ study_id: "study-1", tipo_relacao: "MAIN", prioridade: 1, passages: null }];
    const study = assembleStudy(STUDY_ROW, passageRows, [], [], []);
    expect(study.passagens).toEqual([]);
  });
});

describe("assembleStudySummary (StudySummary enxuto)", () => {
  const mainPassageRow: StudyPassageJoinRow = {
    study_id: "study-1",
    tipo_relacao: "MAIN",
    prioridade: 1,
    passages: {
      id: "passage-1",
      book_id: "book-1",
      capitulo: 4,
      versiculo_inicio: 1,
      versiculo_fim: 12,
      referencia_normalizada: "Romanos 4:1-12",
      books: BOOK_ROW,
    },
  };
  const citedPassageRow: StudyPassageJoinRow = {
    study_id: "study-1",
    tipo_relacao: "CITED",
    prioridade: 2,
    passages: {
      id: "passage-2",
      book_id: "book-2",
      capitulo: 15,
      versiculo_inicio: null,
      versiculo_fim: null,
      referencia_normalizada: "Gênesis 15",
      books: BOOK_ROW_2,
    },
  };

  it("usa a passagem MAIN como referência principal quando existe", () => {
    const summary = assembleStudySummary(STUDY_ROW, [citedPassageRow, mainPassageRow], [], []);
    expect(summary.referenciaPrincipal).toEqual({
      referenciaNormalizada: "Romanos 4:1-12",
      bookSlug: "romanos",
      capitulo: 4,
    });
  });

  it("usa a primeira passagem como fallback quando nenhuma é MAIN", () => {
    const summary = assembleStudySummary(STUDY_ROW, [citedPassageRow], [], []);
    expect(summary.referenciaPrincipal?.bookSlug).toBe("genesis");
  });

  it("referenciaPrincipal fica undefined quando não há passagem nenhuma", () => {
    const summary = assembleStudySummary(STUDY_ROW, [], [], []);
    expect(summary.referenciaPrincipal).toBeUndefined();
  });

  it("nunca inclui conteudo, palavrasChave ou personagens (StudySummary é enxuto por design — DEC-017)", () => {
    const summary = assembleStudySummary(STUDY_ROW, [mainPassageRow], [], []);
    expect(summary).not.toHaveProperty("conteudo");
    expect(summary).not.toHaveProperty("palavrasChave");
    expect(summary).not.toHaveProperty("personagens");
  });
});
