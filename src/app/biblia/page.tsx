import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CollectionHero } from "@/components/CollectionHero";
import { bookRepository, studyRepository } from "@/lib/repositories";

export const metadata: Metadata = {
  title: "Bíblia",
};

export default async function BibliaPage() {
  const [books, studyCounts] = await Promise.all([
    bookRepository.listAll(),
    studyRepository.countPublishedByBook(),
  ]);
  const antigoTestamento = books.filter((b) => b.testamento === "AT");
  const novoTestamento = books.filter((b) => b.testamento === "NT");

  return (
    <div className="min-h-screen bg-[#fcfbf8]">
      <CollectionHero
        eyebrow="Navegação bíblica"
        title="Navegar pela Bíblia"
        description="Escolha um livro para percorrer seus capítulos e encontrar as mensagens e estudos vinculados a cada passagem."
        meta={
          <>
            <span className="font-semibold text-stone-700">
              {books.length} livros
            </span>
            <span aria-hidden="true">·</span>
            <span>{antigoTestamento.length} no Antigo Testamento</span>
            <span aria-hidden="true">·</span>
            <span>{novoTestamento.length} no Novo Testamento</span>
          </>
        }
        breadcrumbs={
          <Breadcrumbs
            items={[{ label: "Início", href: "/" }, { label: "Bíblia" }]}
          />
        }
      />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <BookSection
          title="Antigo Testamento"
          subtitle={`${antigoTestamento.length} livros`}
          books={antigoTestamento}
          studyCounts={studyCounts}
          numberStart={1}
        />

        <BookSection
          title="Novo Testamento"
          subtitle={`${novoTestamento.length} livros`}
          books={novoTestamento}
          studyCounts={studyCounts}
          numberStart={antigoTestamento.length + 1}
        />
      </div>
    </div>
  );
}

function BookSection({
  title,
  subtitle,
  books,
  studyCounts,
  numberStart,
}: {
  title: string;
  subtitle: string;
  books: Awaited<ReturnType<typeof bookRepository.listAll>>;
  studyCounts: Record<string, number>;
  numberStart: number;
}) {
  return (
    <section className="mb-12 last:mb-0">
      <div className="flex items-end justify-between border-b border-stone-200 pb-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
            Testamento
          </p>
          <h2 className="mt-1 font-serif text-2xl font-semibold text-stone-950">
            {title}
          </h2>
        </div>

        <span className="text-sm text-stone-500">{subtitle}</span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {books.map((book, index) => (
          <Link
            key={book.id}
            href={`/biblia/${book.slug}`}
            aria-label={book.nome}
            className="group flex min-h-28 flex-col justify-between rounded-xl border border-stone-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-sm"
          >
            <span className="text-xs font-medium tabular-nums text-stone-300">
              {String(numberStart + index).padStart(2, "0")}
            </span>

            <span>
              <span className="block font-serif text-base font-semibold text-stone-950 group-hover:text-amber-800">
                {book.nome}
              </span>
              <span className="mt-1 flex items-center justify-between gap-2 text-xs text-stone-500">
                {book.totalCapitulos} capítulos{" · "}
                {studyCounts[book.slug] ?? 0}{" "}
                {(studyCounts[book.slug] ?? 0) === 1 ? "estudo" : "estudos"}
                <span
                  aria-hidden="true"
                  className="text-amber-700 transition-transform group-hover:translate-x-1"
                >
                  →
                </span>
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
