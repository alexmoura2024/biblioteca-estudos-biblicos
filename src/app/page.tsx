import Link from "next/link";
import { HomePersonalShelf } from "@/components/HomePersonalShelf";
import { SearchForm } from "@/components/SearchForm";
import { studyRepository } from "@/lib/repositories";

const QUICK_LINKS = [
  {
    href: "/biblia",
    title: "B\u00edblia",
    description: "Livros e cap\u00edtulos",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5v-16ZM20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5v-16Z" />
      </svg>
    ),
  },
  {
    href: "/temas",
    title: "Temas",
    description: "Assuntos e doutrinas",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 4.5h14v15H5zM8 8h8M8 12h8M8 16h5" />
      </svg>
    ),
  },
  {
    href: "/personagens",
    title: "Personagens",
    description: "Pessoas e contextos",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="9" cy="8" r="3" />
        <circle cx="17" cy="9" r="2.2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 19c.7-3.2 2.7-5 5.5-5s4.8 1.8 5.5 5M14.5 14.7c2.8-.6 5.1.8 6 3.8" />
      </svg>
    ),
  },
  {
    href: "/series",
    title: "S\u00e9ries",
    description: "Sequ\u00eancias de estudos",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path strokeLinecap="round" strokeLinejoin="round" d="m12 3 8 4-8 4-8-4 8-4Zm-8 9 8 4 8-4M4 17l8 4 8-4" />
      </svg>
    ),
  },
  {
    href: "/minha-biblioteca",
    title: "Minha biblioteca",
    description: "Favoritos e hist\u00f3rico",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 4.5h12v16l-6-3.6-6 3.6v-16Z" />
        <path strokeLinecap="round" d="M9 8.5h6" />
      </svg>
    ),
  },
] as const;

const SEARCH_EXAMPLES = [
  ["Jo\u00e3o 3:16", "Jo\u00e3o 3:16"],
  ["ora\u00e7\u00e3o", "ora\u00e7\u00e3o"],
  ["Davi", "Davi"],
  ["salva\u00e7\u00e3o", "salva\u00e7\u00e3o"],
] as const;

