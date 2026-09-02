import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { StudyCard } from "@/components/StudyCard";
import { EmptyState } from "@/components/EmptyState";
import { characterRepository, studyRepository } from "@/lib/repositories";

interface CharacterPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const characters = await characterRepository.listAll();
  return characters.map((character) => ({ slug: character.slug }));
}

export async function generateMetadata({ params }: CharacterPageProps): Promise<Metadata> {
  const { slug } = await params;
  const character = await characterRepository.getBySlug(slug);
  return { title: character ? character.nome : "Personagem não encontrado" };
}

export default async function CharacterPage({ params }: CharacterPageProps) {
  const { slug } = await params;
  const character = await characterRepository.getBySlug(slug);
  if (!character) notFound();

  const studies = await studyRepository.listByCharacterSlug(character.slug);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Breadcrumbs
        items={[
          { label: "Início", href: "/" },
          { label: "Personagens", href: "/personagens" },
          { label: character.nome },
        ]}
      />
      <h1 className="mt-2 font-serif text-2xl font-bold text-stone-900">{character.nome}</h1>
      <p className="mt-1 max-w-2xl text-sm text-stone-500">{character.descricao}</p>

      <section className="mt-8">
        {studies.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {studies.map((study) => (
              <StudyCard key={study.id} study={study} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Nenhum estudo publicado sobre este personagem ainda"
            description="Volte em breve — o acervo está em expansão."
          />
        )}
      </section>
    </div>
  );
}
