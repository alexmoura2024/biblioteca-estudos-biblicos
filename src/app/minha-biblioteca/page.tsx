"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import {
  clearStudyHistory,
  getFavoriteStudies,
  getStudyHistory,
  removeStudyFavorite,
  type StoredStudyLibraryItem,
} from "@/lib/client/studyLibrary";

type Tab = "favorites" | "history";

function StudyRow({
  study,
  favorite,
  onRemove,
}: {
  study: StoredStudyLibraryItem;
  favorite?: boolean;
  onRemove?: (slug: string) => void;
}) {
  return (
    <article className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          {study.reference && (
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-800">
              {study.reference}
            </p>
          )}

          <h2 className="mt-1 font-serif text-lg font-semibold leading-6 text-stone-900">
            <Link
              href={`/estudo/${study.slug}`}
              className="hover:text-amber-800"
            >
              {study.title}
            </Link>
          </h2>

          {study.summary && (
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-600">
              {study.summary}
            </p>
          )}

          <Link
            href={`/estudo/${study.slug}`}
            className="mt-3 inline-block text-sm font-semibold text-amber-800 hover:underline"
          >
            {"Abrir estudo \u2192"}
          </Link>
        </div>

        {favorite && onRemove && (
          <button
            type="button"
            onClick={() => onRemove(study.slug)}
            className="shrink-0 rounded-md border border-stone-200 px-2.5 py-1.5 text-xs font-medium text-stone-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
            aria-label={`Remover ${study.title} dos favoritos`}
          >
            Remover
          </button>
        )}
      </div>
    </article>
  );
}

export default function MinhaBibliotecaPage() {
  const [tab, setTab] = useState<Tab>("favorites");
  const [favorites, setFavorites] = useState<StoredStudyLibraryItem[]>([]);
  const [history, setHistory] = useState<StoredStudyLibraryItem[]>([]);
  const [ready, setReady] = useState(false);

  function refresh() {
    setFavorites(getFavoriteStudies());
    setHistory(getStudyHistory());
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

  function removeFavorite(slug: string) {
    removeStudyFavorite(slug);
    refresh();
  }

  function clearHistory() {
    clearStudyHistory();
    refresh();
  }

  const items = tab === "favorites" ? favorites : history;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Breadcrumbs
        items={[
          { label: "In\u00edcio", href: "/" },
          { label: "Minha biblioteca" },
        ]}
      />

      <div className="mt-3 border-b border-stone-200 pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
          Leitura pessoal
        </p>
        <h1 className="mt-1 font-serif text-3xl font-bold text-stone-950">
          Minha biblioteca
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
          Seus favoritos e estudos lidos recentemente ficam salvos somente
          neste navegador. {"Nenhum login \u00e9 necess\u00e1rio."}
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2 border-b border-stone-200 pb-4">
        <button
          type="button"
          onClick={() => setTab("favorites")}
          aria-pressed={tab === "favorites"}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            tab === "favorites"
              ? "bg-amber-800 text-white"
              : "border border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
          }`}
        >
          {"\u2605 Favoritos"} ({favorites.length})
        </button>

        <button
          type="button"
          onClick={() => setTab("history")}
          aria-pressed={tab === "history"}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            tab === "history"
              ? "bg-amber-800 text-white"
              : "border border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
          }`}
        >
          {"Hist\u00f3rico"} ({history.length})
        </button>

        {tab === "history" && history.length > 0 && (
          <button
            type="button"
            onClick={clearHistory}
            className="ml-auto text-xs font-medium text-stone-500 hover:text-red-700 hover:underline"
          >
            {"Limpar hist\u00f3rico"}
          </button>
        )}
      </div>

      {!ready ? (
        <p className="mt-8 text-sm text-stone-500">
          Carregando sua biblioteca...
        </p>
      ) : items.length > 0 ? (
        <div className="mt-6 grid gap-4">
          {items.map((study) => (
            <StudyRow
              key={study.slug}
              study={study}
              favorite={tab === "favorites"}
              onRemove={tab === "favorites" ? removeFavorite : undefined}
            />
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-xl border border-dashed border-stone-300 bg-stone-50 px-6 py-10 text-center">
          <p className="font-serif text-lg font-semibold text-stone-800">
            {tab === "favorites"
              ? "Nenhum estudo favoritado ainda"
              : "Nenhum estudo no hist\u00f3rico ainda"}
          </p>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-stone-500">
            {tab === "favorites"
              ? "Abra um estudo e use o bot\u00e3o Favoritar para guard\u00e1-lo aqui."
              : "Os estudos que voc\u00ea abrir aparecer\u00e3o aqui automaticamente."}
          </p>
          <Link
            href="/biblia"
            className="mt-5 inline-flex rounded-md bg-amber-800 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-900"
          >
            {"Explorar a B\u00edblia"}
          </Link>
        </div>
      )}
    </div>
  );
}