export default async function HomePage() {
  const [destaques, totalPublicacoes] = await Promise.all([
    studyRepository.listRecent(7),
    studyRepository.countPublished(),
  ]);

  const estudoDestaque = destaques[0];
  const estudosRecentes = destaques.slice(1, 7);

  return (
    <div className="bg-white">
      <section className="relative overflow-hidden border-b border-stone-200 bg-[#f7f2e9]">
        <div
          aria-hidden="true"
          className="absolute inset-y-0 right-0 hidden w-[38%] border-l border-amber-900/10 lg:block"
          style={{
            background:
              "linear-gradient(145deg, rgba(255,255,255,.2), rgba(120,82,45,.08)), repeating-linear-gradient(0deg, transparent 0 31px, rgba(120,82,45,.055) 31px 32px)",
          }}
        />

        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.25fr_.75fr] lg:px-8 lg:py-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
              {"Biblioteca digital de estudos b\u00edblicos"}
            </p>

            <h1 className="mt-4 max-w-4xl font-serif text-4xl font-semibold leading-[1.04] tracking-tight text-stone-950 sm:text-5xl lg:text-[3.4rem]">
              {"Mensagens e estudos b\u00edblicos"}
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-stone-600 sm:text-lg">
              {"Um acervo organizado para encontrar estudos por passagem, tema, personagem, s\u00e9rie ou palavra-chave."}
            </p>

            <div className="mt-7 max-w-3xl rounded-xl border border-stone-200/80 bg-white p-3 shadow-[0_12px_35px_rgba(72,53,36,0.08)] sm:p-4">
              <SearchForm size="large" />

              <div className="mt-3 flex flex-wrap items-center gap-2 px-1 text-xs text-stone-500">
                <span>Experimente:</span>
                {SEARCH_EXAMPLES.map(([label, query]) => (
                  <Link
                    key={query}
                    href={`/busca?q=${encodeURIComponent(query)}`}
                    className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800"
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <aside className="flex items-center lg:pl-10">
            <div className="w-full border-l-2 border-amber-700/60 pl-6 sm:pl-8">
              <div className="flex items-end gap-3">
                <span className="font-serif text-5xl font-semibold leading-none text-amber-800">
                  {new Intl.NumberFormat("pt-BR").format(totalPublicacoes)}
                </span>
                <span className="pb-1 text-sm leading-5 text-stone-600">
                  estudos publicados
                </span>
              </div>

              <div className="mt-7 border-t border-stone-300/70 pt-6">
                <p className="font-serif text-lg italic leading-7 text-stone-700">
                  {"\u201cL\u00e2mpada para os meus p\u00e9s \u00e9 tua palavra e luz, para o meu caminho.\u201d"}
                </p>
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                  Salmo 119:105
                </p>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
                Navegue pelo acervo
              </p>
              <h2 className="mt-1 font-serif text-2xl font-semibold text-stone-950">
                Escolha um caminho
              </h2>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {QUICK_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group flex min-h-32 flex-col justify-between rounded-xl border border-stone-200 bg-[#fffdfa] p-5 transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-sm"
              >
                <span className="text-amber-800">{link.icon}</span>
                <span className="mt-5">
                  <span className="flex items-center justify-between gap-2 font-serif text-base font-semibold text-stone-950">
                    {link.title}
                    <span
                      aria-hidden="true"
                      className="text-amber-700 transition-transform group-hover:translate-x-1"
                    >
                      {"\u2192"}
                    </span>
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-stone-500">
                    {link.description}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <HomePersonalShelf />

      {estudoDestaque && (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-5 flex items-baseline justify-between border-b border-stone-200 pb-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
                {"Sele\u00e7\u00e3o editorial"}
              </p>
              <h2 className="mt-1 font-serif text-2xl font-semibold text-stone-950">
                Estudo em destaque
              </h2>
            </div>
          </div>

          <article className="grid overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm lg:grid-cols-[1.45fr_.55fr]">
            <div className="p-7 sm:p-9 lg:p-11">
              {estudoDestaque.referenciaPrincipal && (
                <p className="text-sm font-semibold text-amber-800">
                  {estudoDestaque.referenciaPrincipal.referenciaNormalizada}
                </p>
              )}

              <h3 className="mt-2 max-w-3xl font-serif text-3xl font-semibold leading-tight text-stone-950 sm:text-4xl">
                {estudoDestaque.titulo}
              </h3>

              <p className="mt-5 max-w-3xl text-sm leading-7 text-stone-600 sm:text-base">
                {estudoDestaque.resumo}
              </p>

              {estudoDestaque.temas.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-2">
                  {estudoDestaque.temas.slice(0, 4).map(({ topic }) => (
                    <Link
                      key={topic.id}
                      href={`/temas/${topic.slug}`}
                      className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-medium text-stone-600 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800"
                    >
                      {topic.nome}
                    </Link>
                  ))}
                </div>
              )}

              <Link
                href={`/estudo/${estudoDestaque.slug}`}
                className="mt-7 inline-flex items-center gap-2 rounded-md bg-amber-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-900"
              >
                Ler estudo completo
                <span aria-hidden="true">{"\u2192"}</span>
              </Link>
            </div>

            <aside className="border-t border-stone-200 bg-stone-950 p-7 text-stone-100 lg:border-l lg:border-t-0 lg:p-9">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
                Ficha do estudo
              </p>

              <dl className="mt-7 space-y-6">
                {estudoDestaque.referenciaPrincipal && (
                  <div>
                    <dt className="text-[11px] uppercase tracking-[0.14em] text-stone-400">
                      {"Refer\u00eancia"}
                    </dt>
                    <dd className="mt-1 font-serif text-lg text-stone-100">
                      {estudoDestaque.referenciaPrincipal.referenciaNormalizada}
                    </dd>
                  </div>
                )}

                <div>
                  <dt className="text-[11px] uppercase tracking-[0.14em] text-stone-400">
                    Autor
                  </dt>
                  <dd className="mt-1 text-sm leading-6 text-stone-200">
                    {estudoDestaque.autor}
                  </dd>
                </div>

                {estudoDestaque.series.length > 0 && (
                  <div>
                    <dt className="text-[11px] uppercase tracking-[0.14em] text-stone-400">
                      {"S\u00e9rie"}
                    </dt>
                    <dd className="mt-1 text-sm leading-6 text-stone-200">
                      {estudoDestaque.series[0].series.nome}
                    </dd>
                  </div>
                )}
              </dl>
            </aside>
          </article>
        </section>
      )}

      <section className="border-t border-stone-100 bg-[#fcfbf8]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 border-b border-stone-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
                Novidades do acervo
              </p>
              <h2 className="mt-1 font-serif text-2xl font-semibold text-stone-950">
                Estudos recentes
              </h2>
            </div>

            <Link
              href="/busca"
              className="text-sm font-semibold text-amber-800 hover:underline"
            >
              Ver todos os estudos {"\u2192"}
            </Link>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {estudosRecentes.map((study, index) => (
              <article
                key={study.id}
                className="group flex min-h-60 flex-col rounded-xl border border-stone-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-amber-200 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  {study.referenciaPrincipal ? (
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-amber-800">
                      {study.referenciaPrincipal.referenciaNormalizada}
                    </p>
                  ) : (
                    <span />
                  )}
                  <span className="font-serif text-sm text-stone-300">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>

                <h3 className="mt-3 font-serif text-xl font-semibold leading-6 text-stone-950">
                  <Link href={`/estudo/${study.slug}`} className="hover:text-amber-800">
                    {study.titulo}
                  </Link>
                </h3>

                <p className="mt-3 line-clamp-3 text-sm leading-6 text-stone-600">
                  {study.resumo}
                </p>

                <div className="mt-auto pt-5">
                  {study.temas.length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-1.5">
                      {study.temas.slice(0, 2).map(({ topic }) => (
                        <span
                          key={topic.id}
                          className="rounded-full bg-stone-100 px-2.5 py-1 text-[11px] text-stone-600"
                        >
                          {topic.nome}
                        </span>
                      ))}
                    </div>
                  )}

                  <Link
                    href={`/estudo/${study.slug}`}
                    className="text-sm font-semibold text-amber-800 group-hover:underline"
                  >
                    Ler estudo completo {"\u2192"}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}