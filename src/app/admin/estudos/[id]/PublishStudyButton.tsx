"use client";

import { useState } from "react";

export default function PublishStudyButton({
  studyId,
  status,
}: {
  studyId: string;
  status: string;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isDraft = status === "DRAFT";
  const isReview = status === "REVIEW";

  if (!isDraft && !isReview) {
    return null;
  }

  async function advanceWorkflow() {
    const endpoint = isDraft ? "review" : "publish";
    const confirmation = isDraft
      ? "Enviar este estudo para revisão?\n\nO status passará de DRAFT para REVIEW. Ele continuará invisível ao público."
      : "Publicar este estudo agora?\n\nEle passará a PUBLISHED e público. Esta ação tornará o estudo elegível para aparecer no site público.";

    const confirmed = window.confirm(confirmation);
    if (!confirmed) return;

    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/estudos/${studyId}/${endpoint}`, {
        method: "POST",
      });

      const data = (await res.json()) as {
        error?: string;
        success?: boolean;
      };

      if (!res.ok) {
        setError(
          data.error ||
            (isDraft
              ? "Não foi possível enviar para revisão."
              : "Não foi possível publicar.")
        );
        return;
      }

      window.location.href = isDraft
        ? `/admin/estudos/${studyId}`
        : "/admin/estudos?status=PUBLISHED";
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Erro inesperado ao avançar o fluxo editorial."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className={`mt-6 rounded-lg border p-5 ${
        isDraft
          ? "border-blue-200 bg-blue-50"
          : "border-green-200 bg-green-50"
      }`}
    >
      <h3
        className={`font-semibold mb-2 ${
          isDraft ? "text-blue-900" : "text-green-900"
        }`}
      >
        {isDraft ? "Enviar para revisão" : "Publicação"}
      </h3>

      <p
        className={`text-sm mb-4 ${
          isDraft ? "text-blue-800" : "text-green-800"
        }`}
      >
        {isDraft
          ? "Após completar e salvar o rascunho, envie o estudo para REVIEW. Ele continuará privado."
          : "Após revisar e salvar todas as alterações, publique este estudo."}
      </p>

      <button
        type="button"
        onClick={advanceWorkflow}
        disabled={isSubmitting}
        className={`w-full rounded-lg px-4 py-3 font-semibold text-white disabled:bg-gray-400 ${
          isDraft
            ? "bg-blue-600 hover:bg-blue-700"
            : "bg-green-600 hover:bg-green-700"
        }`}
      >
        {isSubmitting
          ? isDraft
            ? "Enviando..."
            : "Publicando..."
          : isDraft
            ? "Enviar para revisão"
            : "Publicar estudo"}
      </button>

      {error && (
        <div className="mt-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}
    </div>
  );
}
