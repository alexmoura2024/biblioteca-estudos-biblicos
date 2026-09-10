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
export async function getStudyNavigationAction(
  slug: string,
): Promise<{
  previous?: StudySummary;
  next?: StudySummary;
  contextLabel?: string;
  contextHref?: string;
}> {
  const study = await studyRepository.getPublishedBySlug(slug);
  if (!study) return {};

  const seriePrincipal = [...study.series]
    .sort((a, b) => a.ordem - b.ordem)[0];

  if (seriePrincipal) {
    const seriesStudies = await studyRepository.listBySeriesSlug(
      seriePrincipal.series.slug,
    );

    const index = seriesStudies.findIndex((item) => item.id === study.id);

    if (index >= 0) {
      const previous = index > 0 ? seriesStudies[index - 1] : undefined;
      const next =
        index < seriesStudies.length - 1
          ? seriesStudies[index + 1]
          : undefined;

      if (previous || next) {
        return {
          previous,
          next,
          contextLabel: `S\u00e9rie: ${seriePrincipal.series.nome}`,
          contextHref: `/series/${seriePrincipal.series.slug}`,
        };
      }
    }
  }

  const principal =
    study.passagens.find((item) => item.tipoRelacao === "principal") ??
    study.passagens[0];

  if (!principal) return {};

  const chapter = principal.passage.capitulo;
  const book = principal.book;

  const previousChapterPromise =
    chapter > 1
      ? studyRepository.listByBookSlug(book.slug, chapter - 1)
      : Promise.resolve<StudySummary[]>([]);

  const nextChapterPromise =
    chapter < book.totalCapitulos
      ? studyRepository.listByBookSlug(book.slug, chapter + 1)
      : Promise.resolve<StudySummary[]>([]);

  const [
    previousChapterStudies,
    currentChapterStudies,
    nextChapterStudies,
  ] = await Promise.all([
    previousChapterPromise,
    studyRepository.listByBookSlug(book.slug, chapter),
    nextChapterPromise,
  ]);

  const byTitle = (a: StudySummary, b: StudySummary) =>
    a.titulo.localeCompare(b.titulo, "pt-BR");

  const current = [...currentChapterStudies].sort(byTitle);
  const previousChapter = [...previousChapterStudies].sort(byTitle);
  const nextChapter = [...nextChapterStudies].sort(byTitle);

  const index = current.findIndex((item) => item.id === study.id);

  let previous: StudySummary | undefined;
  let next: StudySummary | undefined;

  if (index > 0) {
    previous = current[index - 1];
  } else if (previousChapter.length > 0) {
    previous = previousChapter[previousChapter.length - 1];
  }

  if (index >= 0 && index < current.length - 1) {
    next = current[index + 1];
  } else if (nextChapter.length > 0) {
    next = nextChapter[0];
  }

  if (!previous && !next) return {};

  return {
    previous,
    next,
    contextLabel: `${book.nome} ${chapter}`,
    contextHref: `/biblia/${book.slug}/${chapter}`,
  };
}
