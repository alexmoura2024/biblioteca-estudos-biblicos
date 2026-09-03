"use client";

import { useState, useTransition } from "react";

interface EditStudyClientProps {
  study: {
    id: string;
    titulo: string;
    resumo: string;
    conteudo: string;
    status: string;
    autor: string;
    data_origem: string;
  };
}

export default function EditStudyClient({ study }: EditStudyClientProps) {
  const [editMode, setEditMode] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isSaving, startTransition] = useTransition();

  const [formData, setFormData] = useState({
    titulo: study.titulo,
    resumo: study.resumo,
    conteudo: study.conteudo,
  });

  const [savedMessage, setSavedMessage] = useState("");
  const [error, setError] = useState("");
  const [history, setHistory] = useState<any[]>([]);

  const handleChange = (
    field: "titulo" | "resumo" | "conteudo",
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/estudos/${study.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (!res.ok) {
          const errData = await res.json();
          setError(errData.error || "Erro ao salvar");
          return;
        }

        const result = await res.json();
        setSavedMessage(
          `Alterações salvas: ${result.changed.join(", ") || "nenhuma mudança"}`
        );
        setError("");
        setEditMode(false);

        // Limpar mensagem após 3s
        setTimeout(() => setSavedMessage(""), 3000);

        // Recarregar histórico se ativado
        if (showHistory) loadHistory();
      } catch (e) {
        setError(`Erro: ${(e as any).message}`);
      }
    });
  };

  const loadHistory = async () => {
    try {
      const res = await fetch(`/api/admin/estudos/${study.id}/history`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.edits || []);
      }
    } catch (e) {
      console.error("Erro ao carregar histórico:", e);
    }
  };

  const toggleHistory = () => {
    if (!showHistory) {
      loadHistory();
    }
    setShowHistory(!showHistory);
  };

  const handleCancel = () => {
    setFormData({
      titulo: study.titulo,
      resumo: study.resumo,
      conteudo: study.conteudo,
    });
    setEditMode(false);
    setError("");
  };

  if (editMode) {
    return (
      <div className="space-y-6">
        {/* Modo Edição */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-blue-900 text-sm font-medium">
            ✏️ Modo edição ativo — as alterações serão salvas no histórico
          </p>
        </div>

        {/* Título */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Título
          </label>
          <input
            type="text"
            value={formData.titulo}
            onChange={(e) => handleChange("titulo", e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Título do estudo"
          />
        </div>

        {/* Resumo */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Resumo
          </label>
          <textarea
            value={formData.resumo}
            onChange={(e) => handleChange("resumo", e.target.value)}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Resumo do estudo"
          />
        </div>

        {/* Conteúdo */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Conteúdo Integral
          </label>
          <textarea
            value={formData.conteudo}
            onChange={(e) => handleChange("conteudo", e.target.value)}
            rows={12}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            placeholder="Conteúdo do estudo"
          />
        </div>

        {/* Mensagens */}
        {savedMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-900 text-sm">✓ {savedMessage}</p>
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-900 text-sm">✕ {error}</p>
          </div>
        )}

        {/* Botões */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isSaving ? "Salvando..." : "Salvar Alterações"}
          </button>
          <button
            onClick={handleCancel}
            disabled={isSaving}
            className="flex-1 bg-gray-200 text-gray-900 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 disabled:bg-gray-100"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Botão Editar */}
      <div className="flex gap-2">
        <button
          onClick={() => setEditMode(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
        >
          ✏️ Editar
        </button>
        <button
          onClick={toggleHistory}
          className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg font-medium hover:bg-gray-300"
        >
          {showHistory ? "Ocultar" : "Ver"} Histórico
        </button>
      </div>

      {/* Histórico */}
      {showHistory && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h4 className="font-semibold text-gray-900 mb-4">
            Histórico de Edições
          </h4>
          {history.length === 0 ? (
            <p className="text-sm text-gray-600">Nenhuma edição registrada</p>
          ) : (
            <div className="space-y-4">
              {history.map((edit, i) => (
                <div
                  key={i}
                  className="border-l-4 border-blue-300 pl-4 py-2 text-sm"
                >
                  <div className="text-gray-600 mb-2">
                    {new Date(edit.created_at).toLocaleString("pt-BR")}
                  </div>
                  <div className="text-gray-900">
                    Campos alterados:{" "}
                    <span className="font-medium">
                      {edit.campos_alterados.join(", ")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Campos em Modo Visualização */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Título</h3>
          <p className="text-gray-700">{formData.titulo}</p>
        </div>

        {formData.resumo && (
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Resumo</h3>
            <p className="text-gray-700 leading-relaxed">{formData.resumo}</p>
          </div>
        )}

        {formData.conteudo && (
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Conteúdo Integral
            </h3>
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <div className="text-gray-800 whitespace-pre-wrap text-sm leading-relaxed max-h-96 overflow-y-auto">
                {formData.conteudo}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
