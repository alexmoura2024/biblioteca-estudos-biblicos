import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { EmptyState } from "@/components/EmptyState";
import { seriesRepository, studyRepository } from "@/lib/repositories";

interface SeriesPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const seriesList = await seriesRepository.listAll();
  return seriesList.map((series) => ({ slug: series.slug }));
}

export async function generateMetadata({ params }: SeriesPageProps): Promise<Metadata> {
  const { slug } = await params;
  const series = await seriesRepository.getBySlug(slug);
  return { title: series ? series.nome : "Série não encontrada" };
}

export default async function SeriesDetailPage({ params }: SeriesPageProps) {
  const { slug } = await params;
  const series = await seriesRepository.getBySlug(slug);
  if (!series) notFound();

  const studies = await studyRepository.listBySeriesSlug(series.slug);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Breadcrumbs
        items={[{ label: "Início", href: "/" }, { label: "Séries", href: "/series" }, { label: series.nome }]}
      />
      <h1 className="mt-2 font-serif text-2xl font-bold text-stone-900">{series.nome}</h1>
      <p className="mt-1 text-sm text-stone-500">{series.descricao}</p>

      <section className="mt-8">
        {studies.length > 0 ? (
          <ol className="flex flex-col gap-3">
            {studies.map((study, index) => {
              const ordem = study.series.find((s) => s.series.id === series.id)?.ordem ?? index + 1;
              return (
                <li
                  key={study.id}
                  className="flex gap-4 rounded-lg border border-stone-200 bg-white p-4 shadow-sm"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-semibold text-violet-800">
                    {ordem}
                  </span>
                  <div>
                    <Link
                      href={`/estudo/${study.slug}`}
                      className="font-serif font-semibold text-stone-900 hover:text-amber-700"
                    >
                      {study.titulo}
                    </Link>
                    <p className="mt-1 text-sm text-stone-500">{study.resumo}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <EmptyState
            title="Nenhum estudo publicado nesta série ainda"
            description="Volte em breve — o acervo está em expansão."
          />
        )}
      </section>
    </div>
  );
}
