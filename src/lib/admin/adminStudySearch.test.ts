import { describe, expect, it } from "vitest";
import {
  buildAdminStudyFilterHref,
  buildAdminStudySearchFilter,
  normalizeAdminStudySearch,
} from "./adminStudySearch";

describe("busca administrativa de estudos", () => {
  it("normaliza espaços e limita caracteres da consulta", () => {
    expect(normalizeAdminStudySearch("  revelação,   graça!  ")).toBe(
      "revelação graça",
    );
  });

  it("preserva letras acentuadas, números e hífen", () => {
    expect(normalizeAdminStudySearch("João 3-16")).toBe("João 3-16");
  });

  it("gera o filtro textual do Supabase", () => {
    expect(buildAdminStudySearchFilter("revelação")).toBe(
      "titulo.ilike.%revelação%,resumo.ilike.%revelação%,conteudo.ilike.%revelação%",
    );
  });

  it("preserva busca e status nos links dos filtros", () => {
    expect(buildAdminStudyFilterHref("REVIEW", "aliança")).toBe(
      "/admin/estudos?status=REVIEW&q=alian%C3%A7a",
    );
    expect(buildAdminStudyFilterHref("ALL", "")).toBe("/admin/estudos");
  });
});