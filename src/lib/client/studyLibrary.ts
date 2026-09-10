export interface StudyLibraryItem {
  slug: string;
  title: string;
  summary: string;
  reference?: string;
}

export interface StoredStudyLibraryItem extends StudyLibraryItem {
  storedAt: string;
}

const FAVORITES_KEY = "biblioteca-estudos:favorites:v1";
const HISTORY_KEY = "biblioteca-estudos:history:v1";
const MAX_HISTORY_ITEMS = 50;

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readItems(key: string): StoredStudyLibraryItem[] {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item): item is StoredStudyLibraryItem =>
        Boolean(
          item &&
            typeof item.slug === "string" &&
            typeof item.title === "string" &&
            typeof item.summary === "string" &&
            typeof item.storedAt === "string",
        ),
    );
  } catch {
    return [];
  }
}

function writeItems(key: string, items: StoredStudyLibraryItem[]) {
  if (!canUseStorage()) return;

  try {
    window.localStorage.setItem(key, JSON.stringify(items));
    window.dispatchEvent(new Event("study-library-updated"));
  } catch {
    // Storage may be unavailable or full. Reading the study must keep working.
  }
}

function withTimestamp(item: StudyLibraryItem): StoredStudyLibraryItem {
  return {
    ...item,
    storedAt: new Date().toISOString(),
  };
}

export function getFavoriteStudies(): StoredStudyLibraryItem[] {
  return readItems(FAVORITES_KEY);
}

export function isStudyFavorite(slug: string): boolean {
  return getFavoriteStudies().some((item) => item.slug === slug);
}

export function toggleStudyFavorite(item: StudyLibraryItem): boolean {
  const favorites = getFavoriteStudies();
  const exists = favorites.some((favorite) => favorite.slug === item.slug);

  if (exists) {
    writeItems(
      FAVORITES_KEY,
      favorites.filter((favorite) => favorite.slug !== item.slug),
    );
    return false;
  }

  writeItems(FAVORITES_KEY, [
    withTimestamp(item),
    ...favorites.filter((favorite) => favorite.slug !== item.slug),
  ]);

  return true;
}

export function removeStudyFavorite(slug: string) {
  writeItems(
    FAVORITES_KEY,
    getFavoriteStudies().filter((item) => item.slug !== slug),
  );
}

export function getStudyHistory(): StoredStudyLibraryItem[] {
  return readItems(HISTORY_KEY);
}

export function recordStudyHistory(item: StudyLibraryItem) {
  const history = getStudyHistory();

  writeItems(
    HISTORY_KEY,
    [
      withTimestamp(item),
      ...history.filter((entry) => entry.slug !== item.slug),
    ].slice(0, MAX_HISTORY_ITEMS),
  );
}

export function clearStudyHistory() {
  writeItems(HISTORY_KEY, []);
}