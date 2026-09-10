import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CollectionHero } from "@/components/CollectionHero";
import { topicRepository } from "@/lib/repositories";

export const metadata: Metadata = {
  title: "Temas",
};

export default async function TemasPage() {
  const [topics, counts] = await Promise.all([
    topicRepository.listAll(),
    topicRepository.countPublishedStudies(),
  ]);

  const totalVinculos = Object.values(counts).reduce(
    (sum, count) => sum + count,
    0,
  );

  return (
    <div className="min-h-screen bg-[#fcfbf8]">
      <CollectionHero
        eyebrow="Índice temático"
        title="Temas"
        description="Explore o acervo por assuntos, doutrinas e temas recorrentes nas mensagens e estudos bíblicos."
        meta={
          <>
            <span className="font-semibold text-stone-700">
              {topics.length} temas catalogados
            </span>
            <span aria-hidden="true">·</span>
            <span>{totalVinculos} vínculos com estudos publicados</span>
          </>
        }
        breadcrumbs={
          <Breadcrumbs
            items={[{ label: "Início", href: "/" }, { label: "Temas" }]}
          />
        }
      />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {topics.map((topic) => {
            const total = counts[topic.id] ?? 0;

            return (
              <Link
                key={topic.id}
                href={`/temas/${topic.slug}`}
                className="group flex min-h-44 flex-col rounded-xl border border-stone-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-50 text-amber-800">
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 5h14v14H5zM8 9h8M8 13h5"
                      />
                    </svg>
                  </span>

                  <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-600">
                    {total} {total === 1 ? "estudo" : "estudos"}
                  </span>
                </div>

                <h2 className="mt-5 font-serif text-xl font-semibold text-stone-950 group-hover:text-amber-800">
                  {topic.nome}
                </h2>

                {topic.descricao && (
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-500">
                    {topic.descricao}
                  </p>
                )}

                <span className="mt-auto pt-4 text-sm font-semibold text-amber-800">
                  Explorar tema →
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
