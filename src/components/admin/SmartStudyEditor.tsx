"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import {
  type FormEvent,
  type MouseEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  auditStudyDraft,
  extractBiblicalReferences,
  normalizeDraftMarkdown,
  type AuditCheck,
  type EditorDraft,
} from "@/lib/admin/editorTools";
import { MAX_LIBRARY_DRAFT_SOURCES } from "@/lib/admin/libraryDraft";

type StudyType =
  | "EXPOSITIVO"
  | "THEMATIC"
  | "PANORAMA"
  | "DOUTRINÁRIO";

type EditorView = "editor" | "markdown" | "preview";
type AiAction =
  | "format_markdown"
  | "review_portuguese"
  | "organize_structure"
  | "generate_summary"
  | "suggest_title"
  | "suggest_keywords"
  | "detect_references"
  | "dictionary"
  | "generate_from_library";
type SuggestionTarget =
  | "conteudo"
  | "resumo"
  | "titulo"
  | "palavras_chave"
  | "none";

interface Suggestion {
  action: AiAction;
  title: string;
  result: string;
  target: SuggestionTarget;
  sources: Array<{
    title: string;
    slug: string;
    id?: string;
    status?: LibrarySourceStatus;
  }>;
}

interface RelatedItem {
  title: string;
  slug: string;
  summary: string;
  reference: string | null;
  matchedOn: string[];
}

type LibrarySourceStatus = "PUBLISHED" | "REVIEW" | "DRAFT";

interface LibrarySourceItem {
  id: string;
  title: string;
  slug: string;
  summary: string;
  status: LibrarySourceStatus;
}

const LIBRARY_SOURCE_STATUS_LABELS: Record<
  LibrarySourceStatus,
  string
> = {
  PUBLISHED: "Publicado",
  REVIEW: "Em revisão",
  DRAFT: "Rascunho",
};

type ClassificationKind = "topics" | "characters" | "series";

interface ClassificationItem {
  id: string;
  name: string;
  reason: string;
  confidence: "alta" | "media";
}

interface ClassificationResult {
  topics: ClassificationItem[];
  characters: ClassificationItem[];
  series: ClassificationItem[];
  catalogCounts?: {
    topics: number;
    characters: number;
    series: number;
  };
}

const STORAGE_KEY = "biblioteca-admin-novo-estudo-v1";

const STUDY_TYPES: Array<{ value: StudyType; label: string }> = [
  { value: "EXPOSITIVO", label: "Expositivo" },
  { value: "THEMATIC", label: "Temático" },
  { value: "PANORAMA", label: "Panorama" },
  { value: "DOUTRINÁRIO", label: "Doutrinário" },
];

const AI_TOOLS: Array<{
  action: Exclude<AiAction, "dictionary" | "generate_from_library">;
  label: string;
  description: string;
}> = [
  {
    action: "format_markdown",
    label: "Preparar Markdown",
    description: "Limpa a formatação e prepara o texto para publicação.",
  },
  {
    action: "review_portuguese",
    label: "Revisar português",
    description: "Ortografia, pontuação e concordância sem mudar a doutrina.",
  },
  {
    action: "organize_structure",
    label: "Organizar mensagem expositiva",
    description:
      "Reescreve de forma expositiva e preserva contexto, essência e doutrina. Transcrições longas podem levar até cerca de 1 minuto.",
  },
  {
    action: "generate_summary",
    label: "Gerar resumo",
    description: "Cria o resumo editorial usado nos cards da Biblioteca.",
  },
  {
    action: "suggest_title",
    label: "Sugerir título",
    description: "Propõe um título sóbrio e fiel ao conteúdo.",
  },
  {
    action: "suggest_keywords",
    label: "Palavras-chave",
    description: "Extrai os principais termos do estudo.",
  },
];

const INITIAL_FORM: EditorDraft = {
  titulo: "",
  autor: "",
  data_origem: "",
  tipo_estudo: "EXPOSITIVO",
  referencia_principal: "",
  resumo: "",
  conteudo: "",
  palavras_chave: "",
  topic_ids: [],
  character_ids: [],
  series_ids: [],
  approved_references: [],
};

