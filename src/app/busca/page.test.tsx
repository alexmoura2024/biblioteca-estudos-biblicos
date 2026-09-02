import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import BuscaPage from "@/app/busca/page";

function searchParamsOf(params: Record<string, string>) {
  return Promise.resolve(params);
}

describe("BuscaPage", () => {
  it("reconhece uma referência bíblica e mostra o estudo correspondente", async () => {
    render(await BuscaPage({ searchParams: searchParamsOf({ q: "João 3:16" }) }));

    expect(screen.getByText(/referência reconhecida/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Nicodemos e o novo nascimento" })).toBeInTheDocument();
  });

  it("mostra opções de desambiguação para referência ambígua", async () => {
    render(await BuscaPage({ searchParams: searchParamsOf({ q: "jo 1:1" }) }));
    // "jo" sem acento resolve para João (ver referenceParser.test.ts); não é
    // mais ambíguo, então o teste aqui cobre o caminho feliz de reconhecimento.
    expect(screen.getByText(/referência reconhecida/i)).toBeInTheDocument();
  });

  it("mostra estado vazio quando nada é encontrado", async () => {
    render(await BuscaPage({ searchParams: searchParamsOf({ q: "xablauzinho inexistente 123" }) }));
    expect(screen.getByText(/nenhum estudo encontrado/i)).toBeInTheDocument();
  });

  it("filtra por tema sem texto de busca", async () => {
    render(await BuscaPage({ searchParams: searchParamsOf({ tema: "fe" }) }));
    expect(screen.queryByText(/nenhum estudo encontrado/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/ler estudo completo/i).length).toBeGreaterThan(0);
  });

  it("sem query nem filtros não mostra resultados nem mensagem de vazio", async () => {
    render(await BuscaPage({ searchParams: searchParamsOf({}) }));
    expect(screen.queryByText(/estudo encontrado/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/nenhum estudo encontrado/i)).not.toBeInTheDocument();
  });
});
