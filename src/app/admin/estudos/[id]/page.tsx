/**
 * Pré-visualização Editorial — Detalhes do Estudo
 * Acesso: http://localhost:3000/admin/estudos/[id]
 * Mostra conteúdo integral + modo edição editorial.
 */

import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { notFound } from "next/navigation";
import EditStudyClient from "./EditStudyClient";
import PublishStudyButton from "./PublishStudyButton";
import {
  evaluateEditorialGate,
} from "@/lib/admin/editorialGate";

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

interface AvailableTopic {
  topic_id: string;
  nome: string;
}

interface CharacterAssociation {
  character_id: string;
  nome: string;
  papel: string;
}

interface SeriesAssociation {
  series_id: string;
  nome: string;
  ordem: number;
}

interface PassageData {
  passage_id: string;
  referencia_normalizada: string;
  tipo_relacao: "MAIN" | "SECONDARY" | "CITED";
}

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    { auth: { persistSession: false } }
  );
}

async function getStudy(id: string) {
  const supabase = adminClient();

  const { data, error } = await supabase
    .from("studies")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as Study;
}

async function getPassages(studyId: string): Promise<PassageData[]> {
  const supabase = adminClient();

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

  return (data || []).map((p: Record<string, unknown>) => ({
    passage_id: (p.passage_id as string) || "",
    tipo_relacao: ((p.tipo_relacao as string) || "CITED") as
      | "MAIN"
      | "SECONDARY"
      | "CITED",
    referencia_normalizada:
      ((p.passages as Record<string, unknown>)
        ?.referencia_normalizada as string) || "desconhecida",
  }));
}

async function getTopics(
  studyId: string
): Promise<TopicAssociation[]> {
  const supabase = adminClient();

  const { data, error } = await supabase
    .from("study_topics")
    .select("topic_id, peso, topics (id, nome)")
    .eq("study_id", studyId);

  if (error) return [];

  return (data || [])
    .map((t: Record<string, unknown>) => ({
      topic_id: (t.topic_id as string) || "",
      nome:
        ((t.topics as Record<string, unknown>)?.nome as string) ||
        "",
      peso: (t.peso as number) || 1,
    }))
    .filter((t) => t.nome);
}

async function getAvailableTopics(): Promise<AvailableTopic[]> {
  const supabase = adminClient();

  const { data, error } = await supabase
    .from("topics")
    .select("id,nome")
    .order("nome", { ascending: true });

  if (error) {
    console.error("Erro ao carregar taxonomia de temas:", error);
    return [];
  }

  return (data || []).map((topic) => ({
    topic_id: topic.id as string,
    nome: topic.nome as string,
  }));
}

async function getCharacters(
  studyId: string
): Promise<CharacterAssociation[]> {
  const supabase = adminClient();

  const { data, error } = await supabase
    .from("study_characters")
    .select("character_id, papel, characters (id, nome)")
    .eq("study_id", studyId);

  if (error) return [];

  return (data || [])
    .map((c: Record<string, unknown>) => ({
      character_id: (c.character_id as string) || "",
      nome:
        ((c.characters as Record<string, unknown>)?.nome as string) ||
        "",
      papel: (c.papel as string) || "mencionado",
    }))
    .filter((c) => c.nome);
}

async function getSeries(
  studyId: string
): Promise<SeriesAssociation[]> {
  const supabase = adminClient();

  const { data, error } = await supabase
    .from("study_series")
    .select("series_id, ordem, series (id, nome)")
    .eq("study_id", studyId)
    .order("ordem", { ascending: true });

  if (error) return [];

  return (data || [])
    .map((item: Record<string, unknown>) => ({
      series_id: (item.series_id as string) || "",
      nome:
        ((item.series as Record<string, unknown>)?.nome as string) ||
        "",
      ordem: (item.ordem as number) || 1,
    }))
    .filter((item) => item.nome);
}

