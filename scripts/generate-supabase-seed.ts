/**
 * Gera `supabase/seed.sql` a partir dos dados mockados em
 * `src/lib/data/{books,topics,characters,series,studies}.ts` — os
 * mesmos módulos usados pelo motor de busca em memória e cobertos por
 * `src/lib/data/*.test.ts`.
 *
 * Por quê gerar em vez de escrever `seed.sql` à mão: garante que o seed
 * do Postgres NUNCA diverge do que os testes do Marco 1/1.1/1.2 já
 * validam (contagem de estudos publicados, integridade referencial,
 * limites canônicos de versículo, as provas de relação N:N). Rodar este
 * script de novo depois de editar qualquer arquivo em `src/lib/data/` é
 * a forma correta de manter o seed do Supabase sincronizado — nunca
 * edite `supabase/seed.sql` manualmente.
 *
 * Uso: `npm run db:generate-seed` (ver script em package.json).
 * `supabase db reset` roda o `seed.sql` gerado automaticamente depois
 * das migrations (ver supabase/config.toml, [db.seed]).
 *
 * Mapeamento aplicado aqui (TypeScript em memória -> Postgres):
 * - `Study.status`/`visibilidade` -> colunas homônimas (mesmos valores).
 * - `TipoRelacaoPassagem` ("principal"/"secundaria"/"citada") ->
 *   `study_passages.tipo_relacao` ("MAIN"/"SECONDARY"/"CITED") — os
 *   valores em inglês são os pedidos pelo schema da Fase 2.
 * - Todo id (`books.id`, `studies.id`, `passages.id`, ...) é gerado como
 *   um UUID novo aqui — os ids de `src/lib/data` (ex.: "book-1") são só
 *   identificadores em memória, nunca usados como UUID do Postgres.
 */
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { books } from "../src/lib/data/books";
import { topics } from "../src/lib/data/topics";
import { characters } from "../src/lib/data/characters";
import { seriesList } from "../src/lib/data/series";
import { allStudies } from "../src/lib/data/studies";

