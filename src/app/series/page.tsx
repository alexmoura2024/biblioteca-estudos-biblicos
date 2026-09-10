import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CollectionHero } from "@/components/CollectionHero";
import { seriesRepository } from "@/lib/repositories";

export const metadata: Metadata = {
  title: "Séries",
};

export default async function SeriesListPage() {
  const [seriesList, counts] = await Promise.all([
    seriesRepository.listAll(),
    seriesRepository.countPublishedStudies(),
  ]);

  const totalVinculos = Object.values(counts).reduce(
    (sum, count) => sum + count,
    0,
  );

  return (
    <div className="min-h-screen bg-[#fcfbf8]">
      <CollectionHero
        eyebrow="Percursos de estudo"
        title="Séries"
        description="Acompanhe estudos organizados em sequência para percorrer um assunto de forma contínua e ordenada."
        meta={
          <>
            <span className="font-semibold text-stone-700">
              {seriesList.length} séries catalogadas
            </span>
            <span aria-hidden="true">·</span>
            <span>{totalVinculos} estudos vinculados</span>
          </>
        }
        breadcrumbs={
          <Breadcrumbs
            items={[{ label: "Início", href: "/" }, { label: "Séries" }]}
          />
        }
      />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {seriesList.map((series, index) => {
            const total = counts[series.id] ?? 0;

            return (
              <Link
                key={series.id}
                href={`/series/${series.slug}`}
                className="group relative overflow-hidden rounded-xl border border-stone-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md"
              >
                <div
                  aria-hidden="true"
                  className="absolute right-4 top-3 font-serif text-5xl font-semibold leading-none text-stone-100"
                >
                  {String(index + 1).padStart(2, "0")}
                </div>

                <div className="relative flex min-h-40 flex-col">
                  <span className="w-fit rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-800">
                    {total} {total === 1 ? "estudo" : "estudos"}
                  </span>

                  <h2 className="mt-6 max-w-[85%] font-serif text-xl font-semibold text-stone-950 group-hover:text-amber-800">
                    {series.nome}
                  </h2>

                  {series.descricao && (
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-500">
                      {series.descricao}
                    </p>
                  )}

                  <span className="mt-auto pt-4 text-sm font-semibold text-amber-800">
                    Abrir série →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
