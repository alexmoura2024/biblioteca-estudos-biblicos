import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BibleChapterReader } from "@/components/bible/BibleChapterReader";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CollectionHero } from "@/components/CollectionHero";
import { EmptyState } from "@/components/EmptyState";
import { StudyCard } from "@/components/StudyCard";
import { getPrivateAcfChapter } from "@/lib/bible/acf";
import { getOriginalWordsForChapter } from "@/lib/bible/original";
import {
  bookRepository,
  studyRepository,
} from "@/lib/repositories";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface ChapterPageProps {
  params: Promise<{
    livro: string;
    capitulo: string;
  }>;
}

export async function generateMetadata({
  params,
}: ChapterPageProps): Promise<Metadata> {
  const { livro, capitulo } = await params;
  const book = await bookRepository.getBySlug(livro);

  return {
    title: book
      ? `${book.nome} ${capitulo}`
      : "Capítulo não encontrado",
  };
}

export default async function ChapterPage({
  params,
}: ChapterPageProps) {
  const { livro, capitulo: capituloParam } =
    await params;
  const book =
    await bookRepository.getBySlug(livro);

  if (!book) notFound();

  const capitulo = Number(capituloParam);

  if (
    !Number.isInteger(capitulo) ||
    capitulo < 1 ||
    capitulo > book.totalCapitulos
  ) {
    notFound();
  }

  const [
    studies,
    bibleChapter,
    originalWords,
  ] = await Promise.all([
    studyRepository.listByBookSlug(
      book.slug,
      capitulo,
    ),
    getPrivateAcfChapter(book.id, capitulo),
    getOriginalWordsForChapter(
      book.id,
      capitulo,
    ),
  ]);

  const temAnterior = capitulo > 1;
  const temProximo =
    capitulo < book.totalCapitulos;

  const chapterActions = (
    <div className="flex gap-2 text-sm">
      {temAnterior ? (
        <Link
          href={`/biblia/${book.slug}/${capitulo - 1}`}
          className="rounded-md border border-stone-300 bg-white px-3 py-2 font-medium text-stone-700 transition hover:border-amber-400 hover:text-amber-800"
        >
          ← Anterior
        </Link>
      ) : (
        <span className="rounded-md border border-stone-200 bg-white/50 px-3 py-2 text-stone-300">
          ← Anterior
        </span>
      )}

      {temProximo ? (
        <Link
          href={`/biblia/${book.slug}/${capitulo + 1}`}
          className="rounded-md border border-stone-300 bg-white px-3 py-2 font-medium text-stone-700 transition hover:border-amber-400 hover:text-amber-800"
        >
          Próximo →
        </Link>
      ) : (
        <span className="rounded-md border border-stone-200 bg-white/50 px-3 py-2 text-stone-300">
          Próximo →
        </span>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fcfbf8]">
      <CollectionHero
        eyebrow={`${
          book.testamento === "AT"
            ? "Antigo Testamento"
            : "Novo Testamento"
        } · ${book.nome}`}
        title={`${book.nome} ${capitulo}`}
        description={
          bibleChapter
            ? "Leia o capítulo bíblico e percorra as mensagens e estudos vinculados a esta passagem."
            : "Mensagens e estudos vinculados a este capítulo."
        }
        meta={
          <div className="flex flex-wrap items-center gap-2">
            {bibleChapter && (
              <>
                <span className="font-semibold text-stone-700">
                  ACF
                </span>
                <span aria-hidden="true">
                  ·
                </span>
                <span>
                  {
                    bibleChapter.verses
                      .length
                  }{" "}
                  versículos
                </span>
                <span aria-hidden="true">
                  ·
                </span>
              </>
            )}

            {originalWords.length > 0 && (
              <>
                <span className="font-semibold text-violet-700">
                  Original
                </span>
                <span aria-hidden="true">
                  ·
                </span>
              </>
            )}

            <span className="font-semibold text-amber-800">
              {studies.length}{" "}
              {studies.length === 1
                ? "estudo publicado"
                : "estudos publicados"}
            </span>
          </div>
        }
        actions={chapterActions}
        breadcrumbs={
          <Breadcrumbs
            items={[
              {
                label: "Início",
                href: "/",
              },
              {
                label: "Bíblia",
                href: "/biblia",
              },
              {
                label: book.nome,
                href: `/biblia/${book.slug}`,
              },
              {
                label: `Capítulo ${capitulo}`,
              },
            ]}
          />
        }
      />

      <div className="mx-auto max-w-7xl space-y-12 px-4 py-10 sm:px-6 lg:px-8">
        {bibleChapter && (
          <BibleChapterReader
            bookName={book.nome}
            bookSlug={book.slug}
            chapter={capitulo}
            versionName={
              bibleChapter.versionName
            }
            privateUseOnly={
              bibleChapter.privateUseOnly
            }
            copyrightNotice={
              bibleChapter.copyrightNotice
            }
            verses={bibleChapter.verses}
            originalWords={originalWords}
          />
        )}

        <section>
          <div className="border-b border-stone-200 pb-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
              Acervo por capítulo
            </p>
            <h2 className="mt-1 font-serif text-2xl font-semibold text-stone-950">
              Estudos sobre {book.nome}{" "}
              {capitulo}
            </h2>
          </div>

          {studies.length > 0 ? (
            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {studies.map((study) => (
                <StudyCard
                  key={study.id}
                  study={study}
                />
              ))}
            </div>
          ) : (
            <div className="mt-6">
              <EmptyState
                title="Nenhum estudo publicado sobre este capítulo ainda"
                description="Este capítulo ainda não possui estudos vinculados no acervo."
                action={
                  <Link
                    href={`/biblia/${book.slug}`}
                    className="text-sm font-semibold text-amber-800 hover:underline"
                  >
                    Ver todos os estudos
                    de {book.nome}
                  </Link>
                }
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
