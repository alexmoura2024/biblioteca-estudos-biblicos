import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CronologiaPage from "./page";

describe("CronologiaPage", () => {
  it("renderiza a cronologia incorporada e a alternativa em tela cheia", () => {
    render(<CronologiaPage />);

    expect(
      screen.getByRole("heading", { name: "Cronologia Bíblica" }),
    ).toBeInTheDocument();

    expect(screen.getByTitle("Cronologia Bíblica")).toHaveAttribute(
      "src",
      "https://biblia-time-flow.base44.app",
    );

    expect(
      screen.getByRole("link", { name: /abrir em tela cheia/i }),
    ).toHaveAttribute("href", "https://biblia-time-flow.base44.app");
  });
});
