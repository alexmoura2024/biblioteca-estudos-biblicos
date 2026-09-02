import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import HomePage from "@/app/page";

describe("HomePage", () => {
  it("renderiza o campo de busca principal e os links de navegação", async () => {
    render(await HomePage());

    expect(screen.getByRole("heading", { name: /biblioteca virtual de estudos bíblicos/i })).toBeInTheDocument();
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
    // Cards de "Navegar por": o nome acessível do link concatena título e
    // descrição sem espaço ("BíbliaNavegue..."), por isso o casamento é
    // por prefixo, não por igualdade exata.
    expect(screen.getByRole("link", { name: /^Bíblia/ })).toHaveAttribute("href", "/biblia");
    expect(screen.getByRole("link", { name: /^Temas/ })).toHaveAttribute("href", "/temas");
    expect(screen.getByRole("link", { name: /^Personagens/ })).toHaveAttribute("href", "/personagens");
    expect(screen.getByRole("link", { name: /^Séries/ })).toHaveAttribute("href", "/series");
  });

  it("lista estudos recentes publicados", async () => {
    render(await HomePage());
    const heading = screen.getByRole("heading", { name: "Estudos recentes" });
    expect(heading).toBeInTheDocument();
    // Ao menos um card de estudo deve aparecer.
    expect(screen.getAllByText(/ler estudo completo/i).length).toBeGreaterThan(0);
  });
});
