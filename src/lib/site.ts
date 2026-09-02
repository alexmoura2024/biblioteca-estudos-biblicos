/** Constantes de configuração do site, usadas pelo layout e pela navegação. */
export const siteConfig = {
  nome: "Biblioteca Virtual de Estudos Bíblicos",
  nomeCurto: "Biblioteca de Estudos",
  descricao:
    "Localize, leia e relacione estudos bíblicos por livro, capítulo, tema, personagem e série.",
};

export const mainNav = [
  { href: "/biblia", label: "Bíblia" },
  { href: "/temas", label: "Temas" },
  { href: "/personagens", label: "Personagens" },
  { href: "/series", label: "Séries" },
] as const;
