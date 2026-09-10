import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CollectionHero } from "@/components/CollectionHero";
import { EmptyState } from "@/components/EmptyState";
import { StudyCard } from "@/components/StudyCard";
import { studyRepository, topicRepository } from "@/lib/repositories";

interface TopicPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const topics = await topicRepository.listAll();
  return topics.map((topic) => ({ slug: topic.slug }));
}

export async function generateMetadata({
  params,
}: TopicPageProps): Promise<Metadata> {
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
    <div className="min-h-screen bg-[#fcfbf8]">
      <CollectionHero
        eyebrow="Tema"
        title={topic.nome}
        description={topic.descricao}
        meta={
          <span className="font-semibold text-amber-800">
            {studies.length} {studies.length === 1 ? "estudo publicado" : "estudos publicados"}
          </span>
        }
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: "Início", href: "/" },
              { label: "Temas", href: "/temas" },
              { label: topic.nome },
            ]}
          />
        }
      />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <section>
          <div className="border-b border-stone-200 pb-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
              Acervo temático
            </p>
            <h2 className="mt-1 font-serif text-2xl font-semibold text-stone-950">
              Mensagens e estudos
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
                title="Nenhum estudo publicado com este tema ainda"
                description="Volte em breve — o acervo está em expansão."
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
