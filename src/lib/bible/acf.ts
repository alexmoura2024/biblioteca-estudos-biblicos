import { createBibleAdminClient } from "./serverAdmin";

export const PRIVATE_ACF_CODE = "acf-private";

export interface PrivateBibleVerse {
  verse: number;
  text: string;
}

export interface PrivateBibleChapter {
  versionName: string;
  copyrightNotice: string;
  privateUseOnly: boolean;
  verses: PrivateBibleVerse[];
}

export function bibleTextEnabled(): boolean {
  return process.env.BIBLE_TEXT_ENABLED?.trim().toLowerCase() === "true";
}

export async function getPrivateAcfChapter(
  bookId: string,
  chapter: number,
): Promise<PrivateBibleChapter | null> {
  if (!bibleTextEnabled()) return null;

  const supabase = createBibleAdminClient();
  if (!supabase) return null;

  const { data: version, error: versionError } = await supabase
    .from("bible_versions")
    .select("id,name,private_use_only,copyright_notice")
    .eq("code", PRIVATE_ACF_CODE)
    .maybeSingle();

  if (versionError || !version) return null;

  const { data: verses, error: versesError } = await supabase
    .from("bible_verses")
    .select("verse,text")
    .eq("version_id", version.id)
    .eq("book_id", bookId)
    .eq("chapter", chapter)
    .order("verse", { ascending: true });

  if (versesError || !verses || verses.length === 0) return null;

  return {
    versionName: version.name as string,
    copyrightNotice: (version.copyright_notice as string) || "",
    privateUseOnly: Boolean(version.private_use_only),
    verses: verses.map((item) => ({
      verse: Number(item.verse),
      text: String(item.text),
    })),
  };
}
