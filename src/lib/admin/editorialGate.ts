export interface EditorialGateInput {
  titulo: string;
  autor: string;
  data_origem: string;
  resumo: string;
  conteudo: string;
  palavras_chave: string[];
  passages: Array<{
    tipo_relacao: "MAIN" | "SECONDARY" | "CITED" | string;
  }>;
}

export interface EditorialGateCheck {
  id: string;
  label: string;
  detail: string;
  pass: boolean;
}

export function evaluateEditorialGate(
  input: EditorialGateInput,
): EditorialGateCheck[] {
  const content = input.conteudo.trim();
  const keywords = (input.palavras_chave ?? [])
    .map((item) => item.trim())
    .filter(Boolean);

  const hasIntroduction = /\*\*Introdu[cç][aã]o\*\*/i.test(content);
  const hasDevelopment = /\*\*Desenvolvimento\*\*/i.test(content);
  const hasConclusion = /\*\*Conclus[aã]o\*\*/i.test(content);

  const hasMain = input.passages.some(
    (passage) => passage.tipo_relacao === "MAIN",
  );

  return [
    {
      id: "titulo",
      label: "Título",
      detail: input.titulo.trim()
        ? "Título informado."
        : "Informe o título.",
      pass: Boolean(input.titulo.trim()),
    },
    {
      id: "autor",
      label: "Autor",
      detail: input.autor.trim()
        ? "Autor informado."
        : "Informe o autor.",
      pass: Boolean(input.autor.trim()),
    },
    {
      id: "data",
      label: "Data de origem",
      detail: /^\d{4}-\d{2}-\d{2}$/.test(input.data_origem)
        ? "Data válida."
        : "Informe a data de origem.",
      pass: /^\d{4}-\d{2}-\d{2}$/.test(input.data_origem),
    },
    {
      id: "referencia-principal",
      label: "Referência principal",
      detail: hasMain
        ? "Uma referência MAIN está vinculada."
        : "Defina uma referência principal.",
      pass: hasMain,
    },
    {
      id: "estrutura",
      label: "Estrutura editorial",
      detail:
        hasIntroduction && hasDevelopment && hasConclusion
          ? "Introdução, Desenvolvimento e Conclusão encontrados."
          : "Use **Introdução**, **Desenvolvimento** e **Conclusão**.",
      pass: hasIntroduction && hasDevelopment && hasConclusion,
    },
    {
      id: "conteudo",
      label: "Conteúdo",
      detail:
        content.length >= 300
          ? `${content.length.toLocaleString("pt-BR")} caracteres.`
          : "O conteúdo ainda está curto.",
      pass: content.length >= 300,
    },
    {
      id: "resumo",
      label: "Resumo",
      detail:
        input.resumo.trim().length >= 80
          ? "Resumo com tamanho editorial adequado."
          : "O resumo precisa ter pelo menos 80 caracteres.",
      pass: input.resumo.trim().length >= 80,
    },
    {
      id: "palavras-chave",
      label: "Palavras-chave",
      detail:
        keywords.length >= 3
          ? `${keywords.length} palavras-chave.`
          : "Use pelo menos 3 palavras-chave.",
      pass: keywords.length >= 3,
    },
    {
      id: "referencias",
      label: "Referências vinculadas",
      detail:
        input.passages.length > 0
          ? `${input.passages.length} referência(s) vinculada(s).`
          : "Nenhuma referência foi vinculada.",
      pass: input.passages.length > 0,
    },
  ];
}

export function editorialGateReady(
  checks: EditorialGateCheck[],
): boolean {
  return checks.every((check) => check.pass);
}
