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
