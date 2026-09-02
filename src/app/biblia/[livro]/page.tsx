import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { StudyCard } from "@/components/StudyCard";
import { EmptyState } from "@/components/EmptyState";
import { bookRepository, studyRepository } from "@/lib/repositories";

interface BookPageProps {
  params: Promise<{ livro: string }>;
}

export async function generateStaticParams() {
  const books = await bookRepository.listAll();
  return books.map((book) => ({ livro: book.slug }));
}

export async function generateMetadata({ params }: BookPageProps): Promise<Metadata> {
  const { livro } = await params;
  const book = await bookRepository.getBySlug(livro);
  return { title: book ? book.nome : "Livro não encontrado" };
}

export default async function BookPage({ params }: BookPageProps) {
  const { livro } = await params;
  const book = await bookRepository.getBySlug(livro);
  if (!book) notFound();

  const studies = await studyRepository.listByBookSlug(book.slug);
  const capitulos = Array.from({ length: book.totalCapitulos }, (_, i) => i + 1);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Breadcrumbs
        items={[{ label: "Início", href: "/" }, { label: "Bíblia", href: "/biblia" }, { label: book.nome }]}
      />
      <h1 className="mt-2 font-serif text-2xl font-bold text-stone-900">{book.nome}</h1>
      <p className="mt-1 text-sm text-stone-500">
        {book.testamento === "AT" ? "Antigo Testamento" : "Novo Testamento"} · Abreviação:{" "}
        {book.abreviacao} · {book.totalCapitulos} capítulos
      </p>

      <section className="mt-6">
        <h2 className="text-sm font-medium text-stone-700">Capítulos</h2>
        <div className="mt-2 grid grid-cols-6 gap-1.5 sm:grid-cols-10 md:grid-cols-12">
          {capitulos.map((capitulo) => (
            <Link
              key={capitulo}
              href={`/biblia/${book.slug}/${capitulo}`}
              className="flex h-9 items-center justify-center rounded-md border border-stone-200 bg-white text-sm text-stone-700 hover:border-amber-600 hover:text-amber-700"
            >
              {capitulo}
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-lg font-semibold text-stone-900">
          Estudos sobre {book.nome}
        </h2>
        {studies.length > 0 ? (
          <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {studies.map((study) => (
              <StudyCard key={study.id} study={study} />
            ))}
          </div>
        ) : (
          <div className="mt-4">
            <EmptyState
              title="Nenhum estudo publicado sobre este livro ainda"
              description="Volte em breve — o acervo está em expansão."
            />
          </div>
        )}
      </section>
    </div>
  );
}
