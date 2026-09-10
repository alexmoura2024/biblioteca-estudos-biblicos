import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import BibliaPage from "@/app/biblia/page";
import BookPage from "@/app/biblia/[livro]/page";
import ChapterPage from "@/app/biblia/[livro]/[capitulo]/page";

describe("BibliaPage", () => {
  it("lista o Antigo e o Novo Testamento com link para cada livro", async () => {
    render(await BibliaPage());
    expect(screen.getByRole("heading", { name: "Antigo Testamento" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Novo Testamento" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "João" })).toHaveAttribute("href", "/biblia/joao");
  });
});

describe("BookPage", () => {
  it("mostra todos os capítulos e os estudos vinculados ao livro", async () => {
    render(await BookPage({ params: Promise.resolve({ livro: "joao" }) }));
    expect(screen.getByRole("heading", { name: "João", level: 1 })).toBeInTheDocument();
    const chapterWithStudies = screen.getByRole("link", {
      name: /cap\u00edtulo 3, \d+ estudos?/i,
    });
    expect(chapterWithStudies).toHaveAttribute("href", "/biblia/joao/3");
    expect(chapterWithStudies).toHaveAttribute("data-has-studies", "true");

    const emptyChapter = screen.getByRole("link", {
      name: /cap\u00edtulo 5, nenhum estudo/i,
    });
    expect(emptyChapter).toHaveAttribute("data-has-studies", "false");
    expect(screen.getByRole("heading", { name: /nicodemos/i })).toBeInTheDocument();
  });

  it("chama notFound() para um livro inexistente", async () => {
    await expect(
      BookPage({ params: Promise.resolve({ livro: "nao-existe" }) }),
    ).rejects.toThrow();
  });
});

describe("ChapterPage", () => {
  it("mostra os estudos de um capítulo específico", async () => {
    render(
      await ChapterPage({ params: Promise.resolve({ livro: "joao", capitulo: "3" }) }),
    );
    expect(screen.getByRole("heading", { name: "João 3", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /nicodemos/i })).toBeInTheDocument();
  });

  it("mostra estado vazio para um capítulo sem estudos", async () => {
    render(
      await ChapterPage({ params: Promise.resolve({ livro: "joao", capitulo: "5" }) }),
    );
    expect(screen.getByText(/nenhum estudo publicado sobre este capítulo/i)).toBeInTheDocument();
  });

  it("chama notFound() para capítulo fora do intervalo do livro", async () => {
    await expect(
      ChapterPage({ params: Promise.resolve({ livro: "joao", capitulo: "999" }) }),
    ).rejects.toThrow();
  });
});
