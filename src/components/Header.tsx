"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SearchForm } from "@/components/SearchForm";
import { mainNav } from "@/lib/site";

const primaryNav = mainNav.filter(
  (item) => item.href !== "/minha-biblioteca",
);
const libraryNav = mainNav.find(
  (item) => item.href === "/minha-biblioteca",
);

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 shadow-[0_1px_0_rgba(28,25,23,0.02)] backdrop-blur supports-[backdrop-filter]:bg-white/90">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-16 items-center gap-4 lg:min-h-[4.5rem]">
          <Link
            href="/"
            className="flex min-w-0 shrink-0 items-center gap-2.5 text-stone-950"
            aria-label="Página inicial da Biblioteca Virtual de Estudos Bíblicos"
            onClick={() => setMenuOpen(false)}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-800">
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5v-16ZM20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5v-16Z"
                />
              </svg>
            </span>

            <span className="min-w-0">
              <span className="block truncate font-serif text-[15px] font-semibold leading-tight sm:text-base">
                Biblioteca Virtual
              </span>
              <span className="hidden text-[11px] font-medium uppercase tracking-[0.11em] text-stone-500 sm:block">
                de Estudos Bíblicos
              </span>
              <span className="block text-[10px] font-medium uppercase tracking-[0.09em] text-stone-500 sm:hidden">
                Estudos Bíblicos
              </span>
            </span>
          </Link>

          <nav
            aria-label="Navegação principal"
            className="ml-3 hidden items-center gap-1 lg:flex"
          >
            {primaryNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-stone-700 transition hover:bg-amber-50 hover:text-amber-900"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto hidden w-[18rem] xl:block">
            <SearchForm
              inputId="header-search"
              compact
              submitLabel="Buscar"
            />
          </div>

          <Link
            href="/busca"
            className="ml-auto hidden h-10 w-10 items-center justify-center rounded-md border border-stone-200 text-stone-600 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-900 lg:flex xl:hidden"
            aria-label="Abrir busca"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <circle cx="11" cy="11" r="6" />
              <path strokeLinecap="round" d="m16 16 4 4" />
            </svg>
          </Link>

          {libraryNav && (
            <Link
              href={libraryNav.href}
              className="hidden min-h-10 items-center gap-2 rounded-md border border-stone-200 bg-stone-50/70 px-3 py-2 text-sm font-semibold text-stone-700 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-900 lg:flex"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7 4h10a1 1 0 0 1 1 1v15l-6-3-6 3V5a1 1 0 0 1 1-1Z"
                />
              </svg>
              {libraryNav.label}
            </Link>
          )}

          <button
            type="button"
            aria-expanded={menuOpen}
            aria-controls="mobile-site-menu"
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
            onClick={() => setMenuOpen((open) => !open)}
            className="ml-auto inline-flex h-10 items-center gap-2 rounded-md border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-700 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-900 lg:hidden"
          >
            <span aria-hidden="true" className="relative h-4 w-4">
              <span
                className={`absolute left-0 top-[3px] h-px w-4 bg-current transition ${
                  menuOpen ? "translate-y-[5px] rotate-45" : ""
                }`}
              />
              <span
                className={`absolute left-0 top-[8px] h-px w-4 bg-current transition ${
                  menuOpen ? "opacity-0" : ""
                }`}
              />
              <span
                className={`absolute left-0 top-[13px] h-px w-4 bg-current transition ${
                  menuOpen ? "-translate-y-[5px] -rotate-45" : ""
                }`}
              />
            </span>
            <span className="hidden sm:inline">Menu</span>
          </button>
        </div>

        {menuOpen && (
          <div
            id="mobile-site-menu"
            className="border-t border-stone-200 pb-5 pt-4 lg:hidden"
          >
            <SearchForm
              inputId="mobile-header-search"
              compact
              submitLabel="Buscar"
            />

            <nav
              aria-label="Navegação móvel"
              className="mt-4"
            >
              <div className="grid grid-cols-2 gap-2">
                {primaryNav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="flex min-h-12 items-center justify-between rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm font-semibold text-stone-700 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-900"
                  >
                    {item.label}
                    <span
                      aria-hidden="true"
                      className="text-amber-700"
                    >
                      →
                    </span>
                  </Link>
                ))}
              </div>

              {libraryNav && (
                <Link
                  href={libraryNav.href}
                  onClick={() => setMenuOpen(false)}
                  className="mt-2 flex min-h-12 items-center justify-between rounded-lg bg-stone-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-stone-800"
                >
                  <span className="flex items-center gap-2">
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M7 4h10a1 1 0 0 1 1 1v15l-6-3-6 3V5a1 1 0 0 1 1-1Z"
                      />
                    </svg>
                    {libraryNav.label}
                  </span>
                  <span aria-hidden="true">→</span>
                </Link>
              )}
            </nav>

            <p className="mt-4 text-xs leading-5 text-stone-500">
              Pesquise por referência bíblica, tema, personagem, série ou
              palavra-chave.
            </p>
          </div>
        )}
      </div>
    </header>
  );
}
