import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { bookRepository } from "@/lib/repositories";

export const metadata: Metadata = {
  title: "Bíblia",
};

export default async function BibliaPage() {
  const books = await bookRepository.listAll();
  const antigoTestamento = books.filter((b) => b.testamento === "AT");
  const novoTestamento = books.filter((b) => b.testamento === "NT");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Bíblia" }]} />
      <h1 className="mt-2 font-serif text-2xl font-bold text-stone-900">Navegar pela Bíblia</h1>
      <p className="mt-1 text-sm text-stone-500">
        Escolha um livro para ver seus capítulos e os estudos relacionados.
      </p>

      <BookSection title="Antigo Testamento" books={antigoTestamento} />
      <BookSection title="Novo Testamento" books={novoTestamento} />
    </div>
  );
}

function BookSection({
  title,
  books,
}: {
  title: string;
  books: Awaited<ReturnType<typeof bookRepository.listAll>>;
}) {
  return (
    <section className="mt-8">
      <h2 className="font-serif text-lg font-semibold text-stone-900">{title}</h2>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {books.map((book) => (
          <Link
            key={book.id}
            href={`/biblia/${book.slug}`}
            className="rounded-md border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 shadow-sm hover:border-amber-600 hover:text-amber-700"
          >
            {book.nome}
          </Link>
        ))}
      </div>
    </section>
  );
}
