import { describe, expect, it } from "vitest";
import {
  auditStudyDraft,
  extractBiblicalReferences,
  normalizeDraftMarkdown,
} from "@/lib/admin/editorTools";

describe("extractBiblicalReferences", () => {
  it("extrai referências bíblicas válidas do texto", () => {
    expect(
      extractBiblicalReferences(
        "Leia João 3:16 e Romanos 8:22-23. Depois compare com João 3:16.",
      ),
    ).toEqual(["João 3:16", "Romanos 8:22-23"]);
  });

  it("reconhece referência escrita por extenso", () => {
    expect(
      extractBiblicalReferences(
        "Apocalipse, capítulo 4, versículo 1, apresenta uma porta aberta.",
      ),
    ).toEqual(["Apocalipse 4:1"]);
  });

  it("usa a referência principal como contexto para versículos isolados", () => {
    expect(
      extractBiblicalReferences(
        "No versículo 10 Paulo adverte. Depois, no versículo 22, o Senhor consola. No v. 34 vem nova orientação.",
        "Atos 27",
      ),
    ).toEqual(["Atos 27:10", "Atos 27:22", "Atos 27:34"]);
  });

  it("reconhece intervalo de versículos com contexto", () => {
    expect(
      extractBiblicalReferences(
        "Observe os versículos 35-37.",
        "Atos 27:1",
      ),
    ).toEqual(["Atos 27:35-37"]);
  });

  it("ignora números comuns", () => {
    expect(extractBiblicalReferences("Davi reinou 40 anos.")).toEqual([]);
  });
});

describe("normalizeDraftMarkdown", () => {
  it("normaliza espaços e quebras excessivas", () => {
    expect(normalizeDraftMarkdown("Texto   \r\n\r\n\r\n\r\nOutro")).toBe(
      "Texto\n\n\nOutro",
    );
  });
});

describe("auditStudyDraft", () => {
  it("aprova a estrutura editorial completa", () => {
    const checks = auditStudyDraft({
      titulo: "Estudo",
      autor: "Autor",
      data_origem: "2026-09-10",
      tipo_estudo: "EXPOSITIVO",
      referencia_principal: "João 3:16",
      resumo:
        "Resumo suficientemente desenvolvido para representar o conteúdo do estudo nos cards da biblioteca virtual.",
      conteudo:
        "**Introdução**\n\nJoão 3:16 apresenta o texto base. " +
        "A".repeat(120) +
        "\n\n**Desenvolvimento**\n\n" +
        "B".repeat(120) +
        "\n\n**Conclusão**\n\n" +
        "C".repeat(120),
      palavras_chave: "salvação, graça, amor",
    });

    expect(checks.find((check) => check.id === "estrutura")?.status).toBe(
      "pass",
    );
    expect(
      checks.find((check) => check.id === "referencia")?.status,
    ).toBe("pass");
  });
});
