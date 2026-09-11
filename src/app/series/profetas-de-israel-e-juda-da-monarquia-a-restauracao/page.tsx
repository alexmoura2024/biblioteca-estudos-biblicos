import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CollectionHero } from "@/components/CollectionHero";
import { seriesRepository, studyRepository } from "@/lib/repositories";
import type { StudySummary } from "@/lib/types";

const SERIES_SLUG = "profetas-de-israel-e-juda-da-monarquia-a-restauracao";

export const metadata: Metadata = {
  title: "Profetas de Israel e Judá — Da Monarquia à Restauração",
};

type Period = {
  id: string;
  label: string;
  title: string;
  description: string;
  start: number;
  end: number;
  tone: "violet" | "amber" | "stone";
  note?: string;
};

const PERIODS: Period[] = [
  {
    id: "monarquia-unida",
    label: "Bloco 1",
    title: "Monarquia Unida",
    description:
      "O surgimento da voz profética junto à formação e consolidação da monarquia.",
    start: 1,
    end: 3,
    tone: "violet",
  },
  {
    id: "reino-dividido",
    label: "Bloco 2",
    title: "Reino Dividido",
    description:
      "A divisão do reino e os primeiros grandes confrontos proféticos em Israel e Judá.",
    start: 4,
    end: 8,
    tone: "amber",
  },
  {
    id: "pre-cativeiro",
    label: "Bloco 3",
    title: "Pré-Cativeiro",
    description:
      "Advertências, chamados ao arrependimento e esperança em meio à crise espiritual dos reinos.",
    start: 9,
    end: 17,
    tone: "stone",
  },
  {
    id: "transicao-cativeiro",
    label: "Bloco 4",
    title: "Queda de Judá e transição para o Cativeiro",
    description:
      "O juízo se aproxima, Jerusalém entra em sua crise final e a mensagem profética acompanha a transição para o exílio.",
    start: 18,
    end: 20,
    tone: "amber",
    note:
      "Joel e Obadias possuem propostas cronológicas diferentes entre os estudiosos; por isso, este bloco é editorial e não pretende fixar uma datação absoluta para esses livros.",
  },
  {
    id: "cativeiro",
    label: "Bloco 5",
    title: "Cativeiro",
    description:
      "A voz profética entre os exilados, preservando identidade, esperança e a promessa do Reino de Deus.",
    start: 21,
    end: 22,
    tone: "violet",
  },
  {
    id: "restauracao",
    label: "Bloco 6",
    title: "Restauração",
    description:
      "Reconstrução, renovação da aliança e expectativa da glória futura depois do retorno.",
    start: 23,
    end: 25,
    tone: "amber",
  },
];

const toneClasses = {
  violet: {
    panel: "border-violet-200 bg-violet-50",
    label: "text-violet-800",
    number: "bg-violet-50 text-violet-800",
  },
  amber: {
    panel: "border-amber-200 bg-amber-50",
    label: "text-amber-900",
    number: "bg-amber-50 text-amber-900",
  },
  stone: {
    panel: "border-stone-300 bg-stone-100",
    label: "text-stone-700",
    number: "bg-stone-100 text-stone-700",
  },
} as const;

function ProphetStudyCard({
  study,
  position,
  tone,
}: {
  study: StudySummary;
  position: number;
  tone: Period["tone"];
}) {
  const classes = toneClasses[tone];

  return (
    <li>
      <Link
        href={`/estudo/${study.slug}`}
        className="group grid gap-4 rounded-xl border border-stone-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-sm sm:grid-cols-[3.5rem_1fr_auto] sm:items-center"
      >
        <span
          className={`flex h-12 w-12 items-center justify-center rounded-full font-serif text-base font-semibold ${classes.number}`}
          aria-hidden="true"
        >
          {String(position).padStart(2, "0")}
        </span>

        <div className="min-w-0">
          {study.referenciaPrincipal && (
            <p className="text-xs font-semibold uppercase tracking-[0.09em] text-amber-800">
              {study.referenciaPrincipal.referenciaNormalizada}
            </p>
          )}

          <h3 className="mt-1 font-serif text-lg font-semibold leading-6 text-stone-950 transition group-hover:text-amber-800">
            {study.titulo}
          </h3>

          {study.resumo && (
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-500">
              {study.resumo}
            </p>
          )}
        </div>

        <span className="text-sm font-semibold text-amber-800 transition group-hover:translate-x-0.5">
          Ler →
        </span>
      </Link>
    </li>
  );
}

