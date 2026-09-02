import type { Series } from "@/lib/types";
import { slugify } from "@/lib/search/normalize";

interface SeriesSeed {
  nome: string;
  descricao: string;
}

const SERIES_SEEDS: SeriesSeed[] = [
  { nome: "Fundamentos da Fé", descricao: "Uma introdução aos temas essenciais da vida cristã." },
  { nome: "Vida de Davi", descricao: "Estudos sobre a trajetória do rei Davi, do campo ao trono." },
  { nome: "Cartas de Paulo", descricao: "Percorrendo as epístolas paulinas e sua teologia prática." },
  { nome: "Parábolas de Jesus", descricao: "Estudos sobre os ensinamentos de Jesus em forma de parábola." },
];

export const seriesList: Series[] = SERIES_SEEDS.map((seed, index) => ({
  id: `series-${index + 1}`,
  nome: seed.nome,
  slug: slugify(seed.nome),
  descricao: seed.descricao,
}));

export function getSeriesBySlug(slug: string): Series | undefined {
  return seriesList.find((series) => series.slug === slug);
}

export function getSeriesById(id: string): Series | undefined {
  return seriesList.find((series) => series.id === id);
}
