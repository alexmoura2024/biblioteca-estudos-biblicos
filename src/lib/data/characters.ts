import type { Character } from "@/lib/types";
import { slugify } from "@/lib/search/normalize";

interface CharacterSeed {
  nome: string;
  descricao: string;
}

const CHARACTER_SEEDS: CharacterSeed[] = [
  { nome: "Abraão", descricao: "Patriarca chamado por Deus a deixar sua terra e pai de uma grande nação." },
  { nome: "Moisés", descricao: "Libertador de Israel e mediador da aliança no Sinai." },
  { nome: "Davi", descricao: "Rei de Israel, pastor, guerreiro e salmista." },
  { nome: "Jó", descricao: "Homem íntegro que manteve a fé em meio a grande sofrimento." },
  { nome: "Rute", descricao: "Moabita fiel cuja lealdade se tornou exemplo de graça." },
  { nome: "Isaías", descricao: "Profeta do Antigo Testamento que anunciou juízo e restauração." },
  { nome: "Jesus", descricao: "Centro da revelação bíblica; Cristo, o Filho de Deus encarnado." },
  { nome: "Maria", descricao: "Mãe de Jesus, exemplo de submissão à vontade de Deus." },
  { nome: "Pedro", descricao: "Discípulo e apóstolo, líder da igreja primitiva." },
  { nome: "Paulo", descricao: "Apóstolo aos gentios e autor de diversas cartas do Novo Testamento." },
  { nome: "João", descricao: "Apóstolo amado, autor do quarto evangelho e do Apocalipse." },
  { nome: "Tiago", descricao: "Líder da igreja em Jerusalém e autor da epístola que leva seu nome." },
];

export const characters: Character[] = CHARACTER_SEEDS.map((seed, index) => ({
  id: `character-${index + 1}`,
  nome: seed.nome,
  slug: slugify(seed.nome),
  descricao: seed.descricao,
}));

export function getCharacterBySlug(slug: string): Character | undefined {
  return characters.find((character) => character.slug === slug);
}

export function getCharacterById(id: string): Character | undefined {
  return characters.find((character) => character.id === id);
}
