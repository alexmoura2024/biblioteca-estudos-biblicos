import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { StudyCard } from "@/components/StudyCard";
import { EmptyState } from "@/components/EmptyState";
import { studyRepository, topicRepository } from "@/lib/repositories";

interface TopicPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const topics = await topicRepository.listAll();
  return topics.map((topic) => ({ slug: topic.slug }));
}

export async function generateMetadata({ params }: TopicPageProps): Promise<Metadata> {
  const { slug } = await params;
  const topic = await topicRepository.getBySlug(slug);
  return { title: topic ? topic.nome : "Tema não encontrado" };
}

export default async function TopicPage({ params }: TopicPageProps) {
  const { slug } = await params;
  const topic = await topicRepository.getBySlug(slug);
  if (!topic) notFound();

  const studies = await studyRepository.listByTopicSlug(topic.slug);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Breadcrumbs
        items={[{ label: "Início", href: "/" }, { label: "Temas", href: "/temas" }, { label: topic.nome }]}
      />
      <h1 className="mt-2 font-serif text-2xl font-bold text-stone-900">{topic.nome}</h1>
      <p className="mt-1 max-w-2xl text-sm text-stone-500">{topic.descricao}</p>

      <section className="mt-8">
        {studies.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {studies.map((study) => (
              <StudyCard key={study.id} study={study} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Nenhum estudo publicado com este tema ainda"
            description="Volte em breve — o acervo está em expansão."
          />
        )}
      </section>
    </div>
  );
}
