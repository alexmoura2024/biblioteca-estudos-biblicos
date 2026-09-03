import { describe, expect, it, vi } from "vitest";
import { createMockSupabaseClient } from "@/lib/repositories/supabase/testUtils";

const getSupabaseClientMock = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  getSupabaseClient: () => getSupabaseClientMock(),
}));

const { SupabaseBookRepository } = await import("@/lib/repositories/supabase/books");

const BOOK_ROW = {
  id: "11111111-1111-1111-1111-111111111111",
  nome: "João",
  abreviacao: "Jo",
  slug: "joao",
  testamento: "NT",
  ordem_canonica: 43,
  total_capitulos: 21,
};

describe("SupabaseBookRepository", () => {
  it("listAll mapeia as linhas do Postgres (snake_case) para Book (camelCase)", async () => {
    getSupabaseClientMock.mockReturnValue(
      createMockSupabaseClient({ tables: { books: { data: [BOOK_ROW], error: null } } }),
    );

    const books = await new SupabaseBookRepository().listAll();

    expect(books).toEqual([
      {
        id: "11111111-1111-1111-1111-111111111111",
        nome: "João",
        abreviacao: "Jo",
        slug: "joao",
        testamento: "NT",
        ordemCanonica: 43,
        totalCapitulos: 21,
      },
    ]);
  });

  it("getBySlug devolve undefined quando o Postgres não encontra a linha (data: null)", async () => {
    getSupabaseClientMock.mockReturnValue(
      createMockSupabaseClient({ tables: { books: { data: null, error: null } } }),
    );

    const book = await new SupabaseBookRepository().getBySlug("nao-existe");
    expect(book).toBeUndefined();
  });

  it("getBySlug mapeia a linha quando encontrada", async () => {
    getSupabaseClientMock.mockReturnValue(
      createMockSupabaseClient({ tables: { books: { data: BOOK_ROW, error: null } } }),
    );

    const book = await new SupabaseBookRepository().getBySlug("joao");
    expect(book?.nome).toBe("João");
    expect(book?.totalCapitulos).toBe(21);
  });

  it("propaga o erro do Postgres em vez de engolir silenciosamente", async () => {
    getSupabaseClientMock.mockReturnValue(
      createMockSupabaseClient({ tables: { books: { data: null, error: { message: "conexão recusada" } } } }),
    );

    await expect(new SupabaseBookRepository().listAll()).rejects.toThrow(/conexão recusada/);
  });
});
