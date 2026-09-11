"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import type { EditorialGateCheck } from "@/lib/admin/editorialGate";

interface PreviewPassage {
  reference: string;
  relation: "MAIN" | "SECONDARY" | "CITED";
}

interface PreviewData {
  title: string;
  author: string;
  date: string;
  summary: string;
  content: string;
  keywords: string[];
  passages: PreviewPassage[];
  topics: string[];
  characters: string[];
  series: Array<{ name: string; order: number }>;
}

export default function PublishStudyButton({
  studyId,
  status,
  gate,
  reviewApproved,
  preview,
}: {
  studyId: string;
  status: string;
  gate: EditorialGateCheck[];
  reviewApproved: boolean;
  preview: PreviewData;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [action, setAction] = useState<
    "review" | "approve-review" | "draft" | "publish" | null
  >(null);
  const [error, setError] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const isDraft = status === "DRAFT";
  const isReview = status === "REVIEW";
  const gateReady = gate.every((check) => check.pass);

  if (!isDraft && !isReview) {
    return null;
  }

  async function runWorkflowAction(
    nextAction: "review" | "approve-review" | "draft" | "publish",
  ) {
    const confirmations: Record<typeof nextAction, string> = {
      review:
        "Enviar este estudo para REVIEW?\\n\\nSerá criado um snapshot editorial e ele continuará privado.",
      "approve-review":
        "Aprovar esta versão para publicação?\\n\\nSe o estudo for alterado depois, uma nova aprovação será necessária.",
      draft:
        "Retornar este estudo para DRAFT?\\n\\nEle continuará privado e poderá ser editado antes de uma nova revisão.",
      publish:
        "Publicar este estudo agora?\\n\\nEle passará a PUBLISHED e ficará visível no acervo público.",
    };

    if (!window.confirm(confirmations[nextAction])) return;

    setIsSubmitting(true);
    setAction(nextAction);
    setError("");

    try {
      const res = await fetch(
        `/api/admin/estudos/${studyId}/${nextAction}`,
        { method: "POST" },
      );

      const data = (await res.json()) as {
        error?: string;
        success?: boolean;
      };

      if (!res.ok) {
        setError(
          data.error ||
            "Não foi possível concluir a ação editorial.",
        );
        return;
      }

      if (nextAction === "publish") {
        window.location.href = "/admin/estudos?status=PUBLISHED";
        return;
      }

      window.location.href = `/admin/estudos/${studyId}`;
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Erro inesperado no fluxo editorial.",
      );
    } finally {
      setIsSubmitting(false);
      setAction(null);
    }
  }

  return (
    <>
      <div
        className={`mt-6 rounded-xl border p-5 ${
          isDraft
            ? gateReady
              ? "border-blue-200 bg-blue-50"
              : "border-amber-200 bg-amber-50"
            : reviewApproved
              ? "border-green-200 bg-green-50"
              : "border-violet-200 bg-violet-50"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-gray-900">
              {isDraft
                ? gateReady
                  ? "Pronto para REVIEW"
                  : "Gate editorial"
                : reviewApproved
                  ? "Revisão aprovada"
                  : "Revisão pendente de aprovação"}
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              {isDraft
                ? "Confira os requisitos e visualize a pré-publicação antes de enviar."
                : reviewApproved
                  ? "Esta versão está aprovada e pode ser publicada."
                  : "Revise a versão abaixo. Você pode aprovar ou devolver para DRAFT."}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            Pré-publicação
          </button>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {gate.map((check) => (
            <div
              key={check.id}
              className={`rounded-lg border px-3 py-2 ${
                check.pass
                  ? "border-emerald-200 bg-white"
                  : "border-amber-300 bg-white"
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-semibold">
                <span
                  className={
                    check.pass
                      ? "text-emerald-700"
                      : "text-amber-700"
                  }
                >
                  {check.pass ? "✓" : "○"}
                </span>
                <span className="text-gray-900">{check.label}</span>
              </div>
              <p className="mt-1 text-[11px] leading-4 text-gray-500">
                {check.detail}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          {isDraft && (
            <button
              type="button"
              onClick={() => runWorkflowAction("review")}
              disabled={!gateReady || isSubmitting}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-gray-400"
            >
              {action === "review"
                ? "Enviando..."
                : "Enviar para REVIEW"}
            </button>
          )}

          {isReview && (
            <>
              <button
                type="button"
                onClick={() => runWorkflowAction("draft")}
                disabled={isSubmitting}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {action === "draft"
                  ? "Retornando..."
                  : "Voltar para DRAFT"}
              </button>

              {!reviewApproved ? (
                <button
                  type="button"
                  onClick={() =>
                    runWorkflowAction("approve-review")
                  }
                  disabled={!gateReady || isSubmitting}
                  className="flex-1 rounded-lg bg-violet-600 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-700 disabled:bg-gray-400"
                >
                  {action === "approve-review"
                    ? "Aprovando..."
                    : "Aprovar revisão"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => runWorkflowAction("publish")}
                  disabled={!gateReady || isSubmitting}
                  className="flex-1 rounded-lg bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:bg-gray-400"
                >
                  {action === "publish"
                    ? "Publicando..."
                    : "Publicar estudo"}
                </button>
              )}
            </>
          )}
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}
      </div>

      {showPreview && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label="Pré-publicação do estudo"
        >
          <div className="w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-700">
                  Pré-publicação
                </p>
                <h2 className="mt-1 text-xl font-bold text-gray-950">
                  {preview.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Fechar
              </button>
            </div>

            <div className="space-y-6 p-5 sm:p-8">
              <div className="grid gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:grid-cols-3">
                <div>
                  <p className="text-[10px] font-bold uppercase text-gray-400">
                    Autor
                  </p>
                  <p className="mt-1 text-sm text-gray-800">
                    {preview.author}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-gray-400">
                    Data
                  </p>
                  <p className="mt-1 text-sm text-gray-800">
                    {preview.date}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-gray-400">
                    Referências
                  </p>
                  <p className="mt-1 text-sm text-gray-800">
                    {preview.passages.length}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  Resumo
                </h3>
                <p className="mt-2 text-sm leading-6 text-gray-700">
                  {preview.summary}
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-4">
                <PreviewList
                  title="Referências"
                  items={preview.passages.map(
                    (item) =>
                      `${item.relation}: ${item.reference}`,
                  )}
                />
                <PreviewList title="Temas" items={preview.topics} />
                <PreviewList
                  title="Personagens"
                  items={preview.characters}
                />
                <PreviewList
                  title="Séries"
                  items={preview.series.map(
                    (item) => `${item.name} #${item.order}`,
                  )}
                />
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h3 className="mb-4 text-sm font-bold text-gray-900">
                  Conteúdo
                </h3>
                <article className="prose prose-stone max-w-none">
                  <ReactMarkdown>{preview.content}</ReactMarkdown>
                </article>
              </div>

              {preview.keywords.length > 0 && (
                <div className="flex flex-wrap gap-2 border-t border-gray-200 pt-5">
                  {preview.keywords.map((keyword) => (
                    <span
                      key={keyword}
                      className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function PreviewList({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div>
      <h4 className="text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400">
        {title}
      </h4>
      {items.length === 0 ? (
        <p className="mt-2 text-xs text-gray-400">Nenhum</p>
      ) : (
        <div className="mt-2 space-y-1">
          {items.map((item) => (
            <p key={item} className="text-xs leading-5 text-gray-700">
              • {item}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
