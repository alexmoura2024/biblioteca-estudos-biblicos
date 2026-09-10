"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getStudyNavigationAction } from "@/app/estudo/[slug]/relatedActions";
import type { StudySummary } from "@/lib/types";

interface StudyNavigationData {
  previous?: StudySummary;
  next?: StudySummary;
  contextLabel?: string;
  contextHref?: string;
}

interface StudyNavigationProps {
  slug: string;
}

export function StudyNavigation({ slug }: StudyNavigationProps) {
  const [navigation, setNavigation] =
    useState<StudyNavigationData | null>(null);

  useEffect(() => {
    let active = true;

    getStudyNavigationAction(slug)
      .then((result) => {
        if (active) setNavigation(result);
      })
      .catch(() => {
        if (active) setNavigation({});
      });

    return () => {
      active = false;
    };
  }, [slug]);

  if (!navigation) return null;

  const { previous, next, contextLabel, contextHref } = navigation;

  if (!previous && !next) return null;

  return (
    <nav
      className="no-print mt-12 border-t border-stone-200 pt-8"
      aria-label="Navegação entre estudos"
    >
      {contextLabel && (
        <div className="mb-5 text-center text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
          {contextHref ? (
            <Link
              href={contextHref}
              className="hover:text-amber-700 hover:underline"
            >
              {contextLabel}
            </Link>
          ) : (
            contextLabel
          )}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          {previous && (
            <Link
              href={`/estudo/${previous.slug}`}
              aria-label={`Estudo anterior: ${previous.titulo}`}
              className="group block h-full rounded-xl border border-stone-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-sm"
            >
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-800">
                ← Estudo anterior
              </span>

              <span className="mt-2 block font-serif text-base font-semibold leading-6 text-stone-900 group-hover:text-amber-800">
                {previous.titulo}
              </span>

              {previous.referenciaPrincipal && (
                <span className="mt-1 block text-xs text-stone-500">
                  {previous.referenciaPrincipal.referenciaNormalizada}
                </span>
              )}
            </Link>
          )}
        </div>

        <div>
          {next && (
            <Link
              href={`/estudo/${next.slug}`}
              aria-label={`Próximo estudo: ${next.titulo}`}
              className="group block h-full rounded-xl border border-stone-200 bg-white p-5 text-right transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-sm"
            >
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-800">
                Próximo estudo →
              </span>

              <span className="mt-2 block font-serif text-base font-semibold leading-6 text-stone-900 group-hover:text-amber-800">
                {next.titulo}
              </span>

              {next.referenciaPrincipal && (
                <span className="mt-1 block text-xs text-stone-500">
                  {next.referenciaPrincipal.referenciaNormalizada}
                </span>
              )}
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
