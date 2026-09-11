"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import ReactMarkdown from "react-markdown";
import type {
  OriginalOccurrence,
  OriginalWord,
} from "@/lib/bible/originalTypes";
import {
  buildWordCopyText,
  cleanLexicalGloss,
  cleanOriginalSurface,
  cleanTransliteration,
  describeMorphology,
} from "@/lib/bible/lexicalPresentation";

interface BibleVerse {
  verse: number;
  text: string;
}

interface BibleChapterReaderProps {
  bookName: string;
  bookSlug: string;
  chapter: number;
  versionName: string;
  privateUseOnly: boolean;
  copyrightNotice: string;
  verses: BibleVerse[];
  originalWords: OriginalWord[];
}

const FONT_LEVELS = [
  { label: "90%", size: "0.98rem", lineHeight: 1.82 },
  { label: "100%", size: "1.08rem", lineHeight: 1.86 },
  { label: "115%", size: "1.22rem", lineHeight: 1.9 },
  { label: "130%", size: "1.38rem", lineHeight: 1.92 },
] as const;

const FONT_STORAGE_KEY = "biblia-font-size-v1";

export function BibleChapterReader({
  bookName,
  bookSlug,
  chapter,
  versionName,
  privateUseOnly,
  copyrightNotice,
  verses,
  originalWords,
}: BibleChapterReaderProps) {
  const [fontLevel, setFontLevel] = useState(1);
  const [openVerse, setOpenVerse] = useState<number | null>(null);
  const [selectedWordId, setSelectedWordId] =
    useState<string | null>(null);
  const [explanations, setExplanations] = useState<
    Record<string, string>
  >({});
  const [explanationErrors, setExplanationErrors] = useState<
    Record<string, string>
  >({});
  const [loadingWordId, setLoadingWordId] =
    useState<string | null>(null);
  const [occurrences, setOccurrences] = useState<
    Record<
      string,
      {
        count: number;
        samples: OriginalOccurrence[];
      }
    >
  >({});
  const [occurrenceErrors, setOccurrenceErrors] = useState<
    Record<string, string>
  >({});
  const [loadingStrong, setLoadingStrong] =
    useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(
        FONT_STORAGE_KEY,
      );
      const parsed = Number(stored);

      if (
        Number.isInteger(parsed) &&
        parsed >= 0 &&
        parsed < FONT_LEVELS.length
      ) {
        setFontLevel(parsed);
      }
    } catch {
      // Preferência local é opcional.
    }
  }, []);

  function chooseFontLevel(next: number) {
    const safe = Math.max(
      0,
      Math.min(FONT_LEVELS.length - 1, next),
    );

    setFontLevel(safe);

    try {
      window.localStorage.setItem(
        FONT_STORAGE_KEY,
        String(safe),
      );
    } catch {
      // A leitura continua funcionando mesmo sem localStorage.
    }
  }

  const wordsByVerse = useMemo(() => {
    const grouped = new Map<number, OriginalWord[]>();

    for (const word of originalWords) {
      const current = grouped.get(word.verse) ?? [];
      current.push(word);
      grouped.set(word.verse, current);
    }

    return grouped;
  }, [originalWords]);

  const languageLabel =
    originalWords[0]?.language === "grc"
      ? "Grego · Textus Receptus"
      : "Hebraico";

  async function explainWord(word: OriginalWord) {
    setLoadingWordId(word.id);
    setExplanationErrors((current) => ({
      ...current,
      [word.id]: "",
    }));

    try {
      const response = await fetch(
        "/api/biblia/lexico/explain",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ wordId: word.id }),
        },
      );

      const data = (await response.json()) as {
        explanation?: string;
        error?: string;
      };

      if (!response.ok || !data.explanation) {
        throw new Error(
          data.error ||
            "Não foi possível explicar a palavra.",
        );
      }

      setExplanations((current) => ({
        ...current,
        [word.id]: data.explanation!,
      }));
    } catch (error) {
      setExplanationErrors((current) => ({
        ...current,
        [word.id]:
          error instanceof Error
            ? error.message
            : "Erro ao consultar a IA.",
      }));
    } finally {
      setLoadingWordId(null);
    }
  }

  async function loadOccurrences(strong: string) {
    setLoadingStrong(strong);
    setOccurrenceErrors((current) => ({
      ...current,
      [strong]: "",
    }));

    try {
      const response = await fetch(
        `/api/biblia/lexico/occurrences?strong=${encodeURIComponent(
          strong,
        )}`,
        { cache: "no-store" },
      );

      const data = (await response.json()) as {
        count?: number;
        samples?: OriginalOccurrence[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Não foi possível consultar ocorrências.",
        );
      }

      setOccurrences((current) => ({
        ...current,
        [strong]: {
          count: data.count ?? 0,
          samples: data.samples ?? [],
        },
      }));
    } catch (error) {
      setOccurrenceErrors((current) => ({
        ...current,
        [strong]:
          error instanceof Error
            ? error.message
            : "Erro ao consultar ocorrências.",
      }));
    } finally {
      setLoadingStrong(null);
    }
  }

  return (
    <details className="group overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 transition hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 sm:px-7 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-800">
            Texto bíblico · ACF
          </p>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="font-serif text-xl font-semibold text-stone-950 sm:text-2xl">
              {bookName} {chapter}
            </h2>
            <span className="text-xs text-stone-500">
              {verses.length} versículos
            </span>
            {originalWords.length > 0 && (
              <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-800">
                Original disponível
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900">
          <span className="group-open:hidden">
            Ler capítulo
          </span>
          <span className="hidden group-open:inline">
            Recolher
          </span>
          <span
            aria-hidden="true"
            className="text-base leading-none transition-transform duration-200 group-open:rotate-180"
          >
            ⌄
          </span>
        </div>
      </summary>

      <div className="border-t border-stone-200">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 bg-stone-50/70 px-5 py-3 sm:px-7">
          <div className="flex flex-wrap items-center gap-2 text-xs text-stone-600">
            <span className="font-semibold">
              Tamanho do texto
            </span>
            <button
              type="button"
              onClick={() =>
                chooseFontLevel(fontLevel - 1)
              }
              disabled={fontLevel === 0}
              className="h-8 min-w-8 rounded-md border border-stone-300 bg-white px-2 font-serif text-sm font-bold text-stone-700 hover:border-amber-400 disabled:opacity-35"
              aria-label="Diminuir tamanho do texto bíblico"
            >
              A−
            </button>
            <button
              type="button"
              onClick={() => chooseFontLevel(1)}
              className="h-8 min-w-8 rounded-md border border-stone-300 bg-white px-2 font-serif text-base font-bold text-stone-800 hover:border-amber-400"
              aria-label="Restaurar tamanho padrão"
            >
              A
            </button>
            <button
              type="button"
              onClick={() =>
                chooseFontLevel(fontLevel + 1)
              }
              disabled={
                fontLevel === FONT_LEVELS.length - 1
              }
              className="h-8 min-w-8 rounded-md border border-stone-300 bg-white px-2 font-serif text-lg font-bold text-stone-900 hover:border-amber-400 disabled:opacity-35"
              aria-label="Aumentar tamanho do texto bíblico"
            >
              A+
            </button>
            <span className="tabular-nums text-stone-400">
              {FONT_LEVELS[fontLevel].label}
            </span>
          </div>

          {originalWords.length > 0 && (
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-violet-700">
              {languageLabel} · Strong · Morfologia
            </span>
          )}
        </div>

        <div className="px-5 py-6 sm:px-7 lg:px-10">
          <div className="mx-auto max-w-4xl space-y-6">
            {verses.map((item) => {
              const verseWords =
                wordsByVerse.get(item.verse) ?? [];
              const isOriginalOpen =
                openVerse === item.verse;

              return (
                <div
                  key={item.verse}
                  id={`v${item.verse}`}
                  className="scroll-mt-28"
                >
                  <p
                    className="font-serif text-stone-800"
                    style={{
                      fontSize:
                        FONT_LEVELS[fontLevel].size,
                      lineHeight:
                        FONT_LEVELS[fontLevel]
                          .lineHeight,
                    }}
                  >
                    <Link
                      href={`/biblia/${bookSlug}/${chapter}#v${item.verse}`}
                      className="mr-2 align-super text-[0.68rem] font-bold text-amber-700 hover:underline"
                      aria-label={`${bookName} ${chapter}:${item.verse}`}
                    >
                      {item.verse}
                    </Link>
                    {item.text}
                  </p>

                  <div className="mt-1.5 flex flex-wrap items-center gap-3 pl-5 text-[10px] font-semibold">
                    {verseWords.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setOpenVerse(
                            isOriginalOpen
                              ? null
                              : item.verse,
                          );
                          setSelectedWordId(null);
                        }}
                        className="text-violet-700 hover:underline"
                      >
                        {isOriginalOpen
                          ? "Fechar original"
                          : verseWords[0].language ===
                              "grc"
                            ? "Ver grego"
                            : "Ver hebraico"}
                      </button>
                    )}

                    <Link
                      href={`/pergunte?pergunta=${encodeURIComponent(
                        `O que os estudos da Biblioteca dizem sobre ${bookName} ${chapter}:${item.verse}?`,
                      )}`}
                      className="text-amber-800 hover:underline"
                    >
                      Pergunte sobre o versículo
                    </Link>
                  </div>

                  {isOriginalOpen &&
                    verseWords.length > 0 && (
                      <OriginalVersePanel
                        reference={`${bookName} ${chapter}:${item.verse}`}
                        words={verseWords}
                        selectedWordId={
                          selectedWordId
                        }
                        onSelectWord={
                          setSelectedWordId
                        }
                        explanations={explanations}
                        explanationErrors={
                          explanationErrors
                        }
                        loadingWordId={
                          loadingWordId
                        }
                        onExplain={explainWord}
                        occurrences={occurrences}
                        occurrenceErrors={
                          occurrenceErrors
                        }
                        loadingStrong={
                          loadingStrong
                        }
                        onOccurrences={
                          loadOccurrences
                        }
                      />
                    )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t border-stone-100 bg-stone-50 px-5 py-3 text-[10px] leading-4 text-stone-400 sm:px-7">
          {privateUseOnly && (
            <>
              Uso pessoal/privado. {copyrightNotice}
              <br />
            </>
          )}
          {originalWords.length > 0 && (
            <>
              Dados linguísticos: STEPBible / Tyndale
              House, Cambridge — CC BY 4.0. No NT,
              as palavras exibidas são as presentes no
              Textus Receptus (TR).
            </>
          )}
        </div>
      </div>
    </details>
  );
}

function OriginalVersePanel({
  reference,
  words,
  selectedWordId,
  onSelectWord,
  explanations,
  explanationErrors,
  loadingWordId,
  onExplain,
  occurrences,
  occurrenceErrors,
  loadingStrong,
  onOccurrences,
}: {
  reference: string;
  words: OriginalWord[];
  selectedWordId: string | null;
  onSelectWord: (id: string | null) => void;
  explanations: Record<string, string>;
  explanationErrors: Record<string, string>;
  loadingWordId: string | null;
  onExplain: (word: OriginalWord) => void;
  occurrences: Record<
    string,
    {
      count: number;
      samples: OriginalOccurrence[];
    }
  >;
  occurrenceErrors: Record<string, string>;
  loadingStrong: string | null;
  onOccurrences: (strong: string) => void;
}) {
  const selected =
    words.find((word) => word.id === selectedWordId) ??
    null;
  const isHebrew = words[0]?.language === "he";

  return (
    <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50/40 p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-violet-700">
            {isHebrew
              ? "Hebraico bíblico"
              : "Grego · Textus Receptus"}
          </p>
          <p className="mt-0.5 text-xs text-stone-500">
            {reference} · clique em uma palavra
          </p>
        </div>

        <span className="text-[10px] text-stone-400">
          {words.length} palavra(s)
        </span>
      </div>

      <div
        dir={isHebrew ? "rtl" : "ltr"}
        className={`mt-3 flex flex-wrap gap-2 ${
          isHebrew ? "justify-end" : ""
        }`}
      >
        {words.map((word) => {
          const active =
            word.id === selectedWordId;

          return (
            <button
              key={word.id}
              type="button"
              onClick={() =>
                onSelectWord(
                  active ? null : word.id,
                )
              }
              className={`rounded-lg border bg-white px-3 py-2 text-left transition ${
                active
                  ? "border-violet-500 ring-2 ring-violet-100"
                  : "border-violet-200 hover:border-violet-400"
              }`}
            >
              <span
                dir={isHebrew ? "rtl" : "ltr"}
                className="block font-serif text-lg font-semibold text-stone-950"
              >
                {cleanOriginalSurface(word.surface)}
              </span>
              {cleanTransliteration(word.transliteration) && (
                <span
                  dir="ltr"
                  className="mt-0.5 block text-[9px] text-stone-400"
                >
                  {cleanTransliteration(word.transliteration)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selected && (
        <WordDetails
          word={selected}
          explanation={
            explanations[selected.id]
          }
          explanationError={
            explanationErrors[selected.id]
          }
          loadingExplanation={
            loadingWordId === selected.id
          }
          onExplain={() =>
            onExplain(selected)
          }
          occurrence={
            selected.strong
              ? occurrences[selected.strong]
              : undefined
          }
          occurrenceError={
            selected.strong
              ? occurrenceErrors[selected.strong]
              : undefined
          }
          loadingOccurrences={
            Boolean(selected.strong) &&
            loadingStrong === selected.strong
          }
          onOccurrences={() => {
            if (selected.strong) {
              onOccurrences(selected.strong);
            }
          }}
        />
      )}
    </div>
  );
}

function WordDetails({
  word,
  explanation,
  explanationError,
  loadingExplanation,
  onExplain,
  occurrence,
  occurrenceError,
  loadingOccurrences,
  onOccurrences,
}: {
  word: OriginalWord;
  explanation?: string;
  explanationError?: string;
  loadingExplanation: boolean;
  onExplain: () => void;
  occurrence?: {
    count: number;
    samples: OriginalOccurrence[];
  };
  occurrenceError?: string;
  loadingOccurrences: boolean;
  onOccurrences: () => void;
}) {
  const isHebrew = word.language === "he";
  const [copied, setCopied] = useState(false);
  const [meaningPt, setMeaningPt] = useState<string | null>(null);
  const [contextualPt, setContextualPt] = useState<string | null>(null);
  const [meaningLoading, setMeaningLoading] = useState(false);
  const [meaningError, setMeaningError] = useState("");

  const surface = cleanOriginalSurface(word.surface);
  const transliteration = cleanTransliteration(
    word.transliteration,
  );
  const morphologyDescription = describeMorphology(
    word.language,
    word.morphology,
  );
  const gloss = cleanLexicalGloss(word.gloss);
  const contextualTranslation = cleanLexicalGloss(
    word.contextualTranslation,
  );

  useEffect(() => {
    let cancelled = false;

    setMeaningPt(null);
    setContextualPt(null);
    setMeaningError("");

    if (
      (!word.strong || !gloss) &&
      !contextualTranslation
    ) {
      setMeaningLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setMeaningLoading(true);

    void fetch("/api/biblia/lexico/meaning", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ wordId: word.id }),
    })
      .then(async (response) => {
        const data = (await response.json()) as {
          meaningPt?: string | null;
          contextualPt?: string | null;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Não foi possível traduzir o sentido básico.",
          );
        }

        if (!cancelled) {
          setMeaningPt(data.meaningPt || null);
          setContextualPt(data.contextualPt || null);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setMeaningError(
            error instanceof Error
              ? error.message
              : "Erro ao traduzir o sentido básico.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setMeaningLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [word.id, word.strong, gloss]);

  async function copyWordData() {
    const text = buildWordCopyText({
      surface,
      transliteration,
      lemma: word.lemma,
      strong: word.strong,
      morphologyDescription,
      morphologyCode: word.morphology,
      gloss,
    });

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p
            dir={isHebrew ? "rtl" : "ltr"}
            className="font-serif text-3xl font-semibold text-stone-950"
          >
            {surface}
          </p>
          {transliteration && (
            <p className="mt-1 text-sm italic text-stone-500">
              {transliteration}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {word.isProperName && (
            <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[10px] font-semibold text-sky-800">
              Nome próprio
            </span>
          )}
          <button
            type="button"
            onClick={copyWordData}
            className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-[10px] font-semibold text-stone-600 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-900"
          >
            {copied ? "Copiado!" : "Copiar palavra + Strong"}
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <LexicalField
          label="Lema"
          value={word.lemma}
          dir={isHebrew ? "rtl" : "ltr"}
        />
        <LexicalField
          label="Strong"
          value={word.strong}
        />
        <LexicalField
          label="Forma gramatical"
          value={morphologyDescription}
        />
      </div>

      {(gloss || contextualTranslation) && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <LexicalField
            label="Sentido básico · português"
            value={
              meaningLoading
                ? "Traduzindo..."
                : meaningPt ||
                  (meaningError
                    ? "Tradução indisponível"
                    : null)
            }
          />
          <LexicalField
            label="Tradução contextual · português"
            value={
              meaningLoading && !contextualPt
                ? "Traduzindo..."
                : contextualPt ||
                  (meaningError
                    ? "Tradução indisponível"
                    : null)
            }
          />
        </div>
      )}

      {meaningError && (
        <p className="mt-2 text-[10px] text-amber-700">
          {meaningError}
        </p>
      )}

      <details className="mt-3 rounded-lg border border-stone-100 bg-stone-50">
        <summary className="cursor-pointer px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-stone-500">
          Dados técnicos
        </summary>
        <div className="grid gap-3 border-t border-stone-100 p-3 sm:grid-cols-2">
          <LexicalField
            label="Código morfológico"
            value={word.morphology}
          />
          <LexicalField
            label="Leitura morfológica"
            value={morphologyDescription}
          />
          <LexicalField
            label="Strong estendido"
            value={word.strongExtended}
          />
          <LexicalField
            label="Sentido lexical · português"
            value={
              meaningLoading
                ? "Traduzindo..."
                : meaningPt ||
                  (meaningError
                    ? "Tradução indisponível"
                    : null)
            }
          />
          <LexicalField
            label="Tradução contextual · português"
            value={
              meaningLoading && !contextualPt
                ? "Traduzindo..."
                : contextualPt ||
                  (meaningError
                    ? "Tradução indisponível"
                    : null)
            }
          />
        </div>
      </details>

      <p className="mt-2 text-[10px] leading-4 text-stone-400">
        Os identificadores técnicos (código morfológico e Strong)
        são preservados como na fonte. As descrições, o sentido
        lexical e a tradução contextual são apresentados em
        português.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {word.strong && (
          <button
            type="button"
            onClick={onOccurrences}
            disabled={loadingOccurrences}
            className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
          >
            {loadingOccurrences
              ? "Consultando..."
              : occurrence
                ? `${occurrence.count.toLocaleString(
                    "pt-BR",
                  )} ocorrência(s)`
                : "Onde aparece?"}
          </button>
        )}

        <button
          type="button"
          onClick={onExplain}
          disabled={loadingExplanation}
          className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-900 hover:bg-violet-100 disabled:opacity-50"
        >
          {loadingExplanation
            ? "Explicando..."
            : explanation
              ? "Explicação em português"
              : "Explicar no contexto com IA"}
        </button>
      </div>

      {occurrenceError && (
        <p className="mt-3 text-xs text-red-700">
          {occurrenceError}
        </p>
      )}

      {occurrence && (
        <div className="mt-4 rounded-lg border border-amber-100 bg-amber-50/50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-amber-800">
            Amostra de ocorrências
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {occurrence.samples.map((sample) => (
              <Link
                key={`${sample.bookSlug}-${sample.chapter}-${sample.verse}`}
                href={`/biblia/${sample.bookSlug}/${sample.chapter}#v${sample.verse}`}
                className="rounded-full border border-amber-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-100"
              >
                {sample.bookName} {sample.chapter}:
                {sample.verse}
              </Link>
            ))}
          </div>
        </div>
      )}

      {explanationError && (
        <p className="mt-3 text-xs text-red-700">
          {explanationError}
        </p>
      )}

      {explanation && (
        <div className="mt-4 rounded-lg border border-violet-200 bg-violet-50 p-4 text-stone-700">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.1em] text-violet-800">
            Explicação contextual assistida por IA
          </p>

          <ReactMarkdown
            components={{
              p: ({ children }) => (
                <p className="mb-3 text-sm leading-6 last:mb-0">
                  {children}
                </p>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-stone-950">
                  {children}
                </strong>
              ),
              ul: ({ children }) => (
                <ul className="mb-3 list-disc space-y-1 pl-5 text-sm leading-6 last:mb-0">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="mb-3 list-decimal space-y-1 pl-5 text-sm leading-6 last:mb-0">
                  {children}
                </ol>
              ),
              li: ({ children }) => <li>{children}</li>,
              h3: ({ children }) => (
                <h3 className="mb-2 mt-4 font-serif text-base font-semibold text-stone-950 first:mt-0">
                  {children}
                </h3>
              ),
              blockquote: ({ children }) => (
                <blockquote className="my-3 border-l-2 border-violet-300 pl-3 text-sm italic leading-6 text-stone-600">
                  {children}
                </blockquote>
              ),
              code: ({ children }) => (
                <code className="rounded bg-white px-1 py-0.5 text-xs text-violet-900">
                  {children}
                </code>
              ),
            }}
          >
            {explanation}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}

function LexicalField({
  label,
  value,
  dir = "ltr",
}: {
  label: string;
  value: string | null;
  dir?: "ltr" | "rtl";
}) {
  return (
    <div className="rounded-lg border border-stone-100 bg-stone-50 px-3 py-2">
      <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-stone-400">
        {label}
      </p>
      <p
        dir={dir}
        className="mt-1 break-words text-xs font-semibold text-stone-800"
      >
        {value || "—"}
      </p>
    </div>
  );
}
