import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Badge } from "@/components/Badge";
import { studyRepository } from "@/lib/repositories";

interface StudyPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  // Marco 1.2 (DEC-018): listPublishedSlugs() traz só os slugs — gerar
  // as rotas estáticas do build não precisa carregar título, resumo,
  // relações nem conteúdo de cada estudo.
  const slugs = await studyRepository.listPublishedSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: StudyPageProps): Promise<Metadata> {
  const { slug } = await params;
  const study = await studyRepository.getPublishedBySlug(slug);
  return {
    title: study ? study.titulo : "Estudo não encontrado",
    description: study?.resumo,
  };
}

const DATE_FORMATTER = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" });

export default async function StudyPage({ params }: StudyPageProps) {
  const { slug } = await params;
  const study = await studyRepository.getPublishedBySlug(slug);
  if (!study) notFound();

  const referenciaPrincipal =
    study.passagens.find((p) => p.tipoRelacao === "principal") ?? study.passagens[0];

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Breadcrumbs
        items={[
          { label: "Início", href: "/" },
          referenciaPrincipal
            ? { label: referenciaPrincipal.book.nome, href: `/biblia/${referenciaPrincipal.book.slug}` }
            : { label: "Estudo" },
          { label: study.titulo },
        ]}
      />

      <header className="mt-4">
        <h1 className="font-serif text-3xl font-bold text-stone-900">{study.titulo}</h1>
        <p className="mt-2 text-sm text-stone-500">
          {study.autor} · {DATE_FORMATTER.format(new Date(study.dataOrigem))}
        </p>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {study.passagens.map(({ passage, book }) => (
            <Badge key={passage.id} href={`/biblia/${book.slug}/${passage.capitulo}`} variant="testamento">
              {passage.referenciaNormalizada}
            </Badge>
          ))}
          {study.temas.map(({ topic }) => (
            <Badge key={topic.id} href={`/temas/${topic.slug}`} variant="tema">
              {topic.nome}
            </Badge>
          ))}
          {study.personagens.map(({ character }) => (
            <Badge key={character.id} href={`/personagens/${character.slug}`} variant="personagem">
              {character.nome}
            </Badge>
          ))}
          {study.series.map(({ series }) => (
            <Badge key={series.id} href={`/series/${series.slug}`} variant="serie">
              {series.nome}
            </Badge>
          ))}
        </div>
      </header>

      <p className="mt-6 border-l-4 border-amber-600 pl-4 text-lg italic text-stone-700">
        {study.resumo}
      </p>

      <div className="mt-8">
        {study.conteudo
          .split(/\n+/)
          .map((block) => block.trim())
          .filter(Boolean)
          .map((block, index) => {
            const sectionTitle = [
              "Introdução",
              "Desenvolvimento",
              "Conclusão",
            ].find(
              (title) =>
                title.toLocaleLowerCase("pt-BR") ===
                block.toLocaleLowerCase("pt-BR")
            );

            if (sectionTitle) {
              return (
                <h2
                  key={`${sectionTitle}-${index}`}
                  className="mt-8 font-serif text-xl font-bold text-stone-900 first:mt-0"
                >
                  {sectionTitle}
                </h2>
              );
            }

            return (
              <p
                key={index}
                className="mt-4 whitespace-pre-line leading-7 text-stone-800 [text-align:justify] first:mt-0"
              >
                {block}
              </p>
            );
          })}
      </div>

      {study.palavrasChave.length > 0 && (
        <footer className="mt-10 border-t border-stone-200 pt-4 text-sm text-stone-500">
          <span className="font-medium">Palavras-chave: </span>
          {study.palavrasChave.join(", ")}
        </footer>
      )}
    </article>
  );
}
