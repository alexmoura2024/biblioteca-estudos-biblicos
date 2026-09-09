/**
 * Pré-visualização Editorial — Listagem de Estudos
 * Acesso: http://localhost:3000/admin/estudos
 * Permite filtrar estudos por status editorial.
 */

import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface Study {
  id: string;
  titulo: string;
  slug: string;
  status: "DRAFT" | "REVIEW" | "PUBLISHED" | "ARCHIVED";
  data_origem: string;
  updated_at: string;
}

type StatusFilter = "ALL" | "PUBLISHED" | "REVIEW" | "DRAFT";

interface PageProps {
  searchParams?:
    | Promise<{ status?: string }>
    | { status?: string };
}

async function getStudies() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return [];
  }

  const supabase = createClient(
    supabaseUrl,
    serviceRoleKey,
    { auth: { persistSession: false } }
  );

  const { data, error } = await supabase
    .from("studies")
    .select("id, titulo, slug, status, data_origem, updated_at, autor")
    .in("status", ["DRAFT", "REVIEW", "PUBLISHED"])
    .not("autor", "ilike", "%Prototipo%")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Erro ao buscar estudos:", error);
    return [];
  }

  return data as Study[];
}

function normalizeStatus(status?: string): StatusFilter {
  if (
    status === "PUBLISHED" ||
    status === "REVIEW" ||
    status === "DRAFT"
  ) {
    return status;
  }

  return "ALL";
}

function statusBadgeClass(status: Study["status"]) {
  switch (status) {
    case "PUBLISHED":
      return "bg-green-100 text-green-800";
    case "REVIEW":
      return "bg-blue-100 text-blue-800";
    case "DRAFT":
      return "bg-amber-100 text-amber-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export default async function AdminEstudosPage({ searchParams }: PageProps) {
  const studies = await getStudies();
  const params = searchParams ? await searchParams : {};
  const activeStatus = normalizeStatus(params.status);

  const counts: Record<StatusFilter, number> = {
    ALL: studies.length,
    PUBLISHED: studies.filter((s) => s.status === "PUBLISHED").length,
    REVIEW: studies.filter((s) => s.status === "REVIEW").length,
    DRAFT: studies.filter((s) => s.status === "DRAFT").length,
  };

  const filteredStudies =
    activeStatus === "ALL"
      ? studies
      : studies.filter((s) => s.status === activeStatus);

  const filters: Array<{
    value: StatusFilter;
    label: string;
  }> = [
    { value: "ALL", label: "Todos" },
    { value: "PUBLISHED", label: "Publicados" },
    { value: "REVIEW", label: "Review" },
    { value: "DRAFT", label: "Draft" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Cabeçalho */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Pré-visualização Editorial
            </h1>
            <p className="text-gray-600">
              Gerencie e filtre os estudos por status editorial.
            </p>
          </div>

          <Link
            href="/admin/estudos/novo"
            className="inline-flex items-center justify-center rounded-lg bg-orange-600 px-5 py-3 text-sm font-semibold text-white hover:bg-orange-700"
          >
            + Novo estudo
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-sm text-green-700 font-medium">Publicados</div>
            <div className="text-2xl font-bold text-green-900">
              {counts.PUBLISHED}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm text-blue-600 font-medium">Em Revisão</div>
            <div className="text-2xl font-bold text-blue-900">
              {counts.REVIEW}
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="text-sm text-amber-600 font-medium">Rascunhos</div>
            <div className="text-2xl font-bold text-amber-900">
              {counts.DRAFT}
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2 mb-6">
          {filters.map((filter) => {
            const active = activeStatus === filter.value;
            const href =
              filter.value === "ALL"
                ? "/admin/estudos"
                : `/admin/estudos?status=${filter.value}`;

            return (
              <Link
                key={filter.value}
                href={href}
                className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span>{filter.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    active
                      ? "bg-white/20 text-white"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {counts[filter.value]}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Listagem */}
        {filteredStudies.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-600">
              Nenhum estudo encontrado para este filtro.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">
                    Título
                  </th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">
                    Status
                  </th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">
                    Atualizado
                  </th>
                  <th className="text-center px-6 py-3 text-sm font-semibold text-gray-900">
                    Ação
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredStudies.map((study) => (
                  <tr
                    key={study.id}
                    className="border-b border-gray-200 hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {study.titulo}
                    </td>

                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${statusBadgeClass(
                          study.status
                        )}`}
                      >
                        {study.status}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-600">
                      {study.updated_at
                        ? new Intl.DateTimeFormat("pt-BR", {
                            dateStyle: "short",
                            timeStyle: "short",
                            timeZone: "America/Sao_Paulo",
                          }).format(new Date(study.updated_at))
                        : "Sem atualização"}
                    </td>

                    <td className="px-6 py-4 text-center">
                      <Link
                        href={`/admin/estudos/${study.id}`}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        {study.status === "PUBLISHED"
                          ? "Revisar / Editar"
                          : "Visualizar / Editar"}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            ⚠️ Área administrativa. REVIEW e DRAFT permanecem invisíveis ao público.
          </p>
        </div>
      </div>
    </div>
  );
}
