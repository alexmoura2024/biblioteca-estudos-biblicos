"use client";

import { useState, useTransition } from "react";

const CANONICAL_TOPICS = [
  "Salvação",
  "Jesus Cristo",
  "Fé",
  "Graça",
  "Oração e Comunhão",
  "Palavra e Revelação",
  "Espírito Santo",
  "Igreja e Ministério",
  "Louvor e Adoração",
  "Santidade e Obediência",
  "Justiça e Juízo",
  "Eternidade e Escatologia",
];

const STUDY_TYPES = [
  { value: "EXPOSITIVO", label: "Expositivo" },
  { value: "THEMATIC", label: "Temático" },
  { value: "PANORAMA", label: "Panorama" },
  { value: "DOUTRINÁRIO", label: "Doutrinário" },
];

const PASSAGE_TYPES = [
  { value: "MAIN", label: "Principal" },
  { value: "SECONDARY", label: "Secundária" },
  { value: "CITED", label: "Citada" },
];

interface PassageData {
  passage_id: string;
  referencia_normalizada: string;
  tipo_relacao: "MAIN" | "SECONDARY" | "CITED";
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

interface EditStudyClientProps {
  study: {
    id: string;
    titulo: string;
    resumo: string;
    conteudo: string;
    status: string;
    tipo_estudo: string;
    autor: string;
    data_origem: string;
  };
  passages: PassageData[];
  topics: TopicAssociation[];
  characters: CharacterAssociation[];
}

export default function EditStudyClient({
  study,
  passages: initialPassages,
  topics: initialTopics,
  characters: initialCharacters,
}: EditStudyClientProps) {
  const [editMode, setEditMode] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isSaving, startTransition] = useTransition();

  const [formData, setFormData] = useState({
    titulo: study.titulo,
    resumo: study.resumo,
    conteudo: study.conteudo,
    tipo_estudo: study.tipo_estudo,
  });

  const [passages, setPassages] = useState<PassageData[]>(initialPassages);
  const [newPassageRef, setNewPassageRef] = useState("");
  const [newPassageType, setNewPassageType] = useState<"MAIN" | "SECONDARY" | "CITED">("SECONDARY");

  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(
    new Set(initialTopics.map((t) => t.topic_id))
  );
  const [selectedCharacters, setSelectedCharacters] = useState<Set<string>>(
    new Set(initialCharacters.map((c) => c.character_id))
  );

  const [savedMessage, setSavedMessage] = useState("");
  const [error, setError] = useState("");
  const [history, setHistory] = useState<Record<string, unknown>[]>([]);

