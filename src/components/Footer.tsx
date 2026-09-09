import Link from "next/link";
import { siteConfig } from "@/lib/site";

const FOOTER_LINKS = [
  { href: "/biblia", label: "Bíblia" },
  { href: "/temas", label: "Temas" },
  { href: "/personagens", label: "Personagens" },
  { href: "/series", label: "Séries" },
] as const;

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-stone-800 bg-stone-950 text-stone-300">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-9 md:grid-cols-[1.4fr_.8fr_1fr]">
          <div>
            <Link href="/" className="inline-flex items-center gap-3 text-white">
              <span className="text-amber-500">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5v-16ZM20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5v-16Z" />
                </svg>
              </span>
              <span className="font-serif text-lg font-semibold leading-tight">
                Biblioteca Virtual
                <br />
                de Estudos Bíblicos
              </span>
            </Link>

            <p className="mt-4 max-w-md text-sm leading-6 text-stone-400">
              Um acervo organizado para pesquisar, estudar e compartilhar a Palavra de Deus.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
              Links úteis
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {FOOTER_LINKS.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="transition hover:text-amber-400">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-stone-800 md:border-l md:pl-8">
            <p className="font-serif text-sm italic leading-6 text-stone-400">
              “Lâmpada para os meus pés é tua palavra e luz, para o meu caminho.”
            </p>
            <p className="mt-2 text-xs text-stone-600">Salmo 119:105</p>

            <Link
              href="/admin"
              className="mt-5 inline-block text-xs text-stone-500 transition hover:text-stone-300"
            >
              Área administrativa
            </Link>
          </div>
        </div>

        <div className="mt-9 flex flex-col gap-2 border-t border-stone-800 pt-5 text-xs text-stone-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {siteConfig.proprietario}. Todos os direitos reservados.
          </p>
          <p>Estudar · Compreender · Aplicar · Compartilhar</p>
        </div>
      </div>
    </footer>
  );
}