function esc(value: string): string {
  return value.replace(/'/g, "''");
}

function sqlTextArray(values: string[]): string {
  if (values.length === 0) return "ARRAY[]::text[]";
  return `ARRAY[${values.map((v) => `'${esc(v)}'`).join(", ")}]::text[]`;
}

const TIPO_RELACAO_MAP: Record<string, string> = {
  principal: "MAIN",
  secundaria: "SECONDARY",
  citada: "CITED",
};

function generate(): string {
  const bookIdBySlug = new Map(books.map((b) => [b.slug, randomUUID()]));
  const topicIdBySlug = new Map(topics.map((t) => [t.slug, randomUUID()]));
  const characterIdBySlug = new Map(characters.map((c) => [c.slug, randomUUID()]));
  const seriesIdBySlug = new Map(seriesList.map((s) => [s.slug, randomUUID()]));

  const lines: string[] = [
    "-- Fase 2 — Etapa 7: seed controlado e reproduzível.",
    "--",
    "-- ARQUIVO GERADO — não edite manualmente. Gerado por",
    "-- scripts/generate-supabase-seed.ts a partir de",
    "-- src/lib/data/{books,topics,characters,series,studies}.ts — os mesmos",
    "-- dados mockados já validados pelos testes do motor em memória",
    "-- (src/lib/data/*.test.ts). Para atualizar, edite os dados mockados e",
    "-- rode `npm run db:generate-seed` de novo.",
    "--",
    "-- NÃO é o acervo real (DEC-006/DEC-011) — os mesmos estudos fictícios já",
    "-- usados desde o Marco 1, incluindo ao menos um DRAFT e um REVIEW.",
    "-- `supabase db reset` roda este arquivo depois das migrations.",
    "",
    "begin;",
    "",
    "-- books (66 livros)",
  ];

  for (const b of books) {
    lines.push(
      `insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ` +
        `('${bookIdBySlug.get(b.slug)}', '${esc(b.nome)}', '${esc(b.abreviacao)}', '${esc(b.slug)}', '${b.testamento}', ${b.ordemCanonica}, ${b.totalCapitulos});`,
    );
  }

  lines.push("", "-- topics");
  for (const t of topics) {
    lines.push(
      `insert into public.topics (id, nome, slug, descricao) values ('${topicIdBySlug.get(t.slug)}', '${esc(t.nome)}', '${esc(t.slug)}', '${esc(t.descricao)}');`,
    );
  }

  lines.push("", "-- characters");
  for (const c of characters) {
    lines.push(
      `insert into public.characters (id, nome, slug, descricao) values ('${characterIdBySlug.get(c.slug)}', '${esc(c.nome)}', '${esc(c.slug)}', '${esc(c.descricao)}');`,
    );
  }

  lines.push("", "-- series");
  for (const s of seriesList) {
    lines.push(
      `insert into public.series (id, nome, slug, descricao) values ('${seriesIdBySlug.get(s.slug)}', '${esc(s.nome)}', '${esc(s.slug)}', '${esc(s.descricao)}');`,
    );
  }

  lines.push("", "-- studies (com passagens, temas, personagens e séries) — um bloco por estudo");
  for (const study of allStudies) {
    const studyId = randomUUID();
    lines.push(`-- ${study.titulo} [${study.status}]`);
    lines.push(
      `insert into public.studies (id, titulo, slug, resumo, conteudo, status, visibilidade, autor, data_origem, palavras_chave, created_at, updated_at) values (` +
        `'${studyId}', '${esc(study.titulo)}', '${esc(study.slug)}', '${esc(study.resumo)}', '${esc(study.conteudo)}', ` +
        `'${study.status}', '${study.visibilidade}', '${esc(study.autor)}', '${study.dataOrigem}', ${sqlTextArray(study.palavrasChave)}, ` +
        `'${study.createdAt}', '${study.updatedAt}');`,
    );

    for (const p of study.passagens) {
      const passageId = randomUUID();
      const bookId = bookIdBySlug.get(p.book.slug);
      if (!bookId) throw new Error(`livro desconhecido no seed: ${p.book.slug}`);
      const vi = p.passage.versiculoInicio ?? null;
      const vf = p.passage.versiculoFim ?? null;
      lines.push(
        `insert into public.passages (id, book_id, capitulo, versiculo_inicio, versiculo_fim, referencia_normalizada) values (` +
          `'${passageId}', '${bookId}', ${p.passage.capitulo}, ${vi === null ? "null" : vi}, ${vf === null ? "null" : vf}, '${esc(p.passage.referenciaNormalizada)}');`,
      );
      const tipo = TIPO_RELACAO_MAP[p.tipoRelacao] ?? "CITED";
      lines.push(
        `insert into public.study_passages (study_id, passage_id, tipo_relacao, prioridade) values ('${studyId}', '${passageId}', '${tipo}', ${p.prioridade});`,
      );
    }

    for (const t of study.temas) {
      const topicId = topicIdBySlug.get(t.topic.slug);
      if (!topicId) throw new Error(`tema desconhecido no seed: ${t.topic.slug}`);
      lines.push(`insert into public.study_topics (study_id, topic_id, peso) values ('${studyId}', '${topicId}', ${t.peso});`);
    }

    for (const c of study.personagens) {
      const characterId = characterIdBySlug.get(c.character.slug);
      if (!characterId) throw new Error(`personagem desconhecido no seed: ${c.character.slug}`);
      lines.push(
        `insert into public.study_characters (study_id, character_id, papel) values ('${studyId}', '${characterId}', '${esc(c.papel)}');`,
      );
    }

    for (const s of study.series) {
      const seriesId = seriesIdBySlug.get(s.series.slug);
      if (!seriesId) throw new Error(`série desconhecida no seed: ${s.series.slug}`);
      lines.push(`insert into public.study_series (study_id, series_id, ordem) values ('${studyId}', '${seriesId}', ${s.ordem});`);
    }

    lines.push("");
  }

  lines.push("commit;", "");
  return lines.join("\n");
}

const sql = generate();
writeFileSync(new URL("../supabase/seed.sql", import.meta.url), sql, "utf8");

const publishedCount = allStudies.filter((s) => s.status === "PUBLISHED").length;
const draftCount = allStudies.filter((s) => s.status === "DRAFT").length;
const reviewCount = allStudies.filter((s) => s.status === "REVIEW").length;
console.log(
  `supabase/seed.sql gerado: ${books.length} livros, ${topics.length} temas, ${characters.length} personagens, ${seriesList.length} séries, ` +
    `${allStudies.length} estudos (${publishedCount} PUBLISHED, ${draftCount} DRAFT, ${reviewCount} REVIEW).`,
);