  const handleChange = (
    field: "titulo" | "resumo" | "conteudo" | "tipo_estudo",
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleTopic = (topicName: string) => {
    setSelectedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(topicName)) {
        next.delete(topicName);
      } else {
        next.add(topicName);
      }
      return next;
    });
  };

  const toggleCharacter = (characterId: string) => {
    setSelectedCharacters((prev) => {
      const next = new Set(prev);
      if (next.has(characterId)) {
        next.delete(characterId);
      } else {
        next.add(characterId);
      }
      return next;
    });
  };

  const addPassage = () => {
    if (!newPassageRef.trim()) return;

    const exists = passages.some(
      (p) => p.referencia_normalizada.toLowerCase() === newPassageRef.toLowerCase()
    );
    if (exists) {
      setError("Referência já existe neste estudo");
      return;
    }

    setPassages([
      ...passages,
      {
        passage_id: `new_${Date.now()}`,
        referencia_normalizada: newPassageRef,
        tipo_relacao: newPassageType,
      },
    ]);
    setNewPassageRef("");
    setNewPassageType("SECONDARY");
  };

  const removePassage = (passageId: string) => {
    setPassages(passages.filter((p) => p.passage_id !== passageId));
  };

  const updatePassageType = (passageId: string, newType: "MAIN" | "SECONDARY" | "CITED") => {
    setPassages(
      passages.map((p) =>
        p.passage_id === passageId ? { ...p, tipo_relacao: newType } : p
      )
    );
  };

  const handleSave = async () => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/estudos/${study.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...formData,
            passages: passages.map((p) => ({
              referencia_normalizada: p.referencia_normalizada,
              tipo_relacao: p.tipo_relacao,
            })),
            topicIds: Array.from(selectedTopics),
            characterIds: Array.from(selectedCharacters),
          }),
        });

        if (!res.ok) {
          const errData = (await res.json()) as { error?: string };
          setError(errData.error || "Erro ao salvar");
          return;
        }

        const result = (await res.json()) as { changed: string[] };
        setSavedMessage(
          `Alterações salvas: ${result.changed.join(", ") || "nenhuma mudança"}`
        );
        setError("");
        setEditMode(false);

        setTimeout(() => setSavedMessage(""), 3000);

        if (showHistory) loadHistory();
      } catch (e) {
        setError(`Erro: ${e instanceof Error ? e.message : "desconhecido"}`);
      }
    });
  };

  const loadHistory = async () => {
    try {
      const res = await fetch(`/api/admin/estudos/${study.id}/history`);
      if (res.ok) {
        const data = (await res.json()) as { edits: Record<string, unknown>[] };
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
      tipo_estudo: study.tipo_estudo,
    });
    setPassages(initialPassages);
    setNewPassageRef("");
    setSelectedTopics(new Set(initialTopics.map((t) => t.topic_id)));
    setSelectedCharacters(new Set(initialCharacters.map((c) => c.character_id)));
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

        {/* Tipo de Estudo */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Tipo de Estudo
          </label>
          <select
            value={formData.tipo_estudo}
            onChange={(e) => handleChange("tipo_estudo", e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {STUDY_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
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

        {/* Referências Bíblicas EDITÁVEIS */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-3">
            Referências Bíblicas ({passages.length})
          </label>

          {/* Lista de Referências */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-2 mb-4">
            {passages.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhuma referência adicionada</p>
            ) : (
              passages.map((p) => (
                <div key={p.passage_id} className="flex items-center gap-2 bg-white p-2 rounded border border-gray-200">
                  <select
                    value={p.tipo_relacao}
                    onChange={(e) => updatePassageType(p.passage_id, e.target.value as "MAIN" | "SECONDARY" | "CITED")}
                    className="text-xs px-2 py-1 border border-gray-300 rounded"
                  >
                    {PASSAGE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <span className="text-sm text-gray-700 flex-1">{p.referencia_normalizada}</span>
                  <button
                    onClick={() => removePassage(p.passage_id)}
                    className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Adicionar Referência */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newPassageRef}
              onChange={(e) => setNewPassageRef(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addPassage()}
              placeholder="Ex: João 3:16 ou Romanos 6:9-11"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <select
              value={newPassageType}
              onChange={(e) => setNewPassageType(e.target.value as "MAIN" | "SECONDARY" | "CITED")}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
            >
              {PASSAGE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <button
              onClick={addPassage}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600"
            >
              + Adicionar
            </button>
          </div>
        </div>

        {/* Temas */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-3">
            Temas
          </label>
          <div className="space-y-2">
            {CANONICAL_TOPICS.map((topicName) => {
              const topic = initialTopics.find((t) => t.nome === topicName);
              const isSelected = selectedTopics.has(topic?.topic_id || topicName);

              return (
                <label key={topicName} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleTopic(topic?.topic_id || topicName)}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">{topicName}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Personagens */}
        {initialCharacters.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-3">
              Personagens
            </label>
            <div className="space-y-2">
              {initialCharacters.map((character) => (
                <label key={character.character_id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedCharacters.has(character.character_id)}
                    onChange={() => toggleCharacter(character.character_id)}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">{character.nome}</span>
                </label>
              ))}
            </div>
          </div>
        )}

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
      {/* Botões */}
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
              {history.map((edit, i) => {
                const createdAt = edit.created_at as string | undefined;
                const campos = (edit.campos_alterados as string[]) || [];
                return (
                  <div
                    key={i}
                    className="border-l-4 border-blue-300 pl-4 py-2 text-sm"
                  >
                    <div className="text-gray-600 mb-2">
                      {createdAt ? new Date(createdAt).toLocaleString("pt-BR") : ""}
                    </div>
                    <div className="text-gray-900">
                      Campos alterados:{" "}
                      <span className="font-medium">{campos.join(", ")}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Visualização */}
      <div className="space-y-4 text-sm">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">Título</h3>
            <p className="text-gray-700">{formData.titulo}</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">Tipo</h3>
            <p className="text-gray-700">
              {STUDY_TYPES.find((t) => t.value === formData.tipo_estudo)?.label}
            </p>
          </div>
        </div>

        {formData.resumo && (
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">Resumo</h3>
            <p className="text-gray-700 line-clamp-2">{formData.resumo}</p>
          </div>
        )}

        {passages.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Referências ({passages.length})</h3>
            <div className="space-y-1">
              {passages.map((p) => (
                <div key={p.passage_id} className="text-sm text-gray-700">
                  <span className="font-medium">
                    {PASSAGE_TYPES.find((t) => t.value === p.tipo_relacao)?.label}:
                  </span>{" "}
                  {p.referencia_normalizada}
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedTopics.size > 0 && (
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">Temas</h3>
            <div className="flex flex-wrap gap-2">
              {Array.from(selectedTopics).map((topicId) => {
                const topic = initialTopics.find((t) => t.topic_id === topicId);
                const canonicalName = CANONICAL_TOPICS.find(
                  (name) =>
                    initialTopics.find((t) => t.nome === name)?.topic_id === topicId
                );
                return (
                  <span
                    key={topicId}
                    className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs"
                  >
                    {canonicalName || topic?.nome || topicId}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {selectedCharacters.size > 0 && (
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">Personagens</h3>
            <div className="flex flex-wrap gap-2">
              {Array.from(selectedCharacters).map((charId) => {
                const char = initialCharacters.find((c) => c.character_id === charId);
                return (
                  <span
                    key={charId}
                    className="inline-block bg-amber-100 text-amber-800 px-2 py-1 rounded text-xs"
                  >
                    {char?.nome}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Provenance Notice */}
      <div className="bg-gray-50 border-l-4 border-gray-300 p-4 text-xs text-gray-600">
        <p className="font-medium mb-1">📎 Fonte Original (Somente Leitura)</p>
        <p>A proveniência do estudo (arquivo original, Drive ID, MIME) é preservada automaticamente e não pode ser alterada por esta interface.</p>
      </div>
    </div>
  );
}
