import Link from "next/link";
import { SearchForm } from "@/components/SearchForm";
import { studyRepository } from "@/lib/repositories";

const QUICK_LINKS = [
  {
    href: "/biblia",
    title: "Bíblia",
    description: "Explore estudos por livro e capítulo.",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5v-16ZM20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5v-16Z" />
      </svg>
    ),
  },
  {
    href: "/temas",
    title: "Temas",
    description: "Encontre assuntos da fé e da vida cristã.",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 3.75h12A1.25 1.25 0 0 1 19.25 5v14A1.25 1.25 0 0 1 18 20.25H6A1.25 1.25 0 0 1 4.75 19V5A1.25 1.25 0 0 1 6 3.75Z" />
        <path strokeLinecap="round" d="M8 8h8M8 12h8M8 16h5" />
      </svg>
    ),
  },
  {
    href: "/personagens",
    title: "Personagens",
    description: "Conheça pessoas e contextos bíblicos.",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="9" cy="8" r="3" />
        <circle cx="17" cy="9" r="2.2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 19c.7-3.2 2.7-5 5.5-5s4.8 1.8 5.5 5M14.5 14.7c2.8-.6 5.1.8 6 3.8" />
      </svg>
    ),
  },
  {
    href: "/series",
    title: "Séries",
    description: "Aprofunde-se em sequências de estudos.",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path strokeLinecap="round" strokeLinejoin="round" d="m12 3 8 4-8 4-8-4 8-4Zm-8 9 8 4 8-4M4 17l8 4 8-4" />
      </svg>
    ),
  },
] as const;

const EXPLORE_LINKS = [
  { href: "/biblia", title: "Por Testamento", description: "Antigo e Novo Testamento" },
  { href: "/biblia", title: "Por Livros", description: "Todos os livros da Bíblia" },
  { href: "/temas", title: "Por Temas", description: "Assuntos da vida cristã" },
  { href: "/personagens", title: "Por Personagens", description: "Homens e mulheres da Bíblia" },
] as const;

