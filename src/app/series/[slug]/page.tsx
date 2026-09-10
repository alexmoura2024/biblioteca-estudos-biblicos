import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CollectionHero } from "@/components/CollectionHero";
import { EmptyState } from "@/components/EmptyState";
import { seriesRepository, studyRepository } from "@/lib/repositories";

interface SeriesPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const seriesList = await seriesRepository.listAll();
  return seriesList.map((series) => ({ slug: series.slug }));
}

export async function generateMetadata({
  params,
}: SeriesPageProps): Promise<Metadata> {
  const { slug } = await params;
  const series = await seriesRepository.getBySlug(slug);
  return { title: series ? series.nome : "Série não encontrada" };
}

export default async function SeriesDetailPage({
  params,
}: SeriesPageProps) {
  const { slug } = await params;
  const series = await seriesRepository.getBySlug(slug);

  if (!series) notFound();

  const studies = await studyRepository.listBySeriesSlug(series.slug);

  return (
    <div className="min-h-screen bg-[#fcfbf8]">
      <CollectionHero
        eyebrow="Série de estudos"
        title={series.nome}
        description={series.descricao}
        meta={
          <span className="font-semibold text-amber-800">
            {studies.length} {studies.length === 1 ? "estudo na sequência" : "estudos na sequência"}
          </span>
        }
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: "Início", href: "/" },
              { label: "Séries", href: "/series" },
              { label: series.nome },
            ]}
          />
        }
      />

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <section>
          <div className="border-b border-stone-200 pb-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
              Ordem de leitura
            </p>
            <h2 className="mt-1 font-serif text-2xl font-semibold text-stone-950">
              Percurso da série
            </h2>
          </div>

          {studies.length > 0 ? (
            <ol className="mt-6 space-y-4">
              {studies.map((study, index) => {
                const ordem =
                  study.series.find((s) => s.series.id === series.id)?.ordem ??
                  index + 1;

                return (
                  <li
                    key={study.id}
                    className="group grid gap-4 rounded-xl border border-stone-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-sm sm:grid-cols-[3.5rem_1fr_auto] sm:items-center"
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-50 font-serif text-lg font-semibold text-violet-800">
                      {ordem}
                    </span>

                    <div>
                      {study.referenciaPrincipal && (
                        <p className="text-xs font-semibold uppercase tracking-[0.09em] text-amber-800">
                          {study.referenciaPrincipal.referenciaNormalizada}
                        </p>
                      )}

                      <Link
                        href={`/estudo/${study.slug}`}
                        className="mt-1 block font-serif text-lg font-semibold text-stone-950 group-hover:text-amber-800"
                      >
                        {study.titulo}
                      </Link>

                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-500">
                        {study.resumo}
                      </p>
                    </div>

                    <Link
                      href={`/estudo/${study.slug}`}
                      className="text-sm font-semibold text-amber-800 hover:underline"
                      aria-label={`Ler ${study.titulo}`}
                    >
                      Ler →
                    </Link>
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className="mt-6">
              <EmptyState
                title="Nenhum estudo publicado nesta série ainda"
                description="Volte em breve — o acervo está em expansão."
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
