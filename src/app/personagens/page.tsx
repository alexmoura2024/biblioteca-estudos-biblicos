import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { characterRepository, studyRepository } from "@/lib/repositories";

export const metadata: Metadata = {
  title: "Personagens",
};

export default async function PersonagensPage() {
  const [characters, studies] = await Promise.all([
    characterRepository.listAll(),
    studyRepository.listPublished(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Personagens" }]} />
      <h1 className="mt-2 font-serif text-2xl font-bold text-stone-900">Personagens</h1>
      <p className="mt-1 text-sm text-stone-500">Explore estudos organizados por personagem bíblico.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {characters.map((character) => {
          // TODO(Fase 2, DEC-013): mesma ressalva de src/app/temas/page.tsx
          // — contagem em memória, trocar por agregação no banco.
          const total = studies.filter((s) =>
            s.personagens.some((p) => p.character.id === character.id),
          ).length;
          return (
            <Link
              key={character.id}
              href={`/personagens/${character.slug}`}
              className="flex flex-col gap-1 rounded-lg border border-stone-200 bg-white p-5 shadow-sm hover:border-amber-600"
            >
              <span className="font-serif font-semibold text-stone-900">{character.nome}</span>
              <span className="text-sm text-stone-500">{character.descricao}</span>
              <span className="mt-2 text-xs font-medium text-amber-700">
                {total} {total === 1 ? "estudo" : "estudos"}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
