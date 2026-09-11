import { createClient } from "@supabase/supabase-js";
import type { OriginalWord } from "./originalTypes";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function getOriginalWordsForChapter(
  bookId: string,
  chapter: number,
): Promise<OriginalWord[]> {
  const supabase = adminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("bible_original_words")
    .select(
      "id,verse,position,language,surface,transliteration,lemma,strong,strong_extended,morphology,gloss,contextual_translation,is_proper_name",
    )
    .eq("book_id", bookId)
    .eq("chapter", chapter)
    .order("verse", { ascending: true })
    .order("position", { ascending: true });

  if (error || !data) {
    if (error) {
      console.error(
        "Erro ao carregar dados bíblicos originais:",
        error,
      );
    }
    return [];
  }

  return data.map((item) => ({
    id: String(item.id),
    verse: Number(item.verse),
    position: Number(item.position),
    language:
      item.language === "grc" ? "grc" : "he",
    surface: String(item.surface),
    transliteration:
      typeof item.transliteration === "string"
        ? item.transliteration
        : null,
    lemma:
      typeof item.lemma === "string" ? item.lemma : null,
    strong:
      typeof item.strong === "string" ? item.strong : null,
    strongExtended:
      typeof item.strong_extended === "string"
        ? item.strong_extended
        : null,
    morphology:
      typeof item.morphology === "string"
        ? item.morphology
        : null,
    gloss:
      typeof item.gloss === "string" ? item.gloss : null,
    contextualTranslation:
      typeof item.contextual_translation === "string"
        ? item.contextual_translation
        : null,
    isProperName: Boolean(item.is_proper_name),
  }));
}
