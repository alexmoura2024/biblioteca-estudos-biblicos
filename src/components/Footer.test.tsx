import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Footer } from "@/components/Footer";

describe("Footer", () => {
  it("renderiza os principais caminhos do acervo", () => {
    render(<Footer />);

    expect(
      screen.getByRole("navigation", { name: "Navegação do rodapé" }),
    ).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /^Bíblia/ })).toHaveAttribute(
      "href",
      "/biblia",
    );

    expect(
      screen.getByRole("link", { name: /^Minha biblioteca/ }),
    ).toHaveAttribute("href", "/minha-biblioteca");

    expect(
      screen.getByRole("link", { name: "Área administrativa" }),
    ).toHaveAttribute("href", "/admin");
  });
});
