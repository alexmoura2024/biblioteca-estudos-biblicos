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
      className="no-print mt-10 border-y border-stone-200 py-6"
      aria-label={"Navega\u00e7\u00e3o entre estudos"}
    >
      {contextLabel && (
        <div className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
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
              className="group block h-full rounded-lg border border-stone-200 bg-white p-4 transition hover:border-amber-300 hover:bg-amber-50/40"
            >
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-800">
                {"\u2190 Estudo anterior"}
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
              aria-label={`Pr\u00f3ximo estudo: ${next.titulo}`}
              className="group block h-full rounded-lg border border-stone-200 bg-white p-4 text-right transition hover:border-amber-300 hover:bg-amber-50/40"
            >
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-800">
                {"Pr\u00f3ximo estudo \u2192"}
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