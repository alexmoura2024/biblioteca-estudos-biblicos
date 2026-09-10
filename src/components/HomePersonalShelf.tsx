"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getFavoriteStudies,
  getStudyHistory,
  type StoredStudyLibraryItem,
} from "@/lib/client/studyLibrary";

export function HomePersonalShelf() {
  const [history, setHistory] = useState<StoredStudyLibraryItem[]>([]);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [ready, setReady] = useState(false);

  function refresh() {
    setHistory(getStudyHistory().slice(0, 3));
    setFavoriteCount(getFavoriteStudies().length);
    setReady(true);
  }

  useEffect(() => {
    refresh();

    const handleChange = () => refresh();
    window.addEventListener("storage", handleChange);
    window.addEventListener("study-library-updated", handleChange);

    return () => {
      window.removeEventListener("storage", handleChange);
      window.removeEventListener("study-library-updated", handleChange);
    };
  }, []);

  if (!ready || (history.length === 0 && favoriteCount === 0)) {
    return null;
  }

  return (
    <section className="border-b border-stone-200 bg-stone-50/70">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
              Sua leitura
            </p>
            <h2 className="mt-1 font-serif text-2xl font-semibold text-stone-950">
              Continue de onde parou
            </h2>
          </div>

          <Link
            href="/minha-biblioteca"
            className="text-sm font-semibold text-amber-800 hover:underline"
          >
            Minha biblioteca {"\u2192"}
          </Link>
        </div>

        {history.length > 0 ? (
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {history.map((study) => (
              <Link
                key={study.slug}
                href={`/estudo/${study.slug}`}
                className="group rounded-lg border border-stone-200 bg-white p-4 transition hover:border-amber-300 hover:shadow-sm"
              >
                {study.reference && (
                  <span className="text-xs font-semibold text-amber-800">
                    {study.reference}
                  </span>
                )}
                <span className="mt-1 block font-serif text-base font-semibold leading-5 text-stone-900 group-hover:text-amber-800">
                  {study.title}
                </span>
                <span className="mt-3 block text-xs font-medium text-stone-500">
                  Continuar leitura {"\u2192"}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-lg border border-stone-200 bg-white p-4 text-sm text-stone-600">
            {"Voc\u00ea j\u00e1 tem"} {favoriteCount}{" "}
            {favoriteCount === 1 ? "estudo favoritado" : "estudos favoritados"}.
            <Link
              href="/minha-biblioteca"
              className="ml-1 font-semibold text-amber-800 hover:underline"
            >
              Ver favoritos
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}