export default async function HomePage() {
  const [destaques, totalPublicacoes] = await Promise.all([
    studyRepository.listRecent(6),
    studyRepository.countPublished(),
  ]);

  const estudoDestaque = destaques[0];
  const estudosRecentes = destaques.slice(1);

  return (
    <div className="bg-white">
      <section className="relative overflow-hidden border-b border-stone-200 bg-[#f3eadc]">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(circle at 78% 28%, rgba(180,120,55,.22), transparent 28%), radial-gradient(circle at 92% 90%, rgba(97,63,30,.15), transparent 33%), linear-gradient(115deg, rgba(255,255,255,.96) 0%, rgba(255,252,246,.92) 39%, rgba(238,221,198,.72) 68%, rgba(202,170,132,.55) 100%)",
          }}
        />
        <div
          aria-hidden="true"
          className="absolute -right-10 bottom-[-140px] h-[430px] w-[620px] rotate-[-7deg] rounded-[45%] border border-amber-900/10 bg-gradient-to-br from-amber-100/70 via-stone-50/60 to-amber-900/10 shadow-2xl"
        />

        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.15fr_.85fr] lg:px-8 lg:py-20">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
              Conhecimento que aproxima
            </p>

            <h1 className="mt-4 max-w-3xl font-serif text-4xl font-semibold leading-[1.02] tracking-tight text-stone-950 sm:text-5xl lg:text-6xl">
              Estudos bíblicos para pesquisar, compreender e compartilhar
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-stone-700 sm:text-lg">
              Encontre estudos por referência bíblica, tema, personagem, série ou palavra-chave.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-4">
              <div className="inline-flex items-center gap-3">
                <span className="text-amber-800">
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5v-16ZM20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5v-16Z" />
                  </svg>
                </span>
                <span className="font-serif text-4xl font-bold leading-none text-amber-800">
                  {new Intl.NumberFormat("pt-BR").format(totalPublicacoes)}
                </span>
                <span className="max-w-28 text-sm leading-5 text-stone-700">
                  estudos publicados no acervo
                </span>
              </div>
            </div>

            <div className="mt-8 max-w-3xl">
              <SearchForm size="large" />
              <p className="mt-3 text-xs text-stone-500">
                Experimente: João 3:16, Davi, perdão, Lucas 15 ou uma palavra-chave.
              </p>
            </div>
          </div>

          <aside className="hidden self-center border-l border-amber-800/30 pl-8 lg:block">
            <p className="font-serif text-xl italic leading-8 text-stone-700">
              “Lâmpada para os meus pés é tua palavra e luz, para o meu caminho.”
            </p>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.15em] text-stone-500">
              Salmo 119:105
            </p>

            <div className="mt-10 grid grid-cols-2 gap-x-8 gap-y-2 border-t border-stone-400/30 pt-6 text-xs uppercase tracking-[0.16em] text-stone-600">
              <span>Estudar</span>
              <span>Compreender</span>
              <span>Aplicar</span>
              <span>Compartilhar</span>
            </div>
          </aside>
        </div>
      </section>

      <section className="border-b border-stone-200 bg-[#fffdfa]">
        <div className="mx-auto grid max-w-7xl divide-y divide-stone-200 px-4 sm:grid-cols-2 sm:divide-x sm:divide-y-0 sm:px-6 lg:grid-cols-4 lg:px-8">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group flex items-center gap-4 px-1 py-6 sm:px-6 lg:px-7"
            >
              <span className="shrink-0 text-amber-800 transition-transform group-hover:-translate-y-0.5">
                {link.icon}
              </span>
              <span className="min-w-0">
                <span className="block font-serif text-base font-semibold text-stone-950">
                  {link.title}
                </span>
                <span className="mt-1 block text-sm leading-5 text-stone-500">
                  {link.description}
                </span>
              </span>
              <span className="ml-auto text-lg text-amber-700 transition-transform group-hover:translate-x-1">
                →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {estudoDestaque && (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm lg:grid-cols-[.95fr_1.35fr]">
            <div className="relative min-h-64 overflow-hidden bg-gradient-to-br from-[#6f4c2f] via-[#9b6c42] to-[#2f241d] p-8 text-amber-50">
              <div
                aria-hidden="true"
                className="absolute inset-0 opacity-25"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 20% 30%, #fff 0 1px, transparent 1px), radial-gradient(circle at 75% 65%, #fff 0 1px, transparent 1px)",
                  backgroundSize: "24px 24px, 31px 31px",
                }}
              />
              <div className="relative flex h-full flex-col justify-between">
                <div className="space-y-2 text-xs uppercase tracking-[0.24em] text-amber-100/80">
                  <p>História</p>
                  <p>Contexto</p>
                  <p>Significado</p>
                  <p>Aplicação</p>
                </div>
                <div className="mt-12 h-px w-12 bg-amber-100/70" />
              </div>
            </div>

            <div className="flex flex-col justify-center p-7 sm:p-9 lg:p-12">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
                Estudo em destaque
              </p>
              <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight text-stone-950">
                {estudoDestaque.titulo}
              </h2>
              {estudoDestaque.referenciaPrincipal && (
                <p className="mt-2 font-serif text-lg font-semibold text-amber-800">
                  {estudoDestaque.referenciaPrincipal.referenciaNormalizada}
                </p>
              )}
              <p className="mt-4 max-w-3xl text-sm leading-6 text-stone-600">
                {estudoDestaque.resumo}
              </p>

              {estudoDestaque.temas.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {estudoDestaque.temas.slice(0, 4).map(({ topic }) => (
                    <Link
                      key={topic.id}
                      href={`/temas/${topic.slug}`}
                      className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600 hover:bg-amber-50 hover:text-amber-800"
                    >
                      {topic.nome}
                    </Link>
                  ))}
                </div>
              )}

              <div className="mt-7">
                <Link
                  href={`/estudo/${estudoDestaque.slug}`}
                  className="inline-flex items-center gap-2 rounded-md bg-amber-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-800"
                >
                  Ler estudo
                  <span aria-hidden>→</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
        <div className="flex items-baseline justify-between border-b border-stone-200 pb-3">
          <h2 className="font-serif text-2xl font-semibold text-stone-950">
            Estudos recentes
          </h2>
          <Link href="/busca" className="text-sm font-medium text-amber-800 hover:underline">
            Ver todos os estudos →
          </Link>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {estudosRecentes.map((study) => (
            <article
              key={study.id}
              className="group flex min-h-56 flex-col rounded-lg border border-stone-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-amber-200 hover:shadow-md"
            >
              <h3 className="font-serif text-xl font-semibold leading-6 text-stone-950">
                <Link href={`/estudo/${study.slug}`} className="hover:text-amber-800">
                  {study.titulo}
                </Link>
              </h3>

              {study.referenciaPrincipal && (
                <p className="mt-2 text-sm font-semibold text-amber-800">
                  {study.referenciaPrincipal.referenciaNormalizada}
                </p>
              )}

              <p className="mt-3 line-clamp-3 text-sm leading-6 text-stone-600">
                {study.resumo}
              </p>

              <div className="mt-auto pt-5">
                {study.temas.length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-1.5">
                    {study.temas.slice(0, 3).map(({ topic }) => (
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
                  Ler estudo completo →
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-stone-200 bg-[#faf7f2]">
        <div className="mx-auto grid max-w-7xl gap-7 px-4 py-10 sm:px-6 lg:grid-cols-[1.2fr_2.8fr] lg:px-8">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-stone-950">
              Explore todo o acervo
            </h2>
            <p className="mt-2 text-sm leading-6 text-stone-500">
              Navegue por diferentes caminhos e descubra novos estudos.
            </p>
          </div>

          <div className="grid gap-px overflow-hidden rounded-lg border border-stone-200 bg-stone-200 sm:grid-cols-2 xl:grid-cols-4">
            {EXPLORE_LINKS.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="group bg-white p-5 transition hover:bg-amber-50"
              >
                <p className="font-serif font-semibold text-stone-950 group-hover:text-amber-900">
                  {item.title}
                </p>
                <p className="mt-1 text-xs leading-5 text-stone-500">
                  {item.description}
                </p>
                <span className="mt-4 block text-amber-800">→</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
