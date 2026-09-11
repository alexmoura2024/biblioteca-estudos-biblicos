import { describe, expect, it } from "vitest";
import {
  editorialGateReady,
  evaluateEditorialGate,
} from "@/lib/admin/editorialGate";

describe("evaluateEditorialGate", () => {
  const complete = {
    titulo: "A tempestade e a providência",
    autor: "Alex",
    data_origem: "2026-09-11",
    resumo:
      "Mensagem expositiva sobre a providência de Deus durante a tempestade e a preservação daqueles que estavam com Paulo.",
    conteudo:
      "**Introdução**\n\n" +
      "A".repeat(140) +
      "\n\n**Desenvolvimento**\n\n" +
      "B".repeat(140) +
      "\n\n**Conclusão**\n\n" +
      "C".repeat(140),
    palavras_chave: ["tempestade", "providência", "Paulo"],
    passages: [
      {
        tipo_relacao: "MAIN" as const,
      },
      {
        tipo_relacao: "CITED" as const,
      },
    ],
  };

  it("libera o gate quando todos os requisitos estão prontos", () => {
    const checks = evaluateEditorialGate(complete);
    expect(editorialGateReady(checks)).toBe(true);
  });

  it("bloqueia o gate sem estrutura editorial", () => {
    const checks = evaluateEditorialGate({
      ...complete,
      conteudo: "Texto sem as três seções.".repeat(30),
    });

    expect(editorialGateReady(checks)).toBe(false);
    expect(
      checks.find((check) => check.id === "estrutura")?.pass,
    ).toBe(false);
  });

  it("bloqueia o gate sem referência principal", () => {
    const checks = evaluateEditorialGate({
      ...complete,
      passages: [{ tipo_relacao: "CITED" }],
    });

    expect(editorialGateReady(checks)).toBe(false);
  });
});
