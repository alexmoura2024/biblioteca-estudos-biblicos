import Link from "next/link";
import { SearchForm } from "@/components/SearchForm";
import { StudyCard } from "@/components/StudyCard";
import { studyRepository } from "@/lib/repositories";

const QUICK_LINKS = [
  {
    href: "/biblia",
    title: "Bíblia",
    description: "Navegue por livro e capítulo, do Gênesis ao Apocalipse.",
    icon: "📖",
  },
  {
    href: "/temas",
    title: "Temas",
    description: "Fé, oração, graça, perdão e outros temas recorrentes.",
    icon: "🏷️",
  },
  {
    href: "/personagens",
    title: "Personagens",
    description: "Abraão, Davi, Paulo e outras figuras bíblicas.",
    icon: "👤",
  },
  {
    href: "/series",
    title: "Séries",
    description: "Estudos organizados em sequência, prontos para seguir.",
    icon: "📚",
  },
] as const;

export default async function HomePage() {
  const studies = await studyRepository.listPublished();
  const destaques = [...studies]
    .sort((a, b) => (a.dataOrigem < b.dataOrigem ? 1 : -1))
    .slice(0, 6);

  return (
    <div>
      <section className="border-b border-stone-200 bg-gradient-to-b from-amber-50 to-white">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
          <h1 className="font-serif text-3xl font-bold text-stone-900 sm:text-4xl">
            Biblioteca Virtual de Estudos Bíblicos
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-stone-600">
            Encontre estudos por referência bíblica, tema, personagem, série ou palavra-chave —
            mesmo sem saber o nome exato do material.
          </p>
          <div className="mx-auto mt-8 max-w-xl">
            <SearchForm size="large" />
          </div>
          <p className="mt-3 text-xs text-stone-400">
            Experimente: &ldquo;João 3:16&rdquo;, &ldquo;Davi&rdquo;, &ldquo;perdão&rdquo; ou &ldquo;Lucas 15&rdquo;
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h2 className="font-serif text-xl font-semibold text-stone-900">Navegar por</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex flex-col gap-2 rounded-lg border border-stone-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <span aria-hidden className="text-2xl">
                {link.icon}
              </span>
              <span className="font-serif font-semibold text-stone-900">{link.title}</span>
              <span className="text-sm text-stone-500">{link.description}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="flex items-baseline justify-between">
          <h2 className="font-serif text-xl font-semibold text-stone-900">Estudos recentes</h2>
          <Link href="/busca" className="text-sm font-medium text-amber-700 hover:underline">
            Ver todos →
          </Link>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {destaques.map((study) => (
            <StudyCard key={study.id} study={study} />
          ))}
        </div>
      </section>
    </div>
  );
}
