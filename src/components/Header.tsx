import Link from "next/link";
import { mainNav, siteConfig } from "@/lib/site";
import { SearchForm } from "@/components/SearchForm";

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-7 gap-y-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-3 text-stone-950"
          aria-label="Página inicial da Biblioteca Virtual de Estudos Bíblicos"
        >
          <span className="text-amber-800">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5v-16ZM20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5v-16Z" />
            </svg>
          </span>
          <span className="hidden font-serif text-[17px] font-semibold leading-[1.05] sm:block">
            Biblioteca Virtual
            <br />
            de Estudos Bíblicos
          </span>
          <span className="font-serif text-lg font-semibold sm:hidden">
            {siteConfig.nomeCurto}
          </span>
        </Link>

        <nav aria-label="Navegação principal" className="order-3 w-full md:order-2 md:w-auto">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-stone-700">
            {mainNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="transition hover:text-amber-800">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="order-2 ml-auto w-full max-w-sm md:order-3 md:w-72">
          <SearchForm />
        </div>
      </div>
    </header>
  );
}
