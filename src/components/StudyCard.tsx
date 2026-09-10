import Link from "next/link";
import { Badge } from "@/components/Badge";
import type { StudySummary } from "@/lib/types";

/**
 * Card de resultado/listagem de um estudo.
 * Recebe StudySummary para evitar carregar o conteúdo integral do estudo.
 */
export function StudyCard({ study }: { study: StudySummary }) {
  return (
    <article className="group flex min-h-64 flex-col rounded-xl border border-stone-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md">
      <div>
        {study.referenciaPrincipal && (
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-amber-800">
            {study.referenciaPrincipal.referenciaNormalizada}
          </p>
        )}

        <h3 className="mt-2 font-serif text-xl font-semibold leading-6 text-stone-950">
          <Link
            href={`/estudo/${study.slug}`}
            className="transition group-hover:text-amber-800"
          >
            {study.titulo}
          </Link>
        </h3>
      </div>

      <p className="mt-3 line-clamp-3 text-sm leading-6 text-stone-600">
        {study.resumo}
      </p>

      <div className="mt-auto pt-5">
        {(study.temas.length > 0 || study.series.length > 0) && (
          <div className="mb-4 flex flex-wrap gap-1.5">
            {study.temas.map(({ topic }) => (
              <Badge
                key={topic.id}
                href={`/temas/${topic.slug}`}
                variant="tema"
              >
                {topic.nome}
              </Badge>
            ))}

            {study.series.map(({ series }) => (
              <Badge
                key={series.id}
                href={`/series/${series.slug}`}
                variant="serie"
              >
                {series.nome}
              </Badge>
            ))}
          </div>
        )}

        <Link
          href={`/estudo/${study.slug}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-amber-800 hover:underline"
        >
          Ler estudo completo
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}
