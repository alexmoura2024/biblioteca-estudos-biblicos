export type AdminStudyStatus =
  | "ALL"
  | "PUBLISHED"
  | "REVIEW"
  | "DRAFT";

export function normalizeAdminStudySearch(value?: string): string {
  return (value ?? "")
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

export function buildAdminStudySearchFilter(
  searchQuery: string,
): string | null {
  if (!searchQuery) return null;

  const pattern = `%${searchQuery}%`;

  return [
    `titulo.ilike.${pattern}`,
    `resumo.ilike.${pattern}`,
    `conteudo.ilike.${pattern}`,
  ].join(",");
}

export function buildAdminStudyFilterHref(
  status: AdminStudyStatus,
  searchQuery: string,
): string {
  const params = new URLSearchParams();

  if (status !== "ALL") {
    params.set("status", status);
  }

  if (searchQuery) {
    params.set("q", searchQuery);
  }

  const queryString = params.toString();
  return queryString
    ? `/admin/estudos?${queryString}`
    : "/admin/estudos";
}