import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { StudyCard } from "@/components/StudyCard";
import { EmptyState } from "@/components/EmptyState";
import { bookRepository, studyRepository } from "@/lib/repositories";

interface ChapterPageProps {
  params: Promise<{ livro: string; capitulo: string }>;
}

export async function generateMetadata({ params }: ChapterPageProps): Promise<Metadata> {
  const { livro, capitulo } = await params;
  const book = await bookRepository.getBySlug(livro);
  return { title: book ? `${book.nome} ${capitulo}` : "Capítulo não encontrado" };
}

export default async function ChapterPage({ params }: ChapterPageProps) {
  const { livro, capitulo: capituloParam } = await params;
  const book = await bookRepository.getBySlug(livro);
  if (!book) notFound();

  const capitulo = Number(capituloParam);
  if (!Number.isInteger(capitulo) || capitulo < 1 || capitulo > book.totalCapitulos) {
    notFound();
  }

  const studies = await studyRepository.listByBookSlug(book.slug, capitulo);

  const temAnterior = capitulo > 1;
  const temProximo = capitulo < book.totalCapitulos;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Breadcrumbs
        items={[
          { label: "Início", href: "/" },
          { label: "Bíblia", href: "/biblia" },
          { label: book.nome, href: `/biblia/${book.slug}` },
          { label: `Capítulo ${capitulo}` },
        ]}
      />

      <div className="mt-2 flex items-center justify-between gap-4">
        <h1 className="font-serif text-2xl font-bold text-stone-900">
          {book.nome} {capitulo}
        </h1>
        <div className="flex gap-2 text-sm">
          {temAnterior ? (
            <Link
              href={`/biblia/${book.slug}/${capitulo - 1}`}
              className="rounded-md border border-stone-300 px-3 py-1.5 hover:border-amber-600 hover:text-amber-700"
            >
              ← Anterior
            </Link>
          ) : (
            <span className="rounded-md border border-stone-200 px-3 py-1.5 text-stone-300">← Anterior</span>
          )}
          {temProximo ? (
            <Link
              href={`/biblia/${book.slug}/${capitulo + 1}`}
              className="rounded-md border border-stone-300 px-3 py-1.5 hover:border-amber-600 hover:text-amber-700"
            >
              Próximo →
            </Link>
          ) : (
            <span className="rounded-md border border-stone-200 px-3 py-1.5 text-stone-300">Próximo →</span>
          )}
        </div>
      </div>

      <section className="mt-8">
        <h2 className="font-serif text-lg font-semibold text-stone-900">
          Estudos sobre {book.nome} {capitulo}
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
              title="Nenhum estudo publicado sobre este capítulo ainda"
              description="Este capítulo ainda não possui estudos vinculados no acervo."
              action={
                <Link href={`/biblia/${book.slug}`} className="text-sm font-medium text-amber-700 hover:underline">
                  Ver todos os estudos de {book.nome}
                </Link>
              }
            />
          </div>
        )}
      </section>
    </div>
  );
}
