import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import {
  countBibleSourceVerses,
  parseBibleSource,
} from "../src/lib/bible/acfSource";

const SOURCE_REPO = "thiagobodruk/bible";
const SOURCE_PATH = "json/pt_acf.json";
const SOURCE_REF = "8ba57bdc560b2d1e34520656fe5f5162f5abe6de";
const SOURCE_URL =
  `https://raw.githubusercontent.com/${SOURCE_REPO}/${SOURCE_REF}/${SOURCE_PATH}`;

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;

  const content = readFileSync(path, "utf8");

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;

    const key = match[1];
    let value = match[2].trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

async function main() {
  loadEnvFile(".env.local");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY precisam estar no .env.local.",
    );
  }

  console.log("Baixando ACF da fonte Git fixada...");
  console.log(`Fonte: ${SOURCE_REPO}@${SOURCE_REF}`);

  const response = await fetch(SOURCE_URL, {
    headers: {
      Accept: "application/json",
      "User-Agent": "biblioteca-estudos-biblicos-private-import",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Falha ao baixar a fonte ACF: HTTP ${response.status}.`,
    );
  }

  const source = parseBibleSource(await response.json());

  if (source.length !== 66) {
    throw new Error(
      `A fonte contém ${source.length} livros; eram esperados 66.`,
    );
  }

  const supabase = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data: catalogBooks, error: catalogError } = await supabase
    .from("books")
    .select("id,nome,slug,ordem_canonica,total_capitulos")
    .order("ordem_canonica", { ascending: true });

  if (catalogError || !catalogBooks) {
    throw new Error(
      `Falha ao carregar os 66 livros do catálogo: ${
        catalogError?.message || "erro desconhecido"
      }`,
    );
  }

  if (catalogBooks.length !== 66) {
    throw new Error(
      `O catálogo possui ${catalogBooks.length} livros; eram esperados 66.`,
    );
  }

  for (let index = 0; index < 66; index += 1) {
    const sourceBook = source[index];
    const catalogBook = catalogBooks[index];

    if (
      sourceBook.chapters.length !==
      Number(catalogBook.total_capitulos)
    ) {
      throw new Error(
        `${catalogBook.nome}: catálogo tem ${catalogBook.total_capitulos} capítulos, ` +
          `mas a fonte (${sourceBook.book}) tem ${sourceBook.chapters.length}.`,
      );
    }
  }

  const copyrightNotice =
    "Almeida Corrigida e Revisada Fiel (ACF). Texto importado para uso pessoal/privado. " +
    "A fonte técnica é o repositório thiagobodruk/bible; os direitos da tradução permanecem com seus respectivos titulares.";

  const { data: version, error: versionError } = await supabase
    .from("bible_versions")
    .upsert(
      {
        code: "acf-private",
        name: "Almeida Corrigida e Revisada Fiel (ACF)",
        language: "pt-BR",
        source_repo: SOURCE_REPO,
        source_path: SOURCE_PATH,
        source_ref: SOURCE_REF,
        private_use_only: true,
        copyright_notice: copyrightNotice,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "code" },
    )
    .select("id")
    .single();

  if (versionError || !version) {
    throw new Error(
      `Falha ao registrar a versão ACF: ${
        versionError?.message || "erro desconhecido"
      }`,
    );
  }

  const { error: deleteError } = await supabase
    .from("bible_verses")
    .delete()
    .eq("version_id", version.id);

  if (deleteError) {
    throw new Error(
      `Falha ao limpar importação anterior: ${deleteError.message}`,
    );
  }

  const rows: Array<{
    version_id: string;
    book_id: string;
    chapter: number;
    verse: number;
    text: string;
  }> = [];

  for (let bookIndex = 0; bookIndex < 66; bookIndex += 1) {
    const sourceBook = source[bookIndex];
    const catalogBook = catalogBooks[bookIndex];

    sourceBook.chapters.forEach((chapter, chapterIndex) => {
      chapter.forEach((text, verseIndex) => {
        rows.push({
          version_id: version.id,
          book_id: catalogBook.id as string,
          chapter: chapterIndex + 1,
          verse: verseIndex + 1,
          text,
        });
      });
    });
  }

  const sourceVerseCount = countBibleSourceVerses(source);

  if (rows.length !== sourceVerseCount) {
    throw new Error(
      `Contagem interna divergente: ${rows.length} x ${sourceVerseCount}.`,
    );
  }

  console.log(
    `${rows.length.toLocaleString("pt-BR")} versículos preparados.`,
  );

  const BATCH_SIZE = 500;

  for (let start = 0; start < rows.length; start += BATCH_SIZE) {
    const batch = rows.slice(start, start + BATCH_SIZE);

    const { error } = await supabase
      .from("bible_verses")
      .insert(batch);

    if (error) {
      throw new Error(
        `Falha no lote ${Math.floor(start / BATCH_SIZE) + 1}: ${error.message}`,
      );
    }

    const done = Math.min(start + BATCH_SIZE, rows.length);
    process.stdout.write(
      `\rImportando: ${done.toLocaleString("pt-BR")} / ${rows.length.toLocaleString("pt-BR")}`,
    );
  }

  process.stdout.write("\n");

  const { count, error: countError } = await supabase
    .from("bible_verses")
    .select("*", { count: "exact", head: true })
    .eq("version_id", version.id);

  if (countError) {
    throw new Error(
      `Falha ao auditar a importação: ${countError.message}`,
    );
  }

  if (count !== rows.length) {
    throw new Error(
      `Auditoria falhou: banco=${count ?? 0}, fonte=${rows.length}.`,
    );
  }

  console.log("");
  console.log("ACF IMPORTADA COM SUCESSO.");
  console.log(`Livros: ${source.length}`);
  console.log(`Versículos: ${count?.toLocaleString("pt-BR")}`);
  console.log(`Versão: acf-private`);
  console.log(`Fonte fixada: ${SOURCE_REF}`);
}

main().catch((error) => {
  console.error("");
  console.error(
    error instanceof Error ? error.message : "Erro inesperado.",
  );
  process.exit(1);
});
