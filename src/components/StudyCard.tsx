import Link from "next/link";
import type { Study } from "@/lib/types";
import { Badge } from "@/components/Badge";

/**
 * Card de resultado/listagem de um estudo. Mostra exatamente os campos
 * definidos em docs/SEARCH_SPEC.md, seção 6: título, referência
 * principal, resumo curto, temas, série (quando houver) e acesso ao
 * estudo completo.
 */
export function StudyCard({ study }: { study: Study }) {
  const referenciaPrincipal =
    study.passagens.find((p) => p.tipoRelacao === "principal") ?? study.passagens[0];

  return (
    <article className="flex flex-col gap-3 rounded-lg border border-stone-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div>
        <h3 className="font-serif text-lg font-semibold text-stone-900">
          <Link href={`/estudo/${study.slug}`} className="hover:text-amber-700">
            {study.titulo}
          </Link>
        </h3>
        {referenciaPrincipal && (
          <p className="mt-1 text-sm font-medium text-amber-700">
            {referenciaPrincipal.passage.referenciaNormalizada}
          </p>
        )}
      </div>

      <p className="line-clamp-3 text-sm text-stone-600">{study.resumo}</p>

      <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
        {study.temas.map(({ topic }) => (
          <Badge key={topic.id} href={`/temas/${topic.slug}`} variant="tema">
            {topic.nome}
          </Badge>
        ))}
        {study.series.map(({ series }) => (
          <Badge key={series.id} href={`/series/${series.slug}`} variant="serie">
            {series.nome}
          </Badge>
        ))}
      </div>

      <Link
        href={`/estudo/${study.slug}`}
        className="text-sm font-medium text-amber-700 hover:underline"
      >
        Ler estudo completo →
      </Link>
    </article>
  );
}
