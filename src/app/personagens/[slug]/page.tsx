import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CollectionHero } from "@/components/CollectionHero";
import { EmptyState } from "@/components/EmptyState";
import { StudyCard } from "@/components/StudyCard";
import { characterRepository, studyRepository } from "@/lib/repositories";

interface CharacterPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const characters = await characterRepository.listAll();
  return characters.map((character) => ({ slug: character.slug }));
}

export async function generateMetadata({
  params,
}: CharacterPageProps): Promise<Metadata> {
  const { slug } = await params;
  const character = await characterRepository.getBySlug(slug);
  return {
    title: character ? character.nome : "Personagem não encontrado",
  };
}

export default async function CharacterPage({
  params,
}: CharacterPageProps) {
  const { slug } = await params;
  const character = await characterRepository.getBySlug(slug);

  if (!character) notFound();

  const studies = await studyRepository.listByCharacterSlug(character.slug);

  return (
    <div className="min-h-screen bg-[#fcfbf8]">
      <CollectionHero
        eyebrow="Personagem bíblico"
        title={character.nome}
        description={character.descricao}
        meta={
          <span className="font-semibold text-amber-800">
            {studies.length} {studies.length === 1 ? "estudo publicado" : "estudos publicados"}
          </span>
        }
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: "Início", href: "/" },
              { label: "Personagens", href: "/personagens" },
              { label: character.nome },
            ]}
          />
        }
      />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <section>
          <div className="border-b border-stone-200 pb-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
              Estudos relacionados
            </p>
            <h2 className="mt-1 font-serif text-2xl font-semibold text-stone-950">
              Mensagens e estudos sobre {character.nome}
            </h2>
          </div>

          {studies.length > 0 ? (
            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {studies.map((study) => (
                <StudyCard key={study.id} study={study} />
              ))}
            </div>
          ) : (
            <div className="mt-6">
              <EmptyState
                title="Nenhum estudo publicado sobre este personagem ainda"
                description="Volte em breve — o acervo está em expansão."
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
