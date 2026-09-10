"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getRelatedStudiesAction } from "@/app/estudo/[slug]/relatedActions";
import type { StudySummary } from "@/lib/types";

interface RelatedStudiesProps {
  slug: string;
}

export function RelatedStudies({ slug }: RelatedStudiesProps) {
  const [studies, setStudies] = useState<StudySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setFailed(false);

    getRelatedStudiesAction(slug, 4)
      .then((items) => {
        if (active) setStudies(items);
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <section
        className="no-print mt-12 border-t border-stone-200 pt-8"
        aria-label="Carregando estudos relacionados"
        aria-busy="true"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
          Continue explorando
        </p>
        <h2 className="mt-1 font-serif text-2xl font-semibold text-stone-950">
          Estudos relacionados
        </h2>
        <p className="mt-3 text-sm text-stone-500">
          Buscando conexões no acervo...
        </p>
      </section>
    );
  }

  if (failed || studies.length === 0) return null;

  return (
    <section
      className="no-print mt-12 border-t border-stone-200 pt-8"
      aria-labelledby="related-studies-title"
    >
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
          Continue explorando
        </p>

        <h2
          id="related-studies-title"
          className="mt-1 font-serif text-2xl font-semibold text-stone-950"
        >
          Estudos relacionados
        </h2>

        <p className="mt-2 text-sm leading-6 text-stone-600">
          Selecionados pelas passagens, séries, temas e personagens relacionados
          a este estudo.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {studies.map((relatedStudy) => (
          <article
            key={relatedStudy.id}
            className="group rounded-xl border border-stone-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-sm"
          >
            <h3 className="font-serif text-lg font-semibold text-stone-900">
              <Link
                href={`/estudo/${relatedStudy.slug}`}
                className="group-hover:text-amber-800"
              >
                {relatedStudy.titulo}
              </Link>
            </h3>

            {relatedStudy.referenciaPrincipal && (
              <p className="mt-1 text-sm font-medium text-amber-700">
                {relatedStudy.referenciaPrincipal.referenciaNormalizada}
              </p>
            )}

            <p className="mt-3 line-clamp-3 text-sm leading-6 text-stone-600">
              {relatedStudy.resumo}
            </p>

            <Link
              href={`/estudo/${relatedStudy.slug}`}
              className="mt-4 inline-block text-sm font-semibold text-amber-800 hover:underline"
            >
              Ler estudo relacionado →
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
