import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import StudyPage from "@/app/estudo/[slug]/page";

describe("StudyPage", () => {
  it("renderiza título, resumo, conteúdo e badges de um estudo publicado", async () => {
    render(await StudyPage({ params: Promise.resolve({ slug: "o-senhor-e-o-meu-pastor" }) }));

    expect(screen.getByRole("heading", { name: "O Senhor é o meu pastor" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Salmos 23:1-6" })).toHaveAttribute(
      "href",
      "/biblia/salmos/23",
    );
    expect(screen.getByRole("link", { name: "Fé" })).toHaveAttribute("href", "/temas/fe");
  });

  it("mostra todas as referências, temas, personagens e séries de um estudo multi-passagem (Marco 1.1)", async () => {
    render(
      await StudyPage({
        params: Promise.resolve({ slug: "fe-que-atravessa-as-escrituras-de-abraao-a-paulo" }),
      }),
    );

    expect(
      screen.getByRole("heading", { name: "Fé que atravessa as Escrituras: de Abraão a Paulo" }),
    ).toBeInTheDocument();

    // As 4 referências bíblicas (uma por passagem), todas visíveis.
    expect(screen.getByRole("link", { name: "Romanos 4:1-12" })).toHaveAttribute("href", "/biblia/romanos/4");
    expect(screen.getByRole("link", { name: "Gênesis 15:1-6" })).toHaveAttribute("href", "/biblia/genesis/15");
    expect(screen.getByRole("link", { name: "Habacuque 2:2-4" })).toHaveAttribute("href", "/biblia/habacuque/2");
    expect(screen.getByRole("link", { name: "João 3" })).toHaveAttribute("href", "/biblia/joao/3");

    // As 2 séries (N:N).
    expect(screen.getByRole("link", { name: "Fundamentos da Fé" })).toHaveAttribute(
      "href",
      "/series/fundamentos-da-fe",
    );
    expect(screen.getByRole("link", { name: "Cartas de Paulo" })).toHaveAttribute(
      "href",
      "/series/cartas-de-paulo",
    );

    // Os 2+ temas e 2 personagens.
    expect(screen.getByRole("link", { name: "Fé" })).toHaveAttribute("href", "/temas/fe");
    expect(screen.getByRole("link", { name: "Graça" })).toHaveAttribute("href", "/temas/graca");
    expect(screen.getByRole("link", { name: "Abraão" })).toHaveAttribute("href", "/personagens/abraao");
    expect(screen.getByRole("link", { name: "Paulo" })).toHaveAttribute("href", "/personagens/paulo");
  });

  it("chama notFound() para um slug inexistente", async () => {
    await expect(
      StudyPage({ params: Promise.resolve({ slug: "nao-existe" }) }),
    ).rejects.toThrow();
  });

  it("chama notFound() para um estudo em DRAFT (não publicado)", async () => {
    await expect(
      StudyPage({
        params: Promise.resolve({ slug: "a-mulher-virtuosa-rascunho-em-revisao" }),
      }),
    ).rejects.toThrow();
  });
});
