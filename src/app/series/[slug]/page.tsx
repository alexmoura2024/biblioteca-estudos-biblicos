import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CollectionHero } from "@/components/CollectionHero";
import { EmptyState } from "@/components/EmptyState";
import { seriesRepository, studyRepository } from "@/lib/repositories";
import type { StudySummary } from "@/lib/types";

interface SeriesPageProps {
  params: Promise<{ slug: string }>;
}

const KINGS_SERIES_SLUG = "os-40-reis-de-israel-e-juda";

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

function KingStudyCard({
  study,
  position,
  kingdom,
}: {
  study: StudySummary;
  position: number;
  kingdom: "north" | "south";
}) {
  const numberClass =
    kingdom === "north"
      ? "bg-violet-50 text-violet-800"
      : "bg-amber-50 text-amber-900";

  return (
    <li>
      <Link
        href={`/estudo/${study.slug}`}
        className="group grid grid-cols-[2.75rem_1fr_auto] items-center gap-3 rounded-xl border border-stone-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-sm"
      >
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-full font-serif text-sm font-semibold ${numberClass}`}
          aria-hidden="true"
        >
          {String(position).padStart(2, "0")}
        </span>

        <div className="min-w-0">
          {study.referenciaPrincipal && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-800">
              {study.referenciaPrincipal.referenciaNormalizada}
            </p>
          )}
          <h3 className="mt-1 font-serif text-base font-semibold leading-5 text-stone-950 transition group-hover:text-amber-800">
            {study.titulo}
          </h3>
        </div>

        <span className="text-sm font-semibold text-stone-400 transition group-hover:translate-x-0.5 group-hover:text-amber-800">
          →
        </span>
      </Link>
    </li>
  );
}

function KingsSeriesView({ studies }: { studies: StudySummary[] }) {
  const north = studies.slice(0, 20);
  const south = studies.slice(20, 40);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="grid gap-3 text-center sm:grid-cols-[1fr_auto_1fr] sm:items-center">
          <div className="rounded-xl bg-violet-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-800">
              Reino do Norte
            </p>
            <p className="mt-1 font-serif text-xl font-semibold text-stone-950">
              Israel
            </p>
            <p className="mt-1 text-sm text-stone-600">
              Jeroboão I → Oséias · {north.length} governantes
            </p>
          </div>

          <div className="hidden px-2 text-center sm:block">
            <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
              Reino Unido
            </span>
            <span className="mt-1 block font-serif text-lg font-semibold text-stone-700">
              divisão
            </span>
            <span className="mt-1 block text-2xl text-stone-300" aria-hidden="true">
              ↙ ↘
            </span>
          </div>

          <div className="rounded-xl bg-amber-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-900">
              Reino do Sul
            </p>
            <p className="mt-1 font-serif text-xl font-semibold text-stone-950">
              Judá
            </p>
            <p className="mt-1 text-sm text-stone-600">
              Roboão → Zedequias · {south.length} governantes
            </p>
          </div>
        </div>

        <p className="mx-auto mt-5 max-w-3xl text-center text-sm leading-6 text-stone-600">
          Acompanhe os dois reinos depois da divisão. Cada nome abre a biografia
          correspondente, permitindo comparar decisões, reformas, crises,
          profetas, consequências e o legado espiritual de cada governo.
        </p>
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-2 lg:gap-6">
        <section aria-labelledby="reino-norte">
          <div className="rounded-t-2xl border border-b-0 border-stone-200 bg-violet-50 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-violet-800">
              Linha 1 · 20 estudos
            </p>
            <h2 id="reino-norte" className="mt-1 font-serif text-2xl font-semibold text-stone-950">
              Reino do Norte — Israel
            </h2>
            <p className="mt-1 text-sm leading-6 text-stone-600">
              De Jeroboão I à queda de Samaria no reinado de Oséias.
            </p>
          </div>

          <ol className="space-y-3 rounded-b-2xl border border-stone-200 bg-[#fcfbf8] p-3 sm:p-4">
            {north.map((study, index) => (
              <KingStudyCard key={study.id} study={study} position={index + 1} kingdom="north" />
            ))}
          </ol>
        </section>

        <section aria-labelledby="reino-sul">
          <div className="rounded-t-2xl border border-b-0 border-stone-200 bg-amber-50 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-amber-900">
              Linha 2 · 20 estudos
            </p>
            <h2 id="reino-sul" className="mt-1 font-serif text-2xl font-semibold text-stone-950">
              Reino do Sul — Judá
            </h2>
            <p className="mt-1 text-sm leading-6 text-stone-600">
              De Roboão à queda de Jerusalém no reinado de Zedequias.
            </p>
          </div>

          <ol className="space-y-3 rounded-b-2xl border border-stone-200 bg-[#fcfbf8] p-3 sm:p-4">
            {south.map((study, index) => (
              <KingStudyCard key={study.id} study={study} position={index + 1} kingdom="south" />
            ))}
          </ol>
        </section>
      </div>

      <section className="mt-8 rounded-2xl border border-stone-200 bg-stone-950 px-5 py-7 text-stone-100 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-300">
          Visão da coleção
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 font-serif text-lg font-semibold">
          <span>Reino Unido</span>
          <span className="text-stone-500" aria-hidden="true">→</span>
          <span>Divisão</span>
          <span className="text-stone-500" aria-hidden="true">→</span>
          <span>Israel + Judá</span>
          <span className="text-stone-500" aria-hidden="true">→</span>
          <span>Cativeiros</span>
        </div>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-stone-300">
          Esta série começa depois de Salomão. O percurso anterior — Saul, Davi e
          Salomão — será tratado separadamente como a etapa do Reino Unido.
        </p>
      </section>
    </div>
  );
}

export default async function SeriesDetailPage({ params }: SeriesPageProps) {
  const { slug } = await params;
  const series = await seriesRepository.getBySlug(slug);

  if (!series) notFound();

  const studies = await studyRepository.listBySeriesSlug(series.slug);
  const isKingsSeries = series.slug === KINGS_SERIES_SLUG;

  return (
    <div className="min-h-screen bg-[#fcfbf8]">
      <CollectionHero
        eyebrow={isKingsSeries ? "Coleção histórica" : "Série de estudos"}
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

      {isKingsSeries ? (
        <KingsSeriesView studies={studies} />
      ) : (
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
                  const ordem = study.series.find((s) => s.series.id === series.id)?.ordem ?? index + 1;

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
      )}
    </div>
  );
}
