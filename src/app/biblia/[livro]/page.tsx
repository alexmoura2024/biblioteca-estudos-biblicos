import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CollectionHero } from "@/components/CollectionHero";
import { EmptyState } from "@/components/EmptyState";
import { StudyCard } from "@/components/StudyCard";
import { bookRepository, studyRepository } from "@/lib/repositories";

interface BookPageProps {
  params: Promise<{ livro: string }>;
}

export async function generateStaticParams() {
  const books = await bookRepository.listAll();
  return books.map((book) => ({ livro: book.slug }));
}

export async function generateMetadata({
  params,
}: BookPageProps): Promise<Metadata> {
  const { livro } = await params;
  const book = await bookRepository.getBySlug(livro);
  return { title: book ? book.nome : "Livro não encontrado" };
}

export default async function BookPage({ params }: BookPageProps) {
  const { livro } = await params;
  const book = await bookRepository.getBySlug(livro);

  if (!book) notFound();

  const [studies, chapterStudyCounts] = await Promise.all([
    studyRepository.listByBookSlug(book.slug),
    studyRepository.countPublishedByBookChapter(book.slug),
  ]);

  const capitulos = Array.from(
    { length: book.totalCapitulos },
    (_, i) => i + 1,
  );

  const chaptersWithStudies = Object.values(chapterStudyCounts).filter(
    (count) => count > 0,
  ).length;

  return (
    <div className="min-h-screen bg-[#fcfbf8]">
      <CollectionHero
        eyebrow={book.testamento === "AT" ? "Antigo Testamento" : "Novo Testamento"}
        title={book.nome}
        description="Percorra os capítulos do livro e encontre as mensagens e estudos já catalogados no acervo."
        meta={
          <>
            <span>Abreviação: {book.abreviacao}</span>
            <span aria-hidden="true">·</span>
            <span>{book.totalCapitulos} capítulos</span>
            <span aria-hidden="true">·</span>
            <span className="font-semibold text-amber-800">
              {studies.length} {studies.length === 1 ? "estudo" : "estudos"}
            </span>
          </>
        }
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: "Início", href: "/" },
              { label: "Bíblia", href: "/biblia" },
              { label: book.nome },
            ]}
          />
        }
      />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
                Navegação por capítulo
              </p>
              <h2 className="mt-1 font-serif text-2xl font-semibold text-stone-950">
                Capítulos
              </h2>
              <p className="mt-2 text-sm text-stone-500">
                {chaptersWithStudies} de {book.totalCapitulos} capítulos com
                estudos no acervo
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-stone-500">
              <span
                aria-hidden="true"
                className="h-3 w-3 rounded-sm border border-amber-300 bg-amber-100"
              />
              <span>Com estudos publicados</span>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12">
            {capitulos.map((capitulo) => {
              const count = chapterStudyCounts[capitulo] ?? 0;
              const hasStudies = count > 0;

              const accessibleLabel = hasStudies
                ? `Capítulo ${capitulo}, ${count} ${
                    count === 1 ? "estudo" : "estudos"
                  }`
                : `Capítulo ${capitulo}, nenhum estudo`;

              return (
                <Link
                  key={capitulo}
                  href={`/biblia/${book.slug}/${capitulo}`}
                  aria-label={accessibleLabel}
                  data-has-studies={hasStudies ? "true" : "false"}
                  data-study-count={count}
                  className={`group flex min-h-16 flex-col items-center justify-center rounded-lg border px-2 py-2 text-center transition ${
                    hasStudies
                      ? "border-amber-300 bg-amber-50 text-amber-950 shadow-sm hover:-translate-y-0.5 hover:border-amber-500 hover:bg-amber-100"
                      : "border-stone-200 bg-stone-50/60 text-stone-500 hover:border-stone-400 hover:bg-white hover:text-stone-700"
                  }`}
                >
                  <span
                    className={`text-base font-semibold ${
                      hasStudies ? "text-amber-900" : "text-stone-600"
                    }`}
                  >
                    {capitulo}
                  </span>

                  {hasStudies && (
                    <span className="mt-0.5 text-[10px] font-medium leading-3 text-amber-800">
                      {count} {count === 1 ? "estudo" : "estudos"}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </section>

        <section className="mt-12">
          <div className="flex items-end justify-between border-b border-stone-200 pb-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
                Acervo
              </p>
              <h2 className="mt-1 font-serif text-2xl font-semibold text-stone-950">
                Estudos sobre {book.nome}
              </h2>
            </div>

            {studies.length > 0 && (
              <span className="text-sm text-stone-500">
                {studies.length} {studies.length === 1 ? "resultado" : "resultados"}
              </span>
            )}
          </div>

          {studies.length > 0 ? (
            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {studies.map((study) => (
                <StudyCard key={study.id} study={study} />
              ))}
            </div>
          ) : (
            <div className="mt-6">
              <EmptyState
                title="Nenhum estudo publicado sobre este livro ainda"
                description="Volte em breve — o acervo está em expansão."
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
