"use server";

import { studyRepository } from "@/lib/repositories";
import type { StudySummary } from "@/lib/types";

interface WeightedGroup {
  items: StudySummary[];
  weight: number;
}

export async function getRelatedStudiesAction(
  slug: string,
  limit = 4,
): Promise<StudySummary[]> {
  const study = await studyRepository.getPublishedBySlug(slug);
  if (!study) return [];

  const queries: Array<Promise<WeightedGroup>> = [];

  const add = (query: Promise<StudySummary[]>, weight: number) => {
    queries.push(query.then((items) => ({ items, weight })));
  };

  const principal =
    study.passagens.find((item) => item.tipoRelacao === "principal") ??
    study.passagens[0];

  if (principal) {
    add(
      studyRepository.listByBookSlug(
        principal.book.slug,
        principal.passage.capitulo,
      ),
      8,
    );
  }

  const seriePrincipal = study.series[0];
  if (seriePrincipal) {
    add(
      studyRepository.listBySeriesSlug(seriePrincipal.series.slug),
      6,
    );
  }

  const principaisTemas = [...study.temas]
    .sort((a, b) => b.peso - a.peso)
    .slice(0, 2);

  for (const { topic } of principaisTemas) {
    add(studyRepository.listByTopicSlug(topic.slug), 3);
  }

  const personagemPrincipal = study.personagens[0];
  if (personagemPrincipal) {
    add(
      studyRepository.listByCharacterSlug(
        personagemPrincipal.character.slug,
      ),
      2,
    );
  }

  const groups = await Promise.all(queries);

  const candidates = new Map<
    string,
    { study: StudySummary; score: number }
  >();

  for (const { items, weight } of groups) {
    for (const item of items) {
      if (item.id === study.id) continue;

      const current = candidates.get(item.id);
      if (current) {
        current.score += weight;
      } else {
        candidates.set(item.id, { study: item, score: weight });
      }
    }
  }

  return [...candidates.values()]
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.study.titulo.localeCompare(b.study.titulo, "pt-BR"),
    )
    .slice(0, limit)
    .map(({ study: relatedStudy }) => relatedStudy);
}