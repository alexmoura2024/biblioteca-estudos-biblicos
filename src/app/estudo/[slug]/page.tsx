import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import { Badge } from "@/components/Badge";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { RelatedStudies } from "@/components/RelatedStudies";
import { StudyActions } from "@/components/StudyActions";
import { StudyNavigation } from "@/components/StudyNavigation";
import { studyRepository } from "@/lib/repositories";

interface StudyPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = await studyRepository.listPublishedSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: StudyPageProps): Promise<Metadata> {
  const { slug } = await params;
  const study = await studyRepository.getPublishedBySlug(slug);

  return {
    title: study ? study.titulo : "Estudo não encontrado",
    description: study?.resumo,
  };
}

const DATE_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "long",
});

export default async function StudyPage({ params }: StudyPageProps) {
  const { slug } = await params;
  const study = await studyRepository.getPublishedBySlug(slug);

  if (!study) notFound();

  const referenciaPrincipal =
    study.passagens.find((p) => p.tipoRelacao === "principal") ??
    study.passagens[0];

  return (
    <article id="inicio-do-estudo" className="study-article bg-[#fcfbf8]">
      <div className="print-only study-print-brand" aria-hidden="true">
        <div>
          <p className="study-print-brand-name">
            Biblioteca de Estudos Bíblicos
          </p>
          <p className="study-print-brand-subtitle">Estudo bíblico</p>
        </div>

        {referenciaPrincipal && (
          <p className="study-print-reference">
            {referenciaPrincipal.passage.referenciaNormalizada}
          </p>
        )}
      </div>

      <header className="study-header border-b border-stone-200 bg-[#f7f2e9]">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-11">
          <div className="no-print">
            <Breadcrumbs
              items={[
                { label: "Início", href: "/" },
                referenciaPrincipal
                  ? {
                      label: referenciaPrincipal.book.nome,
                      href: `/biblia/${referenciaPrincipal.book.slug}`,
                    }
                  : { label: "Estudo" },
                { label: study.titulo },
              ]}
            />
          </div>

          <div className="mt-5 max-w-5xl">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
                Estudo bíblico
              </span>

              {referenciaPrincipal && (
                <>
                  <span
                    aria-hidden="true"
                    className="h-1 w-1 rounded-full bg-stone-400"
                  />
                  <span className="font-serif text-sm font-semibold text-stone-600">
                    {referenciaPrincipal.passage.referenciaNormalizada}
                  </span>
                </>
              )}
            </div>

            <h1 className="study-title mt-4 max-w-5xl font-serif text-4xl font-semibold leading-[1.08] tracking-tight text-stone-950 sm:text-5xl">
              {study.titulo}
            </h1>

            <p className="study-meta mt-5 text-sm leading-6 text-stone-600">
              <span className="font-semibold text-stone-800">{study.autor}</span>
              <span className="mx-2 text-stone-300" aria-hidden="true">
                ·
              </span>
              {DATE_FORMATTER.format(new Date(study.dataOrigem))}
            </p>

            <div className="no-print mt-6 max-w-4xl">
              <StudyActions
                title={study.titulo}
                slug={study.slug}
                summary={study.resumo}
                reference={referenciaPrincipal?.passage.referenciaNormalizada}
              />
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-9 sm:px-6 lg:px-8 lg:py-12">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_17rem] xl:gap-14">
          <div className="min-w-0">
            <div className="mx-auto max-w-3xl lg:mx-0">
              <section
                className="study-summary rounded-xl border border-amber-200/80 bg-amber-50/55 px-5 py-5 sm:px-6"
                aria-label="Resumo do estudo"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
                  Em síntese
                </p>
                <p className="mt-2 font-serif text-lg leading-8 text-stone-700">
                  {study.resumo}
                </p>
              </section>

              <div className="study-content mt-10 text-[1.02rem]">
                <ReactMarkdown
                  components={{
                    h1: ({ children }) => (
                      <h2 className="mt-12 border-b border-stone-200 pb-2 font-serif text-2xl font-semibold text-stone-950 first:mt-0">
                        {children}
                      </h2>
                    ),
                    h2: ({ children }) => (
                      <h2 className="mt-12 border-b border-stone-200 pb-2 font-serif text-2xl font-semibold text-stone-950 first:mt-0">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="mt-9 font-serif text-xl font-semibold text-stone-950">
                        {children}
                      </h3>
                    ),
                    h4: ({ children }) => (
                      <h4 className="mt-7 text-lg font-semibold text-stone-950">
                        {children}
                      </h4>
                    ),
                    p: ({ children }) => (
                      <p className="mt-5 leading-8 text-stone-800 [text-align:justify] first:mt-0">
                        {children}
                      </p>
                    ),
                    strong: ({ children }) => (
                      <strong className="font-bold text-stone-950">
                        {children}
                      </strong>
                    ),
                    em: ({ children }) => <em className="italic">{children}</em>,
                    blockquote: ({ children }) => (
                      <blockquote className="my-7 rounded-r-lg border-l-4 border-amber-600 bg-amber-50/70 px-5 py-4 font-serif text-[1.02rem] italic leading-7 text-stone-700">
                        {children}
                      </blockquote>
                    ),
                    ul: ({ children }) => (
                      <ul className="my-5 list-disc space-y-2 pl-7 text-stone-800 marker:text-amber-700">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="my-5 list-decimal space-y-2 pl-7 text-stone-800 marker:font-semibold marker:text-amber-800">
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => (
                      <li className="leading-8">{children}</li>
                    ),
                    hr: () => <hr className="my-10 border-stone-200" />,
                    a: ({ href, children }) => (
                      <a
                        href={href}
                        className="font-medium text-amber-800 underline decoration-amber-300 underline-offset-2 hover:text-amber-950"
                      >
                        {children}
                      </a>
                    ),
                  }}
                >
                  {study.conteudo}
                </ReactMarkdown>
              </div>

              {study.palavrasChave.length > 0 && (
                <footer className="study-keywords mt-12 border-t border-stone-200 pt-5 text-sm leading-6 text-stone-500">
                  <span className="font-semibold text-stone-700">
                    Palavras-chave:{" "}
                  </span>
                  {study.palavrasChave.join(", ")}
                </footer>
              )}
            </div>
          </div>

          <aside className="no-print lg:sticky lg:top-24">
            <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
              <div className="border-b border-stone-200 bg-stone-950 px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.17em] text-amber-300">
                  Neste estudo
                </p>
              </div>

              <div className="space-y-6 p-5">
                {study.passagens.length > 0 && (
                  <StudyMetaGroup title="Passagens">
                    {study.passagens.map(({ passage, book }) => (
                      <Badge
                        key={passage.id}
                        href={`/biblia/${book.slug}/${passage.capitulo}`}
                        variant="testamento"
                      >
                        {passage.referenciaNormalizada}
                      </Badge>
                    ))}
                  </StudyMetaGroup>
                )}

                {study.temas.length > 0 && (
                  <StudyMetaGroup title="Temas">
                    {study.temas.map(({ topic }) => (
                      <Badge
                        key={topic.id}
                        href={`/temas/${topic.slug}`}
                        variant="tema"
                      >
                        {topic.nome}
                      </Badge>
                    ))}
                  </StudyMetaGroup>
                )}

                {study.personagens.length > 0 && (
                  <StudyMetaGroup title="Personagens">
                    {study.personagens.map(({ character }) => (
                      <Badge
                        key={character.id}
                        href={`/personagens/${character.slug}`}
                        variant="personagem"
                      >
                        {character.nome}
                      </Badge>
                    ))}
                  </StudyMetaGroup>
                )}

                {study.series.length > 0 && (
                  <StudyMetaGroup title="Séries">
                    {study.series.map(({ series }) => (
                      <Badge
                        key={series.id}
                        href={`/series/${series.slug}`}
                        variant="serie"
                      >
                        {series.nome}
                      </Badge>
                    ))}
                  </StudyMetaGroup>
                )}

                <div className="border-t border-stone-200 pt-5">
                  <Link
                    href="/minha-biblioteca"
                    className="block text-sm font-semibold text-amber-800 hover:underline"
                  >
                    Minha biblioteca →
                  </Link>
                  <a
                    href="#inicio-do-estudo"
                    className="mt-3 block text-xs font-medium text-stone-500 hover:text-amber-800"
                  >
                    Voltar ao início ↑
                  </a>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <div className="mx-auto mt-12 max-w-5xl">
          <StudyNavigation slug={study.slug} />
          <RelatedStudies slug={study.slug} />
        </div>
      </div>

      <div className="print-only study-print-footer" aria-hidden="true">
        <span>Biblioteca de Estudos Bíblicos</span>
        <span>biblioteca-estudos-biblicos.vercel.app</span>
      </div>
    </article>
  );
}

function StudyMetaGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
        {title}
      </h2>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </section>
  );
}
