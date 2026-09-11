import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import {
  parseGreekStepLine,
  parseHebrewStepLine,
  type ParsedStepWord,
} from "../src/lib/bible/stepOriginalSource";

const STEP_REPOSITORY = "STEPBible/STEPBible-Data";
const STEP_REF = "ae39711d7843b2902d54993e432de9c12d6a4b9a";

const HEBREW_FILES = [
  "Translators Amalgamated OT+NT/TAHOT Gen-Deu - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt",
  "Translators Amalgamated OT+NT/TAHOT Jos-Est - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt",
  "Translators Amalgamated OT+NT/TAHOT Job-Sng - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt",
  "Translators Amalgamated OT+NT/TAHOT Isa-Mal - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt",
] as const;

const GREEK_FILES = [
  "Translators Amalgamated OT+NT/TAGNT Mat-Jhn - Translators Amalgamated Greek NT - STEPBible.org CC-BY.txt",
  "Translators Amalgamated OT+NT/TAGNT Act-Rev - Translators Amalgamated Greek NT - STEPBible.org CC-BY.txt",
] as const;

const STEP_BOOK_ORDER = [
  "Gen", "Exo", "Lev", "Num", "Deu", "Jos", "Jdg", "Rut",
  "1Sa", "2Sa", "1Ki", "2Ki", "1Ch", "2Ch", "Ezr", "Neh",
  "Est", "Job", "Psa", "Pro", "Ecc", "Sng", "Isa", "Jer",
  "Lam", "Ezk", "Dan", "Hos", "Joe", "Amo", "Oba", "Jon",
  "Mic", "Nah", "Hab", "Zep", "Hag", "Zec", "Mal",
  "Mat", "Mrk", "Luk", "Jhn", "Act", "Rom", "1Co", "2Co",
  "Gal", "Eph", "Php", "Col", "1Th", "2Th", "1Ti", "2Ti",
  "Tit", "Phm", "Heb", "Jas", "1Pe", "2Pe", "1Jn", "2Jn",
  "3Jn", "Jud", "Rev",
] as const;

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;

  const content = readFileSync(path, "utf8");

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const match = line.match(
      /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/,
    );
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

