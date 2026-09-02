import type { Topic } from "@/lib/types";
import { slugify } from "@/lib/search/normalize";

interface TopicSeed {
  nome: string;
  descricao: string;
}

const TOPIC_SEEDS: TopicSeed[] = [
  { nome: "Fé", descricao: "Confiança em Deus mesmo diante do que ainda não se vê." },
  { nome: "Oração", descricao: "A prática de comunhão e diálogo com Deus." },
  { nome: "Graça", descricao: "O favor imerecido de Deus para com a humanidade." },
  { nome: "Perdão", descricao: "A restauração de relacionamentos rompidos pelo pecado." },
  { nome: "Esperança", descricao: "A expectativa segura nas promessas de Deus." },
  { nome: "Sofrimento e confiança", descricao: "Como manter a fé diante da dor e da adversidade." },
  { nome: "Amor", descricao: "O maior mandamento e o caráter de Deus revelado em Cristo." },
  { nome: "Obediência", descricao: "A resposta prática de submissão à vontade de Deus." },
  { nome: "Misericórdia", descricao: "A compaixão de Deus que se estende aos necessitados." },
  { nome: "Segunda vinda", descricao: "O retorno prometido de Cristo e a esperança escatológica." },
  { nome: "Liderança", descricao: "Princípios bíblicos para guiar e servir pessoas." },
  { nome: "Família", descricao: "Relações familiares à luz dos princípios bíblicos." },
];

export const topics: Topic[] = TOPIC_SEEDS.map((seed, index) => ({
  id: `topic-${index + 1}`,
  nome: seed.nome,
  slug: slugify(seed.nome),
  descricao: seed.descricao,
}));

export function getTopicBySlug(slug: string): Topic | undefined {
  return topics.find((topic) => topic.slug === slug);
}

export function getTopicById(id: string): Topic | undefined {
  return topics.find((topic) => topic.id === id);
}
