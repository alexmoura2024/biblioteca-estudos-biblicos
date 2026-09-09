"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type StudyType = "EXPOSITIVO" | "THEMATIC" | "PANORAMA" | "DOUTRINÁRIO";

const STUDY_TYPES: Array<{ value: StudyType; label: string }> = [
  { value: "EXPOSITIVO", label: "Expositivo" },
  { value: "THEMATIC", label: "Temático" },
  { value: "PANORAMA", label: "Panorama" },
  { value: "DOUTRINÁRIO", label: "Doutrinário" },
];

export default function NovoEstudoPage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    titulo: "",
    autor: "",
    data_origem: "",
    tipo_estudo: "EXPOSITIVO" as StudyType,
    referencia_principal: "",
    resumo: "",
    conteudo: "",
    palavras_chave: "",
  });

  function updateField<K extends keyof typeof form>(
    field: K,
    value: (typeof form)[K]
  ) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSaving(true);

    try {
      const response = await fetch("/api/admin/estudos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = (await response.json()) as {
        id?: string;
        error?: string;
      };

      if (!response.ok || !data.id) {
        setError(data.error || "Não foi possível criar o estudo.");
        return;
      }

      router.push(`/admin/estudos/${data.id}`);
      router.refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Erro inesperado ao criar o estudo."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Link
            href="/admin/estudos"
            className="text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            ← Voltar aos estudos
          </Link>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 sm:p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Novo estudo
            </h1>
            <p className="text-gray-600">
              O estudo será criado como DRAFT e permanecerá invisível ao público
              até passar por REVIEW e publicação.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Título *
              </label>
              <input
                required
                type="text"
                value={form.titulo}
                onChange={(e) => updateField("titulo", e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2"
                placeholder="Título do estudo"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Autor *
                </label>
                <input
                  required
                  type="text"
                  value={form.autor}
                  onChange={(e) => updateField("autor", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2"
                  placeholder="Nome do autor"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Data de origem *
                </label>
                <input
                  required
                  type="date"
                  value={form.data_origem}
                  onChange={(e) => updateField("data_origem", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Tipo de estudo
              </label>
              <select
                value={form.tipo_estudo}
                onChange={(e) =>
                  updateField("tipo_estudo", e.target.value as StudyType)
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-2"
              >
                {STUDY_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Referência bíblica principal
              </label>
              <input
                type="text"
                value={form.referencia_principal}
                onChange={(e) =>
                  updateField("referencia_principal", e.target.value)
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-2"
                placeholder="Ex.: João 3:16 ou Romanos 8:22-23"
              />
              <p className="mt-2 text-xs text-gray-500">
                Opcional ao criar o rascunho, mas obrigatória para enviar para
                REVIEW.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Resumo
              </label>
              <textarea
                rows={4}
                value={form.resumo}
                onChange={(e) => updateField("resumo", e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2"
                placeholder="Resumo do estudo"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Conteúdo integral
              </label>
              <textarea
                rows={16}
                value={form.conteudo}
                onChange={(e) => updateField("conteudo", e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 font-mono text-sm"
                placeholder="Cole ou escreva aqui o estudo completo. Markdown é aceito."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Palavras-chave
              </label>
              <input
                type="text"
                value={form.palavras_chave}
                onChange={(e) => updateField("palavras_chave", e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2"
                placeholder="oração, fé, revelação"
              />
              <p className="mt-2 text-xs text-gray-500">
                Separe as palavras-chave por vírgulas.
              </p>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                {error}
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t border-gray-200">
              <Link
                href="/admin/estudos"
                className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-center font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </Link>

              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 rounded-lg bg-orange-600 px-4 py-3 font-semibold text-white hover:bg-orange-700 disabled:bg-gray-400"
              >
                {isSaving ? "Salvando..." : "Salvar como DRAFT"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
