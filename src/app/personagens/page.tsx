import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CollectionHero } from "@/components/CollectionHero";
import { characterRepository } from "@/lib/repositories";

export const metadata: Metadata = {
  title: "Personagens",
};

export default async function PersonagensPage() {
  const [characters, counts] = await Promise.all([
    characterRepository.listAll(),
    characterRepository.countPublishedStudies(),
  ]);

  const totalVinculos = Object.values(counts).reduce(
    (sum, count) => sum + count,
    0,
  );

  return (
    <div className="min-h-screen bg-[#fcfbf8]">
      <CollectionHero
        eyebrow="Índice de personagens"
        title="Personagens"
        description="Encontre mensagens e estudos a partir das pessoas, trajetórias e contextos registrados nas Escrituras."
        meta={
          <>
            <span className="font-semibold text-stone-700">
              {characters.length} personagens catalogados
            </span>
            <span aria-hidden="true">·</span>
            <span>{totalVinculos} vínculos com estudos publicados</span>
          </>
        }
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: "Início", href: "/" },
              { label: "Personagens" },
            ]}
          />
        }
      />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {characters.map((character) => {
            const total = counts[character.id] ?? 0;

            return (
              <Link
                key={character.id}
                href={`/personagens/${character.slug}`}
                className="group flex min-h-44 flex-col rounded-xl border border-stone-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-100 text-stone-700">
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    >
                      <circle cx="12" cy="8" r="3" />
                      <path
                        strokeLinecap="round"
                        d="M5.5 19c.8-3.8 3.1-5.7 6.5-5.7s5.7 1.9 6.5 5.7"
                      />
                    </svg>
                  </span>

                  <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-600">
                    {total} {total === 1 ? "estudo" : "estudos"}
                  </span>
                </div>

                <h2 className="mt-5 font-serif text-xl font-semibold text-stone-950 group-hover:text-amber-800">
                  {character.nome}
                </h2>

                {character.descricao && (
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-500">
                    {character.descricao}
                  </p>
                )}

                <span className="mt-auto pt-4 text-sm font-semibold text-amber-800">
                  Ver estudos →
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
