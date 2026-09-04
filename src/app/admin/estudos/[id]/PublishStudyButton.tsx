"use client";

import { useState } from "react";

export default function PublishStudyButton({
  studyId,
  status,
}: {
  studyId: string;
  status: string;
}) {
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState("");

  if (status !== "REVIEW") {
    return null;
  }

  async function publishStudy() {
    const confirmed = window.confirm(
      "Publicar este estudo agora?\n\nEle passará a PUBLISHED e público. Esta ação tornará o estudo elegível para aparecer no site público."
    );

    if (!confirmed) return;

    setIsPublishing(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/estudos/${studyId}/publish`, {
        method: "POST",
      });

      const data = (await res.json()) as {
        error?: string;
        success?: boolean;
      };

      if (!res.ok) {
        setError(data.error || "Não foi possível publicar.");
        return;
      }

      window.location.href = "/admin/estudos";
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Erro inesperado ao publicar."
      );
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-5">
      <h3 className="font-semibold text-green-900 mb-2">
        Publicação
      </h3>

      <p className="text-sm text-green-800 mb-4">
        Após revisar e salvar todas as alterações, publique este estudo.
      </p>

      <button
        type="button"
        onClick={publishStudy}
        disabled={isPublishing}
        className="w-full rounded-lg bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700 disabled:bg-gray-400"
      >
        {isPublishing ? "Publicando..." : "Publicar estudo"}
      </button>

      {error && (
        <div className="mt-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}
    </div>
  );
}