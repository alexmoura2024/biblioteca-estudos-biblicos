import type { Book } from "@/lib/types";
import { slugify } from "@/lib/search/normalize";

/**
 * Os 66 livros do cânon protestante, em ordem canônica, com o total de
 * capítulos de cada um. Estes dados são estáveis (não dependem do acervo
 * de estudos) e servem de eixo de indexação para toda a navegação
 * bíblica (ver docs/ARCHITECTURE.md, seção 2: "A Bíblia é o eixo de
 * indexação").
 */
interface BookSeed {
  nome: string;
  abreviacao: string;
  testamento: Book["testamento"];
  totalCapitulos: number;
}

const BOOK_SEEDS: BookSeed[] = [
  // Antigo Testamento
  { nome: "Gênesis", abreviacao: "Gn", testamento: "AT", totalCapitulos: 50 },
  { nome: "Êxodo", abreviacao: "Êx", testamento: "AT", totalCapitulos: 40 },
  { nome: "Levítico", abreviacao: "Lv", testamento: "AT", totalCapitulos: 27 },
  { nome: "Números", abreviacao: "Nm", testamento: "AT", totalCapitulos: 36 },
  { nome: "Deuteronômio", abreviacao: "Dt", testamento: "AT", totalCapitulos: 34 },
  { nome: "Josué", abreviacao: "Js", testamento: "AT", totalCapitulos: 24 },
  { nome: "Juízes", abreviacao: "Jz", testamento: "AT", totalCapitulos: 21 },
  { nome: "Rute", abreviacao: "Rt", testamento: "AT", totalCapitulos: 4 },
  { nome: "1 Samuel", abreviacao: "1Sm", testamento: "AT", totalCapitulos: 31 },
  { nome: "2 Samuel", abreviacao: "2Sm", testamento: "AT", totalCapitulos: 24 },
  { nome: "1 Reis", abreviacao: "1Rs", testamento: "AT", totalCapitulos: 22 },
  { nome: "2 Reis", abreviacao: "2Rs", testamento: "AT", totalCapitulos: 25 },
  { nome: "1 Crônicas", abreviacao: "1Cr", testamento: "AT", totalCapitulos: 29 },
  { nome: "2 Crônicas", abreviacao: "2Cr", testamento: "AT", totalCapitulos: 36 },
  { nome: "Esdras", abreviacao: "Ed", testamento: "AT", totalCapitulos: 10 },
  { nome: "Neemias", abreviacao: "Ne", testamento: "AT", totalCapitulos: 13 },
  { nome: "Ester", abreviacao: "Et", testamento: "AT", totalCapitulos: 10 },
  { nome: "Jó", abreviacao: "Jó", testamento: "AT", totalCapitulos: 42 },
  { nome: "Salmos", abreviacao: "Sl", testamento: "AT", totalCapitulos: 150 },
  { nome: "Provérbios", abreviacao: "Pv", testamento: "AT", totalCapitulos: 31 },
  { nome: "Eclesiastes", abreviacao: "Ec", testamento: "AT", totalCapitulos: 12 },
  { nome: "Cânticos dos Cânticos", abreviacao: "Ct", testamento: "AT", totalCapitulos: 8 },
  { nome: "Isaías", abreviacao: "Is", testamento: "AT", totalCapitulos: 66 },
  { nome: "Jeremias", abreviacao: "Jr", testamento: "AT", totalCapitulos: 52 },
  { nome: "Lamentações", abreviacao: "Lm", testamento: "AT", totalCapitulos: 5 },
  { nome: "Ezequiel", abreviacao: "Ez", testamento: "AT", totalCapitulos: 48 },
  { nome: "Daniel", abreviacao: "Dn", testamento: "AT", totalCapitulos: 12 },
  { nome: "Oséias", abreviacao: "Os", testamento: "AT", totalCapitulos: 14 },
  { nome: "Joel", abreviacao: "Jl", testamento: "AT", totalCapitulos: 3 },
  { nome: "Amós", abreviacao: "Am", testamento: "AT", totalCapitulos: 9 },
  { nome: "Obadias", abreviacao: "Ob", testamento: "AT", totalCapitulos: 1 },
  { nome: "Jonas", abreviacao: "Jn", testamento: "AT", totalCapitulos: 4 },
  { nome: "Miquéias", abreviacao: "Mq", testamento: "AT", totalCapitulos: 7 },
  { nome: "Naum", abreviacao: "Na", testamento: "AT", totalCapitulos: 3 },
  { nome: "Habacuque", abreviacao: "Hc", testamento: "AT", totalCapitulos: 3 },
  { nome: "Sofonias", abreviacao: "Sf", testamento: "AT", totalCapitulos: 3 },
  { nome: "Ageu", abreviacao: "Ag", testamento: "AT", totalCapitulos: 2 },
  { nome: "Zacarias", abreviacao: "Zc", testamento: "AT", totalCapitulos: 14 },
  { nome: "Malaquias", abreviacao: "Ml", testamento: "AT", totalCapitulos: 4 },
  // Novo Testamento
  { nome: "Mateus", abreviacao: "Mt", testamento: "NT", totalCapitulos: 28 },
  { nome: "Marcos", abreviacao: "Mc", testamento: "NT", totalCapitulos: 16 },
  { nome: "Lucas", abreviacao: "Lc", testamento: "NT", totalCapitulos: 24 },
  { nome: "João", abreviacao: "Jo", testamento: "NT", totalCapitulos: 21 },
  { nome: "Atos", abreviacao: "At", testamento: "NT", totalCapitulos: 28 },
  { nome: "Romanos", abreviacao: "Rm", testamento: "NT", totalCapitulos: 16 },
  { nome: "1 Coríntios", abreviacao: "1Co", testamento: "NT", totalCapitulos: 16 },
  { nome: "2 Coríntios", abreviacao: "2Co", testamento: "NT", totalCapitulos: 13 },
  { nome: "Gálatas", abreviacao: "Gl", testamento: "NT", totalCapitulos: 6 },
  { nome: "Efésios", abreviacao: "Ef", testamento: "NT", totalCapitulos: 6 },
  { nome: "Filipenses", abreviacao: "Fp", testamento: "NT", totalCapitulos: 4 },
  { nome: "Colossenses", abreviacao: "Cl", testamento: "NT", totalCapitulos: 4 },
  { nome: "1 Tessalonicenses", abreviacao: "1Ts", testamento: "NT", totalCapitulos: 5 },
  { nome: "2 Tessalonicenses", abreviacao: "2Ts", testamento: "NT", totalCapitulos: 3 },
  { nome: "1 Timóteo", abreviacao: "1Tm", testamento: "NT", totalCapitulos: 6 },
  { nome: "2 Timóteo", abreviacao: "2Tm", testamento: "NT", totalCapitulos: 4 },
  { nome: "Tito", abreviacao: "Tt", testamento: "NT", totalCapitulos: 3 },
  { nome: "Filemom", abreviacao: "Fm", testamento: "NT", totalCapitulos: 1 },
  { nome: "Hebreus", abreviacao: "Hb", testamento: "NT", totalCapitulos: 13 },
  { nome: "Tiago", abreviacao: "Tg", testamento: "NT", totalCapitulos: 5 },
  { nome: "1 Pedro", abreviacao: "1Pe", testamento: "NT", totalCapitulos: 5 },
  { nome: "2 Pedro", abreviacao: "2Pe", testamento: "NT", totalCapitulos: 3 },
  { nome: "1 João", abreviacao: "1Jo", testamento: "NT", totalCapitulos: 5 },
  { nome: "2 João", abreviacao: "2Jo", testamento: "NT", totalCapitulos: 1 },
  { nome: "3 João", abreviacao: "3Jo", testamento: "NT", totalCapitulos: 1 },
  { nome: "Judas", abreviacao: "Jd", testamento: "NT", totalCapitulos: 1 },
  { nome: "Apocalipse", abreviacao: "Ap", testamento: "NT", totalCapitulos: 22 },
];

export const books: Book[] = BOOK_SEEDS.map((seed, index) => ({
  id: `book-${index + 1}`,
  nome: seed.nome,
  abreviacao: seed.abreviacao,
  slug: slugify(seed.nome),
  testamento: seed.testamento,
  ordemCanonica: index + 1,
  totalCapitulos: seed.totalCapitulos,
}));

export function getBookBySlug(slug: string): Book | undefined {
  return books.find((book) => book.slug === slug);
}

export function getBookById(id: string): Book | undefined {
  return books.find((book) => book.id === id);
}

export const booksByTestament = {
  AT: books.filter((book) => book.testamento === "AT"),
  NT: books.filter((book) => book.testamento === "NT"),
};