async function getReviewApprovalState(studyId: string) {
  const supabase = adminClient();

  const { data, error } = await supabase
    .from("study_edits")
    .select("created_at,campos_alterados")
    .eq("study_id", studyId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return { approved: false };
  }

  const records = (data || []) as Array<{
    created_at: string;
    campos_alterados: string[] | null;
  }>;

  const snapshot = records.find((record) =>
    (record.campos_alterados || []).includes("review_snapshot"),
  );

  if (!snapshot) return { approved: false };

  const snapshotTime = new Date(snapshot.created_at).getTime();

  const approval = records.find((record) => {
    const fields = record.campos_alterados || [];
    return (
      fields.includes("review_approved") &&
      new Date(record.created_at).getTime() >= snapshotTime
    );
  });

  if (!approval) return { approved: false };

  const approvalTime = new Date(approval.created_at).getTime();
  const invalidated = records.some((record) => {
    const fields = record.campos_alterados || [];
    return (
      new Date(record.created_at).getTime() > approvalTime &&
      !fields.includes("review_approved")
    );
  });

  return { approved: !invalidated };
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

  const [
    passages,
    topics,
    availableTopics,
    characters,
    series,
    reviewState,
  ] = await Promise.all([
    getPassages(id),
    getTopics(id),
    getAvailableTopics(),
    getCharacters(id),
    getSeries(id),
    getReviewApprovalState(id),
  ]);

  const gate = evaluateEditorialGate({
    titulo: study.titulo,
    autor: study.autor,
    data_origem: study.data_origem,
    resumo: study.resumo,
    conteudo: study.conteudo,
    palavras_chave: study.palavras_chave || [],
    passages,
  });

  const statusColor =
    study.status === "PUBLISHED"
      ? "bg-green-100 text-green-800"
      : study.status === "REVIEW"
        ? "bg-blue-100 text-blue-800"
        : study.status === "DRAFT"
          ? "bg-amber-100 text-amber-800"
          : "bg-gray-100 text-gray-800";

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link
            href="/admin/estudos"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium mb-4"
          >
            ← Voltar aos estudos
          </Link>

          <div className="bg-white rounded-lg border border-gray-200 p-8">
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
                Criado em{" "}
                {new Date(study.data_origem).toLocaleDateString(
                  "pt-BR"
                )}{" "}
                • Por {study.autor}
              </p>
            </div>

            {passages.length > 0 && (
              <div className="mb-6 pb-6 border-b border-gray-200">
                <h2 className="text-sm font-semibold text-gray-900 mb-3">
                  Referências Bíblicas
                </h2>

                <div className="space-y-2">
                  {passages.map((p) => (
                    <div
                      key={p.passage_id}
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6 pb-6 border-b border-gray-200">
              {topics.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">
                    Temas ({topics.length})
                  </h3>
                  <div className="space-y-1">
                    {topics.map((t) => (
                      <div
                        key={t.topic_id}
                        className="text-sm text-gray-700"
                      >
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
                    {characters.map((c) => (
                      <div
                        key={c.character_id}
                        className="text-sm text-gray-700"
                      >
                        • {c.nome}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {series.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">
                    Séries ({series.length})
                  </h3>
                  <div className="space-y-1">
                    {series.map((item) => (
                      <div
                        key={item.series_id}
                        className="text-sm text-gray-700"
                      >
                        • {item.nome}{" "}
                        <span className="text-xs text-gray-400">
                          #{item.ordem}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mb-8 pb-8 border-b border-gray-200">
              <EditStudyClient
                study={study}
                passages={passages}
                topics={topics}
                availableTopics={availableTopics}
                characters={characters}
              />

              <PublishStudyButton
                studyId={study.id}
                status={study.status}
                gate={gate}
                reviewApproved={reviewState.approved}
                preview={{
                  title: study.titulo,
                  author: study.autor,
                  date: study.data_origem,
                  summary: study.resumo,
                  content: study.conteudo,
                  keywords: study.palavras_chave || [],
                  passages: passages.map((passage) => ({
                    reference: passage.referencia_normalizada,
                    relation: passage.tipo_relacao,
                  })),
                  topics: topics.map((topic) => topic.nome),
                  characters: characters.map(
                    (character) => character.nome,
                  ),
                  series: series.map((item) => ({
                    name: item.nome,
                    order: item.ordem,
                  })),
                }}
              />
            </div>

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

        <div className="text-center">
          <p className="text-xs text-gray-500">
            ⚠️ Área administrativa. DRAFT e REVIEW não são visíveis
            publicamente.
          </p>
        </div>
      </div>
    </div>
  );
}
