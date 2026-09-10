import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { HomePersonalShelf } from "@/components/HomePersonalShelf";
import { recordStudyHistory } from "@/lib/client/studyLibrary";

describe("HomePersonalShelf", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("nao ocupa espaco quando nao ha historico nem favoritos", async () => {
    const { container } = render(<HomePersonalShelf />);

    await waitFor(() => {
      expect(container).toBeEmptyDOMElement();
    });
  });

  it("mostra os estudos recentes do historico local", async () => {
    recordStudyHistory({
      slug: "estudo-teste",
      title: "Estudo de teste",
      summary: "Resumo",
      reference: "Jo\u00e3o 3",
    });

    render(<HomePersonalShelf />);

    expect(
      await screen.findByRole("heading", { name: /continue de onde parou/i }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: /estudo de teste/i }),
    ).toHaveAttribute("href", "/estudo/estudo-teste");
  });
});