function rawUrl(path: string): string {
  const encodedPath = path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `https://raw.githubusercontent.com/${STEP_REPOSITORY}/${STEP_REF}/${encodedPath}`;
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

  const supabase = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data: books, error: booksError } = await supabase
    .from("books")
    .select("id,nome,ordem_canonica")
    .order("ordem_canonica", { ascending: true });

  if (booksError || !books || books.length !== 66) {
    throw new Error(
      `Não foi possível carregar os 66 livros: ${
        booksError?.message || `encontrados ${books?.length ?? 0}`
      }`,
    );
  }

  const bookIdByCode = new Map<string, string>();

  STEP_BOOK_ORDER.forEach((code, index) => {
    const book = books[index];
    if (!book || Number(book.ordem_canonica) !== index + 1) {
      throw new Error(
        `Ordem canônica inesperada na posição ${index + 1}.`,
      );
    }
    bookIdByCode.set(code, String(book.id));
  });

  console.log("Limpando importação linguística anterior...");
  const { error: clearError } = await supabase
    .from("bible_original_words")
    .delete()
    .eq("source", "STEPBible");

  if (clearError) {
    throw new Error(
      `Falha ao limpar importação anterior: ${clearError.message}`,
    );
  }

  type DbRow = {
    book_id: string;
    chapter: number;
    verse: number;
    position: number;
    language: "he" | "grc";
    surface: string;
    transliteration: string | null;
    lemma: string | null;
    strong: string | null;
    strong_extended: string | null;
    morphology: string | null;
    gloss: string | null;
    contextual_translation: string | null;
    is_proper_name: boolean;
    source: string;
    source_ref: string;
    updated_at: string;
  };

  let batch: DbRow[] = [];
  let imported = 0;
  let hebrewCount = 0;
  let greekCount = 0;

  async function flush() {
    if (batch.length === 0) return;

    const current = batch;
    batch = [];

    // O TAHOT pode trazer mais de uma leitura para a mesma posição
    // (por exemplo L/Q). O Postgres não permite que o mesmo UPSERT
    // afete a mesma chave duas vezes no mesmo comando.
    // Mantemos apenas a última leitura da posição dentro do lote;
    // se a mesma posição reaparecer em outro lote, o upsert normal
    // a atualiza sem erro.
    const deduped = Array.from(
      new Map(
        current.map((row) => [
          `${row.book_id}:${row.chapter}:${row.verse}:${row.position}:${row.language}`,
          row,
        ]),
      ).values(),
    );

    const collapsed = current.length - deduped.length;

    const { error } = await supabase
      .from("bible_original_words")
      .upsert(deduped, {
        onConflict:
          "book_id,chapter,verse,position,language",
      });

    if (error) {
      throw new Error(
        `Falha ao gravar lote linguístico: ${error.message}`,
      );
    }

    imported += deduped.length;

    if (collapsed > 0) {
      process.stdout.write(
        `\rImportados: ${imported.toLocaleString("pt-BR")} palavras ` +
          `(${collapsed} leitura(s) paralela(s) consolidadas neste lote)`,
      );
    } else {
      process.stdout.write(
        `\rImportados: ${imported.toLocaleString("pt-BR")} palavras`,
      );
    }
  }

  async function consume(
    file: string,
    parser: (line: string) => ParsedStepWord | null,
  ) {
    console.log(`\nBaixando: ${file.split("/").pop()}`);

    const response = await fetch(rawUrl(file), {
      headers: {
        "User-Agent":
          "biblioteca-estudos-biblicos-step-import",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Falha ao baixar ${file}: HTTP ${response.status}.`,
      );
    }

    const text = await response.text();
    const now = new Date().toISOString();

    for (const line of text.split(/\r?\n/)) {
      const word = parser(line);
      if (!word) continue;

      const bookId = bookIdByCode.get(word.bookCode);
      if (!bookId) {
        throw new Error(
          `Código bíblico desconhecido no STEPBible: ${word.bookCode}`,
        );
      }

      batch.push({
        book_id: bookId,
        chapter: word.chapter,
        verse: word.verse,
        position: word.position,
        language: word.language,
        surface: word.surface,
        transliteration: word.transliteration,
        lemma: word.lemma,
        strong: word.strong,
        strong_extended: word.strongExtended,
        morphology: word.morphology,
        gloss: word.gloss,
        contextual_translation:
          word.contextualTranslation,
        is_proper_name: word.isProperName,
        source: "STEPBible",
        source_ref: STEP_REF,
        updated_at: now,
      });

      if (word.language === "he") {
        hebrewCount += 1;
      } else {
        greekCount += 1;
      }

      if (batch.length >= 750) {
        await flush();
      }
    }

    await flush();
  }

  console.log("Importando Antigo Testamento hebraico (TAHOT)...");
  for (const file of HEBREW_FILES) {
    await consume(file, parseHebrewStepLine);
  }

  console.log("\n\nImportando Novo Testamento grego (TAGNT / TR)...");
  for (const file of GREEK_FILES) {
    await consume(file, parseGreekStepLine);
  }

  const { count, error: auditError } = await supabase
    .from("bible_original_words")
    .select("*", { count: "exact", head: true })
    .eq("source", "STEPBible")
    .eq("source_ref", STEP_REF);

  if (auditError) {
    throw new Error(
      `Falha na auditoria final: ${auditError.message}`,
    );
  }

  console.log("");
  console.log("");
  console.log("ORIGINAIS BIBLICOS IMPORTADOS COM SUCESSO.");
  console.log(
    `Hebraico: ${hebrewCount.toLocaleString("pt-BR")} palavras`,
  );
  console.log(
    `Grego (TR): ${greekCount.toLocaleString("pt-BR")} palavras`,
  );
  console.log(
    `Banco: ${(count ?? 0).toLocaleString("pt-BR")} registros`,
  );
  console.log(`STEPBible ref: ${STEP_REF}`);
  console.log(
    "Licença dos dados linguísticos: CC BY 4.0 — STEPBible / Tyndale House.",
  );
}

main().catch((error) => {
  console.error("");
  console.error(
    error instanceof Error ? error.message : "Erro inesperado.",
  );
  process.exit(1);
});
