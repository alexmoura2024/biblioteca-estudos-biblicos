/**
 * Pré-visualização Editorial — Listagem de Estudos
 * Acesso: http://localhost:3000/admin/estudos
 * Mostra REVIEW + DRAFT para revisão editorial (não público)
 */

import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

interface Study {
  id: string;
  titulo: string;
  slug: string;
  status: "DRAFT" | "REVIEW" | "PUBLISHED" | "ARCHIVED";
  data_origem: string;
}

async function getStudies() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Permite o deploy público antes da configuração do Supabase de produção.
  if (!supabaseUrl || !serviceRoleKey) {
    return [];
  }

  const supabase = createClient(
    supabaseUrl,
    serviceRoleKey,
    { auth: { persistSession: false } }
  );

  // Buscar estudos REAIS (não mocks)
  // Mocks são do protótipo fase 2 (autor = "[Fase 2 - Prototipo]" ou similar)
  // Reais têm autor = "[Fase 1 - Lote 01]", "[Ingestão...]" etc
  const { data, error } = await supabase
    .from("studies")
    .select("id, titulo, slug, status, data_origem, autor")
    .in("status", ["DRAFT", "REVIEW"])
    .not("autor", "ilike", "%Prototipo%") // Excluir mocks
    .order("data_origem", { ascending: false });

  if (error) {
    console.error("Erro ao buscar estudos:", error);
    return [];
  }

  return data as Study[];
}

export default async function AdminEstudosPage() {
  const studies = await getStudies();

  const reviewCount = studies.filter((s) => s.status === "REVIEW").length;
  const draftCount = studies.filter((s) => s.status === "DRAFT").length;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Cabeçalho */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Pré-visualização Editorial
          </h1>
          <p className="text-gray-600">
            Revisão de estudos em REVIEW e DRAFT
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm text-blue-600 font-medium">Em Revisão</div>
            <div className="text-2xl font-bold text-blue-900">{reviewCount}</div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="text-sm text-amber-600 font-medium">Rascunho</div>
            <div className="text-2xl font-bold text-amber-900">{draftCount}</div>
          </div>
        </div>

        {/* Listagem */}
        {studies.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-600">Nenhum estudo em revisão no momento.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">
                    Título
                  </th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">
                    Status
                  </th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">
                    Data
                  </th>
                  <th className="text-center px-6 py-3 text-sm font-semibold text-gray-900">
                    Ação
                  </th>
                </tr>
              </thead>
              <tbody>
                {studies.map((study) => (
                  <tr
                    key={study.id}
                    className="border-b border-gray-200 hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {study.titulo}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          study.status === "REVIEW"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {study.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {study.data_origem && study.data_origem !== "1969-12-31"
                        ? new Date(study.data_origem).toLocaleDateString(
                            "pt-BR"
                          )
                        : "Sem data"}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Link
                        href={`/admin/estudos/${study.id}`}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Visualizar
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
