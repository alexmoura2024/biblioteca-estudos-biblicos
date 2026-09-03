import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { topicRepository } from "@/lib/repositories";

export const metadata: Metadata = {
  title: "Temas",
};

export default async function TemasPage() {
  // Marco 1.2 (DEC-018): countPublishedStudies() é uma agregação
  // dedicada (GROUP BY topic_id em Postgres), não um carregamento de
  // todos os estudos filtrado em memória.
  const [topics, counts] = await Promise.all([
    topicRepository.listAll(),
    topicRepository.countPublishedStudies(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Temas" }]} />
      <h1 className="mt-2 font-serif text-2xl font-bold text-stone-900">Temas</h1>
      <p className="mt-1 text-sm text-stone-500">Explore estudos organizados por tema.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {topics.map((topic) => {
          const total = counts[topic.id] ?? 0;
          return (
            <Link
              key={topic.id}
              href={`/temas/${topic.slug}`}
              className="flex flex-col gap-1 rounded-lg border border-stone-200 bg-white p-5 shadow-sm hover:border-amber-600"
            >
              <span className="font-serif font-semibold text-stone-900">{topic.nome}</span>
              <span className="text-sm text-stone-500">{topic.descricao}</span>
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