export function SmartStudyEditor() {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const rightPaneRef = useRef<HTMLElement>(null);
  const [form, setForm] = useState<EditorDraft>(INITIAL_FORM);
  const [view, setView] = useState<EditorView>("editor");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [autosave, setAutosave] = useState<
    "restaurado" | "salvando" | "salvo" | "vazio"
  >("vazio");
  const [selectedText, setSelectedText] = useState("");
  const [lookupTerm, setLookupTerm] = useState("");
  const [assistantLoading, setAssistantLoading] =
    useState<AiAction | "library" | "source_search" | null>(null);
  const [assistantError, setAssistantError] = useState("");
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [related, setRelated] = useState<RelatedItem[]>([]);
  const [libraryDraftRequest, setLibraryDraftRequest] = useState("");
  const [librarySources, setLibrarySources] = useState<
    LibrarySourceItem[]
  >([]);
  const [
    selectedLibrarySourceIds,
    setSelectedLibrarySourceIds,
  ] = useState<string[]>([]);
  const [librarySourceSearchCompleted, setLibrarySourceSearchCompleted] =
    useState(false);
  const [lastContentBeforeAi, setLastContentBeforeAi] = useState<
    string | null
  >(null);
  const [classification, setClassification] =
    useState<ClassificationResult | null>(null);
  const [classificationLoading, setClassificationLoading] =
    useState(false);
  const [classificationError, setClassificationError] =
    useState("");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<EditorDraft>;
        setForm((current) => ({ ...current, ...parsed }));
        setAutosave("restaurado");
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    setAutosave("salvando");
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
      setAutosave("salvo");
    }, 700);

    return () => window.clearTimeout(timer);
  }, [form, hydrated]);

  useEffect(() => {
    if (!suggestion) return;

    const frame = window.requestAnimationFrame(() => {
      const container = rightPaneRef.current;
      const target = container?.querySelector<HTMLElement>(
        `[data-editor-suggestion="${suggestion.action}"]`,
      );

      if (!container || !target) return;

      const containerRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const nextTop =
        container.scrollTop +
        targetRect.top -
        containerRect.top -
        12;

      container.scrollTo({
        top: Math.max(0, nextTop),
        behavior: "smooth",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [suggestion]);

  useEffect(() => {
    if (related.length === 0) return;

    const frame = window.requestAnimationFrame(() => {
      const container = rightPaneRef.current;
      const target =
        container?.querySelector<HTMLElement>("[data-related-results]");

      if (!container || !target) return;

      const containerRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const nextTop =
        container.scrollTop +
        targetRect.top -
        containerRect.top -
        12;

      container.scrollTo({
        top: Math.max(0, nextTop),
        behavior: "smooth",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [related.length]);

  const references = useMemo(
    () =>
      extractBiblicalReferences(
        form.conteudo,
        form.referencia_principal,
      ),
    [form.conteudo, form.referencia_principal],
  );

  const audit = useMemo(() => auditStudyDraft(form), [form]);
  const auditPass = audit.filter((item) => item.status === "pass").length;
  const wordCount = useMemo(
    () =>
      form.conteudo.trim()
        ? form.conteudo.trim().split(/\s+/).length
        : 0,
    [form.conteudo],
  );

  const approvedClassificationCount =
    (form.topic_ids?.length ?? 0) +
    (form.character_ids?.length ?? 0) +
    (form.series_ids?.length ?? 0);

  const approvedReferenceCount =
    (form.approved_references?.length ?? 0) +
    (form.referencia_principal.trim() ? 1 : 0);

  function updateField<K extends keyof EditorDraft>(
    field: K,
    value: EditorDraft[K],
  ) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  function captureSelection() {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const value = form.conteudo.slice(
      textarea.selectionStart,
      textarea.selectionEnd,
    );

    setSelectedText(value);
    if (value.trim() && value.trim().length <= 100) {
      setLookupTerm(value.trim());
    }
  }

  function insertAtSelection(
    before: string,
    after = "",
    placeholder = "",
  ) {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected =
      form.conteudo.slice(start, end) || placeholder;
    const next =
      form.conteudo.slice(0, start) +
      before +
      selected +
      after +
      form.conteudo.slice(end);

    updateField("conteudo", next);

    window.requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + before.length + selected.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  }

  function insertBlock(block: string) {
    const textarea = textareaRef.current;
    if (!textarea) {
      updateField(
        "conteudo",
        `${form.conteudo}${form.conteudo ? "\n\n" : ""}${block}`,
      );
      return;
    }

    const start = textarea.selectionStart;
    const prefix =
      start > 0 && !form.conteudo.slice(0, start).endsWith("\n\n")
        ? "\n\n"
        : "";
    insertAtSelection(prefix + block);
  }

  function focusOrInsertSection(block: string) {
    const index = form.conteudo.indexOf(block);

    if (index < 0) {
      setView("editor");
      insertBlock(block);
      return;
    }

    setView("editor");

    window.requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      textarea.focus();
      textarea.setSelectionRange(index, index + block.length);

      const textBefore = textarea.value.slice(0, index);
      const lineCount = textBefore.split("\n").length;
      const lineHeight =
        Number.parseFloat(window.getComputedStyle(textarea).lineHeight) || 28;

      textarea.scrollTo({
        top: Math.max(0, (lineCount - 3) * lineHeight),
        behavior: "smooth",
      });
    });

  }

  function toolbarMouseDown(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
  }

  async function runAi(action: AiAction) {
    setAssistantError("");
    setSuggestion(null);
    setAssistantLoading(action);

    try {
      const response = await fetch("/api/admin/editor/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          titulo: form.titulo,
          conteudo: form.conteudo,
          resumo: form.resumo,
          referencia: form.referencia_principal,
          selected_text: selectedText,
          term: lookupTerm,
        }),
      });

      const data = (await response.json()) as {
        result?: string;
        target?: SuggestionTarget;
        sources?: Array<{ title: string; slug: string }>;
        error?: string;
      };

      if (!response.ok || !data.result || !data.target) {
        throw new Error(data.error || "A ferramenta de IA não respondeu.");
      }

      const labels: Record<AiAction, string> = {
        format_markdown: "Markdown preparado",
        review_portuguese: "Revisão de português",
        organize_structure: "Estrutura sugerida",
        generate_summary: "Resumo sugerido",
        suggest_title: "Título sugerido",
        suggest_keywords: "Palavras-chave sugeridas",
        detect_references: "Referências bíblicas sugeridas",
        dictionary: `Dicionário do acervo: ${lookupTerm || selectedText}`,
        generate_from_library: "Rascunho baseado no acervo",
      };

      setSuggestion({
        action,
        title: labels[action],
        result: data.result,
        target: data.target,
        sources: data.sources ?? [],
      });
    } catch (requestError) {
      setAssistantError(
        requestError instanceof Error
          ? requestError.message
          : "Erro inesperado na ferramenta editorial.",
      );
    } finally {
      setAssistantLoading(null);
    }
  }

  function applySuggestion() {
    if (!suggestion || suggestion.target === "none") return;

    if (suggestion.target === "conteudo") {
      setLastContentBeforeAi(form.conteudo);
      updateField(
        "conteudo",
        normalizeDraftMarkdown(suggestion.result),
      );
    } else {
      updateField(suggestion.target, suggestion.result);
    }

    setSuggestion(null);
  }

  function restorePreviousContent() {
    if (lastContentBeforeAi === null) return;
    updateField("conteudo", lastContentBeforeAi);
    setLastContentBeforeAi(null);
  }

  async function findLibrarySources() {
    const request = libraryDraftRequest.trim();

    if (!request) {
      setAssistantError(
        "Descreva o estudo que deseja criar.",
      );
      return;
    }

    setAssistantError("");
    setAssistantLoading("source_search");
    setLibrarySources([]);
    setSelectedLibrarySourceIds([]);
    setLibrarySourceSearchCompleted(false);

    try {
      const response = await fetch(
        `/api/admin/editor/sources?q=${encodeURIComponent(request)}`,
        { cache: "no-store" },
      );

      const data = (await response.json()) as {
        items?: LibrarySourceItem[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          data.error || "Não foi possível buscar fontes.",
        );
      }

      setLibrarySources(data.items ?? []);
      setLibrarySourceSearchCompleted(true);
    } catch (requestError) {
      setAssistantError(
        requestError instanceof Error
          ? requestError.message
          : "Erro inesperado ao buscar fontes.",
      );
    } finally {
      setAssistantLoading(null);
    }
  }

  function toggleLibrarySource(sourceId: string) {
    if (selectedLibrarySourceIds.includes(sourceId)) {
      setSelectedLibrarySourceIds((current) =>
        current.filter((id) => id !== sourceId),
      );
      return;
    }

    if (
      selectedLibrarySourceIds.length >=
      MAX_LIBRARY_DRAFT_SOURCES
    ) {
      setAssistantError(
        `Selecione no máximo ${MAX_LIBRARY_DRAFT_SOURCES} fontes.`,
      );
      return;
    }

    setAssistantError("");
    setSelectedLibrarySourceIds((current) => [
      ...current,
      sourceId,
    ]);
  }
  async function generateLibraryDraft() {
    const request = libraryDraftRequest.trim();

    if (!request) {
      setAssistantError(
        "Descreva o estudo que deseja criar.",
      );
      return;
    }

    if (selectedLibrarySourceIds.length === 0) {
      setAssistantError(
        "Selecione pelo menos uma fonte do acervo.",
      );
      return;
    }

    setAssistantError("");
    setSuggestion(null);
    setAssistantLoading("generate_from_library");

    try {
      const response = await fetch(
        "/api/admin/editor/draft",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            request,
            source_ids: selectedLibrarySourceIds,
          }),
        },
      );

      const data = (await response.json()) as {
        result?: string;
        target?: "conteudo";
        sources?: Array<{
          title: string;
          slug: string;
          id?: string;
          status?: LibrarySourceStatus;
        }>;
        error?: string;
      };

      if (!response.ok || !data.result) {
        throw new Error(
          data.error ||
            "A IA não devolveu um rascunho utilizável.",
        );
      }

      setSuggestion({
        action: "generate_from_library",
        title: "Rascunho baseado no acervo",
        result: data.result,
        target: "conteudo",
        sources: data.sources ?? [],
      });
    } catch (requestError) {
      setAssistantError(
        requestError instanceof Error
          ? requestError.message
          : "Erro inesperado ao gerar o rascunho.",
      );
    } finally {
      setAssistantLoading(null);
    }
  }
  async function findRelatedStudies() {
    const query =
      lookupTerm.trim() ||
      selectedText.trim() ||
      form.referencia_principal.trim() ||
      form.titulo.trim();

    if (!query) {
      setAssistantError(
        "Selecione um termo no texto ou informe um termo de consulta.",
      );
      return;
    }

    setAssistantError("");
    setAssistantLoading("library");
    setRelated([]);

    try {
      const response = await fetch(
        `/api/admin/editor/library?q=${encodeURIComponent(query)}`,
        { cache: "no-store" },
      );
      const data = (await response.json()) as {
        items?: RelatedItem[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "Não foi possível consultar o acervo.");
      }

      setRelated(data.items ?? []);
    } catch (requestError) {
      setAssistantError(
        requestError instanceof Error
          ? requestError.message
          : "Erro ao consultar o acervo.",
      );
    } finally {
      setAssistantLoading(null);
    }
  }

  function referenceRelation(
    reference: string,
  ): "IGNORE" | "MAIN" | "SECONDARY" | "CITED" {
    if (form.referencia_principal.trim() === reference) {
      return "MAIN";
    }

    return (
      form.approved_references?.find(
        (item) => item.reference === reference,
      )?.relation ?? "IGNORE"
    );
  }

  function setReferenceRelation(
    reference: string,
    relation: "IGNORE" | "MAIN" | "SECONDARY" | "CITED",
  ) {
    setForm((previous) => {
      const approved = (previous.approved_references ?? []).filter(
        (item) => item.reference !== reference,
      );

      if (relation === "MAIN") {
        return {
          ...previous,
          referencia_principal: reference,
          approved_references: approved,
        };
      }

      if (relation === "SECONDARY" || relation === "CITED") {
        approved.push({ reference, relation });
      }

      return {
        ...previous,
        approved_references: approved,
      };
    });
  }

  function classificationField(
    kind: ClassificationKind,
  ): "topic_ids" | "character_ids" | "series_ids" {
    if (kind === "topics") return "topic_ids";
    if (kind === "characters") return "character_ids";
    return "series_ids";
  }

  function toggleClassification(
    kind: ClassificationKind,
    id: string,
  ) {
    const field = classificationField(kind);

    setForm((previous) => {
      const current = previous[field] ?? [];
      const next = current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id];

      return { ...previous, [field]: next };
    });
  }

  async function suggestClassification() {
    if (!form.conteudo.trim()) {
      setClassificationError(
        "Escreva ou cole o estudo antes de classificar.",
      );
      return;
    }

    setClassificationError("");
    setClassificationLoading(true);

    try {
      const response = await fetch("/api/admin/editor/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: form.titulo,
          resumo: form.resumo,
          conteudo: form.conteudo,
          referencia: form.referencia_principal,
          palavras_chave: form.palavras_chave,
        }),
      });

      const data = (await response.json()) as ClassificationResult & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          data.error || "Não foi possível classificar o estudo.",
        );
      }

      setClassification({
        topics: data.topics ?? [],
        characters: data.characters ?? [],
        series: data.series ?? [],
        catalogCounts: data.catalogCounts,
      });
    } catch (requestError) {
      setClassificationError(
        requestError instanceof Error
          ? requestError.message
          : "Erro inesperado na classificação editorial.",
      );
    } finally {
      setClassificationLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSaving(true);

    try {
      const visibleReferences = new Set(references);
      const payload: EditorDraft = {
        ...form,
        approved_references: (form.approved_references ?? []).filter(
          (item) => visibleReferences.has(item.reference),
        ),
      };

      const response = await fetch("/api/admin/estudos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as {
        id?: string;
        error?: string;
      };

      if (!response.ok || !data.id) {
        setError(data.error || "Não foi possível criar o estudo.");
        return;
      }

      window.localStorage.removeItem(STORAGE_KEY);
      router.push(`/admin/estudos/${data.id}`);
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Erro inesperado ao criar o estudo.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f5f2]">
      <form onSubmit={handleSubmit}>
        <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
            <Link
              href="/admin/estudos"
              className="text-sm font-semibold text-stone-500 hover:text-amber-800"
            >
              ← Estudos
            </Link>

            <div className="h-6 w-px bg-stone-200" aria-hidden="true" />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-serif text-xl font-semibold text-stone-950">
                  Editor Bíblico Inteligente
                </h1>
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-800">
                  Draft
                </span>
              </div>
              <p className="mt-0.5 text-xs text-stone-500">
                {autosave === "salvando"
                  ? "Salvando rascunho local..."
                  : autosave === "restaurado"
                    ? "Rascunho local restaurado."
                    : autosave === "salvo"
                      ? "Rascunho local salvo automaticamente."
                      : "Novo estudo ainda não salvo."}
              </p>
            </div>

            {lastContentBeforeAi !== null && (
              <button
                type="button"
                onClick={restorePreviousContent}
                className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
              >
                Desfazer última aplicação IA
              </button>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-700 disabled:bg-stone-400"
            >
              {isSaving ? "Salvando..." : "Salvar como DRAFT"}
            </button>
          </div>
        </header>

        <main className="editor-workspace mx-auto grid max-w-[1700px] gap-5 px-4 py-5 sm:px-6 xl:h-[calc(100dvh-8.5rem)] xl:min-h-0 xl:grid-cols-[19rem_minmax(0,1fr)_22rem] xl:items-stretch xl:overflow-hidden">
          <aside className="editor-pane space-y-4 xl:h-full xl:min-h-0 xl:overflow-y-auto xl:pr-1">
            <Panel title="Dados editoriais" eyebrow="Estudo">
              <Field label="Título *">
                <input
                  required
                  value={form.titulo}
                  onChange={(event) =>
                    updateField("titulo", event.target.value)
                  }
                  className="editor-input"
                  placeholder="Título do estudo"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Autor *">
                  <input
                    required
                    value={form.autor}
                    onChange={(event) =>
                      updateField("autor", event.target.value)
                    }
                    className="editor-input"
                    placeholder="Autor"
                  />
                </Field>
                <Field label="Data *">
                  <input
                    required
                    type="date"
                    value={form.data_origem}
                    onChange={(event) =>
                      updateField("data_origem", event.target.value)
                    }
                    className="editor-input"
                  />
                </Field>
              </div>

              <Field label="Tipo">
                <select
                  value={form.tipo_estudo}
                  onChange={(event) =>
                    updateField("tipo_estudo", event.target.value)
                  }
                  className="editor-input"
                >
                  {STUDY_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Referência principal">
                <input
                  value={form.referencia_principal}
                  onChange={(event) =>
                    updateField(
                      "referencia_principal",
                      event.target.value,
                    )
                  }
                  className="editor-input"
                  placeholder="Ex.: João 3:16"
                />
              </Field>
            </Panel>

            <Panel title="Estrutura" eyebrow="Mensagem">
              <p className="text-xs leading-5 text-stone-500">
                Crie as seções ou navegue diretamente para elas sem perder a
                posição do editor.
              </p>
              <div className="grid gap-2">
                {[
                  ["Introdução", "**Introdução**"],
                  ["Desenvolvimento", "**Desenvolvimento**"],
                  ["Conclusão", "**Conclusão**"],
                ].map(([label, block]) => {
                  const exists = form.conteudo.includes(block);

                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => focusOrInsertSection(block)}
                      className={`rounded-lg border px-3 py-2 text-left text-sm font-semibold transition ${
                        exists
                          ? "border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
                          : "border-stone-200 bg-stone-50 text-stone-700 hover:border-amber-300 hover:bg-amber-50"
                      }`}
                    >
                      {exists ? "Ir para " : "+ "}
                      {label}
                    </button>
                  );
                })}
              </div>
            </Panel>

            <Panel title="Resumo e indexação" eyebrow="Metadados">
              <Field label="Resumo">
                <textarea
                  rows={5}
                  value={form.resumo}
                  onChange={(event) =>
                    updateField("resumo", event.target.value)
                  }
                  className="editor-input resize-y"
                  placeholder="Resumo usado nos cards..."
                />
              </Field>

              <Field label="Palavras-chave">
                <textarea
                  rows={3}
                  value={form.palavras_chave}
                  onChange={(event) =>
                    updateField(
                      "palavras_chave",
                      event.target.value,
                    )
                  }
                  className="editor-input resize-y"
                  placeholder="oração, fé, revelação"
                />
              </Field>
            </Panel>
          </aside>

          <section className="flex min-w-0 flex-col gap-3 xl:h-full xl:min-h-0">
            <div className="flex min-h-[68vh] flex-1 flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm xl:min-h-0">
              <div className="flex flex-none flex-wrap items-center justify-between gap-3 border-b border-stone-200 bg-stone-50/80 px-4 py-3">
                <div className="flex rounded-lg border border-stone-200 bg-white p-1">
                  {(
                    [
                      ["editor", "Editor"],
                      ["markdown", "Markdown"],
                      ["preview", "Pré-visualização"],
                    ] as Array<[EditorView, string]>
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setView(value)}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                        view === value
                          ? "bg-stone-950 text-white"
                          : "text-stone-600 hover:bg-stone-100"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3 text-xs text-stone-500">
                  <span>{wordCount.toLocaleString("pt-BR")} palavras</span>
                  <span>{references.length} refs. bíblicas</span>
                </div>
              </div>

              {view !== "preview" && (
                <>
                  <div className="z-10 flex flex-none flex-wrap gap-1.5 border-b border-stone-200 bg-white px-4 py-2.5">
                    <ToolbarButton
                      label="B"
                      title="Negrito"
                      onMouseDown={toolbarMouseDown}
                      onClick={() =>
                        insertAtSelection("**", "**", "texto")
                      }
                    />
                    <ToolbarButton
                      label="I"
                      title="Itálico"
                      italic
                      onMouseDown={toolbarMouseDown}
                      onClick={() =>
                        insertAtSelection("*", "*", "texto")
                      }
                    />
                    <ToolbarButton
                      label="H2"
                      title="Subtítulo"
                      onMouseDown={toolbarMouseDown}
                      onClick={() =>
                        insertAtSelection("## ", "", "Subtítulo")
                      }
                    />
                    <ToolbarButton
                      label="H3"
                      title="Subseção"
                      onMouseDown={toolbarMouseDown}
                      onClick={() =>
                        insertAtSelection("### ", "", "Subseção")
                      }
                    />
                    <ToolbarButton
                      label="❝"
                      title="Citação"
                      onMouseDown={toolbarMouseDown}
                      onClick={() =>
                        insertAtSelection("> ", "", "Citação")
                      }
                    />
                    <ToolbarButton
                      label="• Lista"
                      title="Lista"
                      onMouseDown={toolbarMouseDown}
                      onClick={() =>
                        insertAtSelection("- ", "", "Item")
                      }
                    />
                    <ToolbarButton
                      label="Texto Base"
                      title="Inserir texto base"
                      onMouseDown={toolbarMouseDown}
                      onClick={() =>
                        insertBlock("**Texto Base:** ")
                      }
                    />
                    <ToolbarButton
                      label="—"
                      title="Separador"
                      onMouseDown={toolbarMouseDown}
                      onClick={() => insertBlock("---")}
                    />
                  </div>

                  <textarea
                    ref={textareaRef}
                    value={form.conteudo}
                    onChange={(event) =>
                      updateField("conteudo", event.target.value)
                    }
                    onSelect={captureSelection}
                    onKeyUp={captureSelection}
                    onMouseUp={captureSelection}
                    spellCheck
                    className={`min-h-[68vh] w-full flex-1 resize-y overflow-y-auto border-0 bg-white px-7 py-7 outline-none sm:px-10 xl:min-h-0 xl:resize-none ${
                      view === "markdown"
                        ? "font-mono text-sm leading-7 text-stone-800"
                        : "font-serif text-[1.08rem] leading-8 text-stone-900"
                    }`}
                    placeholder="Cole ou escreva aqui a mensagem completa. Você pode começar com texto bruto; o botão “Preparar Markdown” do Assistente Editorial cria uma sugestão antes de qualquer alteração."
                  />
                </>
              )}

              {view === "preview" && (
                <div className="min-h-[68vh] flex-1 overflow-y-auto px-7 py-8 sm:px-10 xl:min-h-0">
                  {!form.conteudo.trim() ? (
                    <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 p-8 text-center text-sm text-stone-500">
                      Escreva algum conteúdo para visualizar a publicação.
                    </div>
                  ) : (
                    <article className="mx-auto max-w-3xl">
                      <div className="mb-8 border-b border-stone-200 pb-6">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
                          Pré-visualização editorial
                        </p>
                        <h2 className="mt-2 font-serif text-3xl font-semibold leading-tight text-stone-950">
                          {form.titulo || "Título do estudo"}
                        </h2>
                        {form.referencia_principal && (
                          <p className="mt-3 text-sm font-semibold text-stone-500">
                            {form.referencia_principal}
                          </p>
                        )}
                      </div>

                      {form.resumo && (
                        <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50/60 p-5">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-800">
                            Em síntese
                          </p>
                          <p className="mt-2 font-serif text-lg leading-7 text-stone-700">
                            {form.resumo}
                          </p>
                        </div>
                      )}

                      <div className="text-[1.02rem]">
                        <ReactMarkdown
                          components={{
                            h1: ({ children }) => (
                              <h2 className="mt-10 border-b border-stone-200 pb-2 font-serif text-2xl font-semibold text-stone-950">
                                {children}
                              </h2>
                            ),
                            h2: ({ children }) => (
                              <h2 className="mt-10 border-b border-stone-200 pb-2 font-serif text-2xl font-semibold text-stone-950">
                                {children}
                              </h2>
                            ),
                            h3: ({ children }) => (
                              <h3 className="mt-8 font-serif text-xl font-semibold text-stone-950">
                                {children}
                              </h3>
                            ),
                            p: ({ children }) => (
                              <p className="mt-5 leading-8 text-stone-800 [text-align:justify] first:mt-0">
                                {children}
                              </p>
                            ),
                            strong: ({ children }) => (
                              <strong className="font-bold text-stone-950">
                                {children}
                              </strong>
                            ),
                            blockquote: ({ children }) => (
                              <blockquote className="my-7 border-l-4 border-amber-600 bg-amber-50 px-5 py-4 font-serif italic leading-7 text-stone-700">
                                {children}
                              </blockquote>
                            ),
                            ul: ({ children }) => (
                              <ul className="my-5 list-disc space-y-2 pl-7 text-stone-800">
                                {children}
                              </ul>
                            ),
                            ol: ({ children }) => (
                              <ol className="my-5 list-decimal space-y-2 pl-7 text-stone-800">
                                {children}
                              </ol>
                            ),
                            li: ({ children }) => (
                              <li className="leading-8">{children}</li>
                            ),
                            hr: () => (
                              <hr className="my-9 border-stone-200" />
                            ),
                          }}
                        >
                          {form.conteudo}
                        </ReactMarkdown>
                      </div>
                    </article>
                  )}
                </div>
              )}

              <div className="flex flex-none flex-wrap items-center justify-between gap-3 border-t border-stone-200 bg-stone-50/80 px-4 py-2 text-[11px] text-stone-500">
                <div className="flex flex-wrap items-center gap-3">
                  <span>{wordCount.toLocaleString("pt-BR")} palavras</span>
                  <span>{references.length} referências bíblicas</span>
                  <span>{auditPass}/{audit.length} itens editoriais prontos</span>
                  <span>
                    {approvedClassificationCount} classificações aprovadas
                  </span>
                  <span>
                    {approvedReferenceCount} referências aprovadas
                  </span>
                </div>
                <span
                  className={
                    autosave === "salvo"
                      ? "font-semibold text-emerald-700"
                      : "text-stone-500"
                  }
                >
                  {autosave === "salvando"
                    ? "Salvando rascunho..."
                    : autosave === "restaurado"
                      ? "Rascunho restaurado"
                      : autosave === "salvo"
                        ? "Rascunho salvo ✓"
                        : "Rascunho local"}
                </span>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                {error}
              </div>
            )}

            <div className="flex flex-none flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white p-3 text-xs text-stone-500">
              <span>
                A criação salva sempre como <strong>DRAFT privado</strong>.
              </span>
              <Link
                href="/admin/estudos"
                className="font-semibold text-stone-700 hover:text-amber-800"
              >
                Cancelar e voltar
              </Link>
            </div>
          </section>

          <aside ref={rightPaneRef} className="editor-pane space-y-4 xl:h-full xl:min-h-0 xl:overflow-y-auto xl:pl-1">
            <Panel
              title="Assistente Editorial"
              eyebrow="IA com aprovação humana"
              accent
            >
              <p className="rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-xs leading-5 text-sky-900">
                A IA nunca altera o estudo automaticamente. Toda sugestão
                precisa ser revisada e aplicada por você.
              </p>

              <div className="grid gap-2">
                {AI_TOOLS.map((tool) => (
                  <button
                    key={tool.action}
                    type="button"
                    disabled={assistantLoading !== null}
                    onClick={() => runAi(tool.action)}
                    className="group rounded-xl border border-stone-200 bg-white px-3 py-3 text-left transition hover:border-sky-300 hover:bg-sky-50 disabled:opacity-50"
                  >
                    <span className="block text-sm font-semibold text-stone-900 group-hover:text-sky-950">
                      {assistantLoading === tool.action
                        ? "Processando..."
                        : tool.label}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-4 text-stone-500">
                      {tool.description}
                    </span>
                  </button>
                ))}
              </div>

              {selectedText && (
                <div className="rounded-lg border border-violet-100 bg-violet-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-violet-700">
                    Texto selecionado
                  </p>
                  <p className="mt-1 line-clamp-3 text-xs leading-5 text-violet-950">
                    {selectedText}
                  </p>
                </div>
              )}

              {assistantLoading &&
                assistantLoading !== "library" &&
                assistantLoading !== "dictionary" && (
                  <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-3 text-xs font-semibold text-sky-900">
                    IA editorial processando a sugestão...
                  </div>
                )}

              {suggestion &&
                suggestion.action !== "dictionary" &&
                suggestion.action !== "detect_references" &&
                suggestion.action !== "generate_from_library" && (
                <SuggestionCard
                  suggestion={suggestion}
                  onApply={applySuggestion}
                  onDiscard={() => setSuggestion(null)}
                />
              )}
            </Panel>

            <Panel
              title="Criar com base no acervo"
              eyebrow="Manuscritos + IA"
              accent
            >
              <p className="text-xs leading-5 text-stone-600">
                Descreva o estudo desejado. Localize e selecione até seis
                fontes para orientar o novo rascunho.
              </p>

              <Field label="O que você deseja estudar?">
                <textarea
                  rows={4}
                  value={libraryDraftRequest}
                  onChange={(event) => {
                    setLibraryDraftRequest(event.target.value);
                    setLibrarySourceSearchCompleted(false);
                  }}
                  className="editor-input resize-y"
                  maxLength={600}
                  placeholder="Ex.: Quero um estudo sobre a força de Sansão"
                />
              </Field>

              <button
                type="button"
                disabled={
                  assistantLoading !== null ||
                  !libraryDraftRequest.trim()
                }
                onClick={findLibrarySources}
                className="w-full rounded-lg bg-sky-700 px-3 py-2.5 text-xs font-semibold text-white hover:bg-sky-800 disabled:bg-stone-300"
              >
                {assistantLoading === "source_search"
                  ? "Buscando no acervo..."
                  : "Buscar fontes"}
              </button>

              {librarySourceSearchCompleted &&
                librarySources.length === 0 && (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
                    Nenhuma fonte foi encontrada. Tente usar menos palavras
                    ou informe diretamente o personagem ou tema.
                  </p>
                )}

              {librarySources.length > 0 && (
                <div className="space-y-2 border-t border-stone-100 pt-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500">
                      Fontes encontradas
                    </p>
                    <span className="text-[10px] font-semibold text-sky-800">
                      {selectedLibrarySourceIds.length}/
                      {MAX_LIBRARY_DRAFT_SOURCES} selecionadas
                    </span>
                  </div>

                  {librarySources.map((source) => {
                    const selected =
                      selectedLibrarySourceIds.includes(source.id);
                    const selectionFull =
                      selectedLibrarySourceIds.length >=
                      MAX_LIBRARY_DRAFT_SOURCES;

                    return (
                      <label
                        key={source.id}
                        className={`block cursor-pointer rounded-lg border p-3 transition ${
                          selected
                            ? "border-sky-400 bg-sky-50"
                            : "border-stone-200 bg-white hover:border-sky-300"
                        }`}
                      >
                        <span className="flex items-start gap-2.5">
                          <input
                            type="checkbox"
                            checked={selected}
                            disabled={!selected && selectionFull}
                            onChange={() =>
                              toggleLibrarySource(source.id)
                            }
                            className="mt-1 h-4 w-4 rounded border-stone-300 text-sky-700"
                          />

                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-semibold leading-5 text-stone-900">
                                {source.title}
                              </span>
                              <span className="rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-stone-600">
                                {
                                  LIBRARY_SOURCE_STATUS_LABELS[
                                    source.status
                                  ]
                                }
                              </span>
                            </span>

                            {source.summary && (
                              <span className="mt-1 line-clamp-3 block text-[11px] leading-4 text-stone-500">
                                {source.summary}
                              </span>
                            )}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}

              {selectedLibrarySourceIds.length > 0 && (
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900">
                  {selectedLibrarySourceIds.length} fonte
                  {selectedLibrarySourceIds.length === 1 ? "" : "s"} pronta
                  {selectedLibrarySourceIds.length === 1 ? "" : "s"} para a
                  geração do rascunho.
                </p>
              )}
              {selectedLibrarySourceIds.length > 0 && (
                <button
                  type="button"
                  disabled={assistantLoading !== null}
                  onClick={generateLibraryDraft}
                  className="w-full rounded-lg bg-emerald-700 px-3 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:bg-stone-300"
                >
                  {assistantLoading === "generate_from_library"
                    ? "Gerando rascunho..."
                    : "Gerar rascunho com IA"}
                </button>
              )}

              {suggestion?.action === "generate_from_library" && (
                <SuggestionCard
                  suggestion={suggestion}
                  onApply={applySuggestion}
                  onDiscard={() => setSuggestion(null)}
                />
              )}
              <p className="text-[10px] leading-4 text-stone-400">
                O texto será apresentado como sugestão. Nada será aplicado
                ou publicado automaticamente.
              </p>
            </Panel>
            <Panel title="Dicionário e cruzadas" eyebrow="Acervo">
              <Field label="Termo ou assunto">
                <input
                  value={lookupTerm}
                  onChange={(event) =>
                    setLookupTerm(event.target.value)
                  }
                  className="editor-input"
                  placeholder="Ex.: nazireu, graça, arca"
                />
              </Field>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={assistantLoading !== null}
                  onClick={() => runAi("dictionary")}
                  className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-900 hover:bg-violet-100 disabled:opacity-50"
                >
                  Dicionário
                </button>
                <button
                  type="button"
                  disabled={assistantLoading !== null}
                  onClick={findRelatedStudies}
                  className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                >
                  Referências cruzadas
                </button>
              </div>

              {assistantLoading === "dictionary" && (
                <div className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-3 text-xs font-semibold text-violet-900">
                  Consultando o dicionário do acervo...
                </div>
              )}

              {suggestion?.action === "dictionary" && (
                <SuggestionCard
                  suggestion={suggestion}
                  onApply={applySuggestion}
                  onDiscard={() => setSuggestion(null)}
                />
              )}

              {assistantLoading === "library" && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-xs font-semibold text-amber-900">
                  Procurando referências cruzadas no acervo...
                </div>
              )}

              {related.length > 0 && (
                <div
                  data-related-results
                  className="space-y-2 border-t border-stone-100 pt-3"
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-stone-400">
                    Estudos relacionados
                  </p>
                  {related.map((item) => (
                    <Link
                      key={item.slug}
                      href={`/estudo/${item.slug}`}
                      target="_blank"
                      className="block rounded-lg border border-stone-200 p-3 hover:border-amber-300 hover:bg-amber-50"
                    >
                      {item.reference && (
                        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-amber-800">
                          {item.reference}
                        </span>
                      )}
                      <span className="mt-1 block text-xs font-semibold leading-5 text-stone-900">
                        {item.title}
                      </span>
                    </Link>
                  ))}
                </div>
              )}

              {assistantLoading === null &&
                related.length === 0 &&
                lookupTerm.trim() && (
                  <p className="text-[11px] leading-5 text-stone-400">
                    Use “Dicionário” para definir o termo com base no acervo ou
                    “Referências cruzadas” para localizar estudos relacionados.
                  </p>
                )}
            </Panel>

            <Panel title="Referências bíblicas" eyebrow="Detecção contextual + IA">
              <p className="text-xs leading-5 text-stone-500">
                O editor reconhece referências explícitas e também usa a
                referência principal como contexto. Ex.: com “Atos 27” como
                referência principal, “versículo 22” vira “Atos 27:22”.
                Para citações sem referência escrita, use a IA como sugestão.
              </p>

              {references.length === 0 ? (
                <p className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs leading-5 text-stone-500">
                  Nenhuma referência explícita reconhecida ainda.
                </p>
              ) : (
                <div className="space-y-2">
                  {references.slice(0, 24).map((reference) => {
                    const relation = referenceRelation(reference);

                    return (
                      <div
                        key={reference}
                        className={`rounded-lg border p-2.5 ${
                          relation === "IGNORE"
                            ? "border-stone-200 bg-white"
                            : relation === "MAIN"
                              ? "border-amber-300 bg-amber-50"
                              : "border-emerald-200 bg-emerald-50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-semibold text-stone-900">
                            {reference}
                          </span>

                          <select
                            value={relation}
                            onChange={(event) =>
                              setReferenceRelation(
                                reference,
                                event.target.value as
                                  | "IGNORE"
                                  | "MAIN"
                                  | "SECONDARY"
                                  | "CITED",
                              )
                            }
                            className="rounded-md border border-stone-300 bg-white px-2 py-1 text-[10px] font-semibold text-stone-700"
                          >
                            <option value="IGNORE">Não vincular</option>
                            <option value="MAIN">Principal</option>
                            <option value="SECONDARY">Secundária</option>
                            <option value="CITED">Citada</option>
                          </select>
                        </div>
                      </div>
                    );
                  })}

                  <p className="text-[10px] font-semibold text-emerald-700">
                    {references.length} detectada(s) · {approvedReferenceCount} aprovada(s).
                  </p>
                </div>
              )}

              <button
                type="button"
                disabled={assistantLoading !== null}
                onClick={() => runAi("detect_references")}
                className="w-full rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 disabled:opacity-50"
              >
                {assistantLoading === "detect_references"
                  ? "Detectando referências..."
                  : "Detectar citações com IA"}
              </button>

              {suggestion?.action === "detect_references" && (
                <SuggestionCard
                  suggestion={suggestion}
                  onApply={applySuggestion}
                  onDiscard={() => setSuggestion(null)}
                />
              )}

              <p className="text-[10px] leading-4 text-stone-400">
                Defina cada referência como Principal, Secundária, Citada ou
                “Não vincular”. Somente as aprovadas serão persistidas no DRAFT.
              </p>
            </Panel>

            <Panel
              title="Classificação editorial"
              eyebrow="IA + aprovação humana"
            >
              <p className="text-xs leading-5 text-stone-500">
                A IA sugere somente temas, personagens e séries já existentes
                no catálogo. Nada é associado sem sua aprovação.
              </p>

              <button
                type="button"
                disabled={classificationLoading}
                onClick={suggestClassification}
                className="w-full rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-900 hover:bg-sky-100 disabled:opacity-50"
              >
                {classificationLoading
                  ? "Analisando o estudo..."
                  : "Sugerir classificação com IA"}
              </button>

              <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-[11px] leading-5 text-stone-600">
                <strong>{approvedClassificationCount}</strong> vínculo(s)
                aprovado(s): {form.topic_ids?.length ?? 0} tema(s),{" "}
                {form.character_ids?.length ?? 0} personagem(ns) e{" "}
                {form.series_ids?.length ?? 0} série(s).
              </div>

              {classification && (
                <div className="space-y-4">
                  <ClassificationGroup
                    label="Temas sugeridos"
                    items={classification.topics}
                    selectedIds={form.topic_ids ?? []}
                    onToggle={(id) =>
                      toggleClassification("topics", id)
                    }
                    emptyText="Nenhum tema seguro foi sugerido."
                  />

                  <ClassificationGroup
                    label="Personagens sugeridos"
                    items={classification.characters}
                    selectedIds={form.character_ids ?? []}
                    onToggle={(id) =>
                      toggleClassification("characters", id)
                    }
                    emptyText="Nenhum personagem seguro foi sugerido."
                  />

                  <ClassificationGroup
                    label="Séries sugeridas"
                    items={classification.series}
                    selectedIds={form.series_ids ?? []}
                    onToggle={(id) =>
                      toggleClassification("series", id)
                    }
                    emptyText="Nenhuma série apresentou encaixe editorial forte."
                  />

                  {classification.catalogCounts && (
                    <p className="text-[10px] leading-4 text-stone-400">
                      Catálogo consultado:{" "}
                      {classification.catalogCounts.topics} temas,{" "}
                      {classification.catalogCounts.characters} personagens e{" "}
                      {classification.catalogCounts.series} séries.
                    </p>
                  )}
                </div>
              )}

              {!classification && !classificationLoading && (
                <p className="text-[10px] leading-4 text-stone-400">
                  As sugestões aparecem aqui para aprovação individual antes
                  de salvar o DRAFT.
                </p>
              )}

              {classificationError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-800">
                  {classificationError}
                </div>
              )}
            </Panel>

            <Panel
              title="Auditoria editorial"
              eyebrow={`${auditPass}/${audit.length} itens prontos`}
            >
              <div className="space-y-2">
                {audit.map((item) => (
                  <AuditRow key={item.id} item={item} />
                ))}
              </div>
            </Panel>

            {assistantError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs leading-5 text-red-800">
                {assistantError}
              </div>
            )}

          </aside>
        </main>
      </form>

      <style jsx global>{`
        .editor-input {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid rgb(214 211 209);
          background: white;
          padding: 0.55rem 0.7rem;
          font-size: 0.78rem;
          line-height: 1.25rem;
          color: rgb(28 25 23);
          outline: none;
        }

        .editor-input:focus {
          border-color: rgb(180 83 9);
          box-shadow: 0 0 0 2px rgb(254 243 199);
        }

        .editor-pane {
          scrollbar-gutter: stable;
          scrollbar-width: thin;
          scrollbar-color: rgb(168 162 158) transparent;
        }

        .editor-pane::-webkit-scrollbar {
          width: 8px;
        }

        .editor-pane::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: rgb(168 162 158);
        }

        .editor-pane::-webkit-scrollbar-track {
          background: transparent;
        }

        @media (min-width: 1280px) {
          .editor-workspace {
            overscroll-behavior: contain;
          }
        }
      `}</style>
    </div>
  );
}

function ClassificationGroup({
  label,
  items,
  selectedIds,
  onToggle,
  emptyText,
}: {
  label: string;
  items: ClassificationItem[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  emptyText: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-stone-400">
        {label}
      </p>

      {items.length === 0 ? (
        <p className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-[11px] leading-5 text-stone-500">
          {emptyText}
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const selected = selectedIds.includes(item.id);

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onToggle(item.id)}
                className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                  selected
                    ? "border-emerald-300 bg-emerald-50"
                    : "border-stone-200 bg-white hover:border-sky-300 hover:bg-sky-50"
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span
                    className={`text-xs font-semibold ${
                      selected
                        ? "text-emerald-900"
                        : "text-stone-900"
                    }`}
                  >
                    {item.name}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] ${
                      selected
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-stone-100 text-stone-500"
                    }`}
                  >
                    {selected ? "Aprovado" : item.confidence}
                  </span>
                </span>

                {item.reason && (
                  <span className="mt-1 block text-[10px] leading-4 text-stone-500">
                    {item.reason}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SuggestionCard({
  suggestion,
  onApply,
  onDiscard,
}: {
  suggestion: Suggestion;
  onApply: () => void;
  onDiscard: () => void;
}) {
  const isDictionary = suggestion.action === "dictionary";

  return (
    <div
      data-editor-suggestion={suggestion.action}
      className={`overflow-hidden rounded-xl border bg-white ${
        isDictionary ? "border-violet-200" : "border-sky-200"
      }`}
    >
      <div
        className={`border-b px-3 py-2.5 ${
          isDictionary
            ? "border-violet-100 bg-violet-50"
            : "border-sky-100 bg-sky-50"
        }`}
      >
        <p
          className={`text-[10px] font-bold uppercase tracking-[0.12em] ${
            isDictionary ? "text-violet-700" : "text-sky-700"
          }`}
        >
          {isDictionary
            ? "Resultado do dicionário"
            : "Sugestão — ainda não aplicada"}
        </p>
        <h3 className="mt-1 text-xs font-semibold text-stone-950">
          {suggestion.title}
        </h3>
      </div>

      <div className="p-3">
        <div className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-stone-50 p-3 text-xs leading-5 text-stone-700">
          {suggestion.result}
        </div>

        {suggestion.sources.length > 0 && (
          <div className="mt-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-stone-400">
              Fontes do acervo
            </p>
            <div className="mt-1 space-y-1">
              {suggestion.sources.map((source) => (
                <Link
                  key={source.slug}
                  href={
                    source.id && source.status !== "PUBLISHED"
                      ? `/admin/estudos/${source.id}`
                      : `/estudo/${source.slug}`
                  }
                  target="_blank"
                  className="block text-xs font-semibold text-sky-800 hover:underline"
                >
                  {source.title} →
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mt-3 flex gap-2">
          {suggestion.target !== "none" && (
            <button
              type="button"
              onClick={onApply}
              className="flex-1 rounded-lg bg-sky-700 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-800"
            >
              Aplicar no estudo
            </button>
          )}
          <button
            type="button"
            onClick={onDiscard}
            className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
          >
            {suggestion.target === "none" ? "Fechar" : "Descartar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Panel({
  title,
  eyebrow,
  accent = false,
  defaultOpen = true,
  children,
}: {
  title: string;
  eyebrow: string;
  accent?: boolean;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section
      className={`overflow-hidden rounded-xl border bg-white shadow-sm ${
        accent ? "border-sky-200" : "border-stone-200"
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-stone-50"
      >
        <span className="min-w-0">
          <span
            className={`block text-[10px] font-bold uppercase tracking-[0.14em] ${
              accent ? "text-sky-700" : "text-amber-800"
            }`}
          >
            {eyebrow}
          </span>
          <span className="mt-1 block font-serif text-lg font-semibold text-stone-950">
            {title}
          </span>
        </span>
        <span
          aria-hidden="true"
          className={`text-sm font-bold text-stone-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        >
          ⌃
        </span>
      </button>

      {open && (
        <div className="border-t border-stone-100 px-4 pb-4 pt-3">
          <div className="space-y-3">{children}</div>
        </div>
      )}
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold text-stone-700">
        {label}
      </span>
      {children}
    </label>
  );
}

function ToolbarButton({
  label,
  title,
  italic = false,
  onClick,
  onMouseDown,
}: {
  label: string;
  title: string;
  italic?: boolean;
  onClick: () => void;
  onMouseDown: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={onMouseDown}
      onClick={onClick}
      className={`rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-stone-700 hover:border-amber-300 hover:bg-amber-50 ${
        italic ? "italic" : ""
      }`}
    >
      {label}
    </button>
  );
}

function AuditRow({ item }: { item: AuditCheck }) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 ${
        item.status === "pass"
          ? "border-emerald-100 bg-emerald-50/70"
          : "border-amber-100 bg-amber-50/70"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
            item.status === "pass"
              ? "bg-emerald-600 text-white"
              : "bg-amber-500 text-white"
          }`}
        >
          {item.status === "pass" ? "✓" : "!"}
        </span>
        <span className="text-[11px] font-semibold text-stone-800">
          {item.label}
        </span>
      </div>
      <p className="mt-1 pl-6 text-[10px] leading-4 text-stone-500">
        {item.detail}
      </p>
    </div>
  );
}
