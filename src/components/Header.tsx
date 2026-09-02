import Link from "next/link";
import { mainNav, siteConfig } from "@/lib/site";
import { SearchForm } from "@/components/SearchForm";

export function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-serif text-lg font-semibold text-stone-900">
          <span aria-hidden className="text-amber-700">
            📖
          </span>
          <span>{siteConfig.nomeCurto}</span>
        </Link>

        <nav aria-label="Navegação principal" className="order-3 w-full sm:order-2 sm:w-auto">
          <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm font-medium text-stone-700">
            {mainNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:text-amber-700">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="order-2 ml-auto w-full max-w-sm sm:order-3 sm:w-64">
          <SearchForm />
        </div>
      </div>
    </header>
  );
}