export default async function ProphetsSeriesPage() {
  const [series, studies] = await Promise.all([
    seriesRepository.getBySlug(SERIES_SLUG),
    studyRepository.listBySeriesSlug(SERIES_SLUG),
  ]);

  if (!series) notFound();

  return (
    <div className="min-h-screen bg-[#fcfbf8]">
      <CollectionHero
        eyebrow="Coleção histórica"
        title={series.nome}
        description={series.descricao}
        meta={
          <>
            <span className="font-semibold text-amber-800">
              {studies.length} panoramas biográficos
            </span>
            <span aria-hidden="true">·</span>
            <span>Da Monarquia à Restauração</span>
          </>
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

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
            Linha histórica da série
          </p>
          <h2 className="mt-2 font-serif text-2xl font-semibold text-stone-950">
            Uma leitura contínua da voz profética em seis períodos
          </h2>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-stone-600">
            A numeração permanece global, de 01 a 25. Os blocos abaixo apenas
            organizam visualmente o percurso histórico e ajudam a perceber a
            mudança de contexto entre monarquia, divisão, crise, cativeiro e
            restauração.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PERIODS.map((period) => {
              const classes = toneClasses[period.tone];
              const total = period.end - period.start + 1;

              return (
                <a
                  key={period.id}
                  href={`#${period.id}`}
                  className={`rounded-xl border p-4 transition hover:-translate-y-0.5 hover:shadow-sm ${classes.panel}`}
                >
                  <p className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${classes.label}`}>
                    {period.label} · {String(period.start).padStart(2, "0")}–{String(period.end).padStart(2, "0")}
                  </p>
                  <p className="mt-1 font-serif text-lg font-semibold text-stone-950">
                    {period.title}
                  </p>
                  <p className="mt-1 text-sm text-stone-600">
                    {total} {total === 1 ? "profeta" : "profetas"}
                  </p>
                </a>
              );
            })}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-2 rounded-xl bg-stone-950 px-4 py-4 text-sm font-semibold text-stone-100 sm:px-5">
            <span>Monarquia</span>
            <span className="text-stone-500" aria-hidden="true">→</span>
            <span>Reino Dividido</span>
            <span className="text-stone-500" aria-hidden="true">→</span>
            <span>Pré-Cativeiro</span>
            <span className="text-stone-500" aria-hidden="true">→</span>
            <span>Queda de Judá</span>
            <span className="text-stone-500" aria-hidden="true">→</span>
            <span>Cativeiro</span>
            <span className="text-stone-500" aria-hidden="true">→</span>
            <span>Restauração</span>
          </div>
        </section>

        <div className="mt-10 space-y-10">
          {PERIODS.map((period) => {
            const classes = toneClasses[period.tone];
            const periodStudies = studies.slice(period.start - 1, period.end);

            return (
              <section key={period.id} id={period.id} className="scroll-mt-24">
                <div className={`rounded-t-2xl border border-b-0 px-5 py-5 sm:px-6 ${classes.panel}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className={`text-xs font-semibold uppercase tracking-[0.15em] ${classes.label}`}>
                        {period.label} · Estudos {String(period.start).padStart(2, "0")}–{String(period.end).padStart(2, "0")}
                      </p>
                      <h2 className="mt-1 font-serif text-2xl font-semibold text-stone-950">
                        {period.title}
                      </h2>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
                        {period.description}
                      </p>
                    </div>

                    <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-stone-700 shadow-sm">
                      {periodStudies.length} {periodStudies.length === 1 ? "estudo" : "estudos"}
                    </span>
                  </div>

                  {period.note && (
                    <p className="mt-4 rounded-lg border border-stone-300 bg-white/70 px-4 py-3 text-xs leading-5 text-stone-600">
                      <strong>Nota cronológica:</strong> {period.note}
                    </p>
                  )}
                </div>

                <ol className="space-y-3 rounded-b-2xl border border-stone-200 bg-[#fcfbf8] p-3 sm:p-4">
                  {periodStudies.map((study, index) => (
                    <ProphetStudyCard
                      key={study.id}
                      study={study}
                      position={period.start + index}
                      tone={period.tone}
                    />
                  ))}
                </ol>
              </section>
            );
          })}
        </div>

        <section className="mt-10 rounded-2xl border border-stone-200 bg-white p-5 sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
            Como ler esta coleção
          </p>
          <div className="mt-3 grid gap-5 text-sm leading-6 text-stone-600 md:grid-cols-3">
            <p>
              <strong className="text-stone-900">Ordem editorial:</strong> siga os números de 01 a 25 para acompanhar o percurso completo da série.
            </p>
            <p>
              <strong className="text-stone-900">Contexto histórico:</strong> os blocos mostram a mudança de cenário político e espiritual sem substituir a leitura bíblica de cada estudo.
            </p>
            <p>
              <strong className="text-stone-900">Cronologia responsável:</strong> onde a datação é discutida, a página sinaliza a incerteza em vez de apresentar uma posição como consenso.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
