/**
 * Pré-visualização Editorial — Detalhes do Estudo
 * Acesso: http://localhost:3000/admin/estudos/[id]
 * Mostra conteúdo integral de REVIEW/DRAFT + modo edição
 */

import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { notFound } from "next/navigation";
import EditStudyClient from "./EditStudyClient";
import PublishStudyButton from "./PublishStudyButton";

interface Study {
  id: string;
  titulo: string;
  slug: string;
  status: "DRAFT" | "REVIEW" | "PUBLISHED" | "ARCHIVED";
  resumo: string;
  conteudo: string;
  tipo_estudo: "EXPOSITIVO" | "THEMATIC" | "PANORAMA" | "DOUTRINÁRIO";
  data_origem: string;
  autor: string;
  palavras_chave: string[];
}

interface TopicAssociation {
  topic_id: string;
  nome: string;
  peso: number;
}

interface CharacterAssociation {
  character_id: string;
  nome: string;
  papel: string;
}

interface PassageData {
  passage_id: string;
  referencia_normalizada: string;
  tipo_relacao: "MAIN" | "SECONDARY" | "CITED";
}


async function getStudy(id: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    { auth: { persistSession: false } }
  );

  const { data, error } = await supabase
    .from("studies")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as Study;
}

async function getPassages(studyId: string): Promise<PassageData[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    { auth: { persistSession: false } }
  );

  const { data, error } = await supabase
    .from("study_passages")
    .select(
      `
      passage_id,
      tipo_relacao,
      passages (referencia_normalizada)
    `
    )
    .eq("study_id", studyId)
    .order("tipo_relacao", { ascending: true });

  if (error) return [];
  return data.map((p: Record<string, unknown>) => ({
    passage_id: (p.passage_id as string) || "",
    tipo_relacao: ((p.tipo_relacao as string) || "CITED") as "MAIN" | "SECONDARY" | "CITED",
    referencia_normalizada:
      ((p.passages as Record<string, unknown>)?.referencia_normalizada as string) ||
      "desconhecida",
  }));
}

async function getTopics(studyId: string): Promise<TopicAssociation[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    { auth: { persistSession: false } }
  );

  const { data, error } = await supabase
    .from("study_topics")
    .select("topic_id, peso, topics (id, nome)")
    .eq("study_id", studyId);

  if (error) return [];
  return data
    .map((t: Record<string, unknown>) => ({
      topic_id: (t.topic_id as string) || "",
      nome: ((t.topics as Record<string, unknown>)?.nome as string) || "",
      peso: (t.peso as number) || 1,
    }))
    .filter((t) => t.nome);
}

async function getCharacters(studyId: string): Promise<CharacterAssociation[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    { auth: { persistSession: false } }
  );

  const { data, error } = await supabase
    .from("study_characters")
    .select("character_id, papel, characters (id, nome)")
    .eq("study_id", studyId);

  if (error) return [];
  return data
    .map((c: Record<string, unknown>) => ({
      character_id: (c.character_id as string) || "",
      nome: ((c.characters as Record<string, unknown>)?.nome as string) || "",
      papel: (c.papel as string) || "mencionado",
    }))
    .filter((c) => c.nome);
}

export default async function AdminEstudoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const study = await getStudy(id);

  if (!study) {
    notFound();
  }

  const passages = await getPassages(id);
  const topics = await getTopics(id);
  const characters = await getCharacters(id);

  const statusColor =
    study.status === "REVIEW"
      ? "bg-blue-100 text-blue-800"
      : "bg-amber-100 text-amber-800";

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Cabeçalho com voltar */}
        <div className="mb-8">
          <Link
            href="/admin/estudos"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium mb-4"
          >
            ← Voltar aos estudos
          </Link>

          <div className="bg-white rounded-lg border border-gray-200 p-8">
            {/* Título e Status */}
            <div className="mb-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <h1 className="text-3xl font-bold text-gray-900 flex-1">
                  {study.titulo}
                </h1>
                <span
                  className={`inline-block px-3 py-1 rounded text-sm font-medium whitespace-nowrap ${statusColor}`}
                >
                  {study.status}
                </span>
              </div>
              <p className="text-gray-600 text-sm">
                Criado em {new Date(study.data_origem).toLocaleDateString(
                  "pt-BR"
                )} • Por {study.autor}
              </p>
            </div>

            {/* Referências Principais */}
            {passages.length > 0 && (
              <div className="mb-6 pb-6 border-b border-gray-200">
                <h2 className="text-sm font-semibold text-gray-900 mb-3">
                  Referências Bíblicas
                </h2>
                <div className="space-y-2">
                  {passages.map((p, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-sm text-gray-700"
                    >
                      <span className="inline-block w-24 text-xs font-medium text-gray-500">
                        {p.tipo_relacao === "MAIN"
                          ? "Principal"
                          : p.tipo_relacao === "SECONDARY"
                            ? "Secundária"
                            : "Citada"}
                      </span>
                      <span>{p.referencia_normalizada}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Temas e Personagens */}
            <div className="grid grid-cols-2 gap-6 mb-6 pb-6 border-b border-gray-200">
              {topics.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">
                    Temas ({topics.length})
                  </h3>
                  <div className="space-y-1">
                    {topics.map((t, i) => (
                      <div key={i} className="text-sm text-gray-700">
                        • {t.nome}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {characters.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">
                    Personagens ({characters.length})
                  </h3>
                  <div className="space-y-1">
                    {characters.map((c, i) => (
                      <div key={i} className="text-sm text-gray-700">
                        • {c.nome}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modo Edição Editorial */}
            <div className="mb-8 pb-8 border-b border-gray-200">
              <EditStudyClient
                study={study}
                passages={passages}
                topics={topics}
                characters={characters}
              />

              <PublishStudyButton
                studyId={study.id}
                status={study.status}
              />
            </div>

            {/* Meta */}
            <div className="mt-8 pt-8 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                ID: {study.id} • Slug: {study.slug}
              </p>
              {study.palavras_chave.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-medium text-gray-600 mb-2">
                    Palavras-chave:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {study.palavras_chave.map((kw, i) => (
                      <span
                        key={i}
                        className="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            ⚠️ Esta é uma área administrativa. Este estudo ({study.status})
            não é visível publicamente.
          </p>
        </div>
      </div>
    </div>
  );
}
