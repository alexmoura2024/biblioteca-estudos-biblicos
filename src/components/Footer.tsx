import Link from "next/link";
import { mainNav, siteConfig } from "@/lib/site";

const primaryNav = mainNav.filter(
  (item) => item.href !== "/minha-biblioteca",
);
const libraryNav = mainNav.find(
  (item) => item.href === "/minha-biblioteca",
);

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-stone-800 bg-stone-950 text-stone-300">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
        <div className="grid gap-10 lg:grid-cols-[1.35fr_.8fr_.85fr]">
          <div className="max-w-lg">
            <Link
              href="/"
              className="inline-flex items-center gap-3 text-white"
              aria-label="Página inicial da Biblioteca Virtual de Estudos Bíblicos"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
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

              <span>
                <span className="block font-serif text-lg font-semibold leading-tight">
                  Biblioteca Virtual
                </span>
                <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.13em] text-stone-400">
                  de Estudos Bíblicos
                </span>
              </span>
            </Link>

            <p className="mt-5 max-w-md text-sm leading-6 text-stone-400">
              Um acervo organizado para pesquisar, compreender e compartilhar
              mensagens e estudos bíblicos por passagem, tema, personagem e
              série.
            </p>

            <p className="mt-5 border-l-2 border-amber-500/70 pl-4 font-serif text-sm italic leading-6 text-stone-300">
              “Lâmpada para os meus pés é tua palavra e luz, para o meu
              caminho.”
              <span className="mt-1 block font-sans text-[11px] not-italic uppercase tracking-[0.1em] text-stone-500">
                Salmo 119:105
              </span>
            </p>
          </div>

          <nav aria-label="Navegação do rodapé">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
              Explorar o acervo
            </p>

            <ul className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3 text-sm lg:grid-cols-1">
              {primaryNav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="inline-flex items-center gap-2 transition hover:text-amber-400"
                  >
                    <span>{item.label}</span>
                    <span aria-hidden="true" className="text-stone-600">
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
              Sua leitura
            </p>

            <p className="mt-4 text-sm leading-6 text-stone-400">
              Guarde favoritos e retome os estudos lidos recentemente neste
              navegador.
            </p>

            {libraryNav && (
              <Link
                href={libraryNav.href}
                className="mt-5 inline-flex items-center gap-2 rounded-md border border-stone-700 bg-stone-900 px-4 py-2.5 text-sm font-semibold text-stone-100 transition hover:border-amber-500/70 hover:bg-stone-800 hover:text-amber-300"
              >
                {libraryNav.label}
                <span aria-hidden="true">→</span>
              </Link>
            )}

            <Link
              href="/admin"
              className="mt-5 block w-fit text-xs text-stone-500 transition hover:text-stone-300"
            >
              Área administrativa
            </Link>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-stone-800 pt-5 text-xs text-stone-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {siteConfig.proprietario}. Todos os direitos reservados.
          </p>
          <p>Estudar · Compreender · Aplicar · Compartilhar</p>
        </div>
      </div>
    </footer>
  );
}
