import {
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Header } from "@/components/Header";

describe("Header", () => {
  it("renderiza a marca, a navegação principal e os acessos principais", () => {
    render(<Header />);

    expect(
      screen.getByRole("link", {
        name: "Página inicial da Biblioteca Virtual de Estudos Bíblicos",
      }),
    ).toHaveAttribute("href", "/");

    expect(
      screen.getByRole("navigation", { name: "Navegação principal" }),
    ).toBeInTheDocument();

    expect(screen.getByRole("link", { name: "Bíblia" })).toHaveAttribute(
      "href",
      "/biblia",
    );

    expect(
      screen.getByRole("link", { name: "Minha biblioteca" }),
    ).toHaveAttribute("href", "/minha-biblioteca");
  });

  it("abre e fecha o menu móvel", () => {
    render(<Header />);

    const openButton = screen.getByRole("button", { name: "Abrir menu" });
    fireEvent.click(openButton);

    const mobileNav = screen.getByRole("navigation", {
      name: "Navegação móvel",
    });

    expect(mobileNav).toBeInTheDocument();
    expect(
      within(mobileNav).getByRole("link", { name: /^Temas/ }),
    ).toHaveAttribute("href", "/temas");

    expect(document.getElementById("mobile-header-search")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Fechar menu" }));

    expect(
      screen.queryByRole("navigation", { name: "Navegação móvel" }),
    ).not.toBeInTheDocument();
  });
});
