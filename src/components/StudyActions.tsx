"use client";

import { useState } from "react";

interface StudyActionsProps {
  title: string;
}

const FONT_SIZES = [0.92, 1, 1.1, 1.2] as const;

function fallbackCopy(text: string) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

export function StudyActions({ title }: StudyActionsProps) {
  const [fontIndex, setFontIndex] = useState(1);
  const [feedback, setFeedback] = useState("");

  function showFeedback(message: string) {
    setFeedback(message);
    window.setTimeout(() => setFeedback(""), 2200);
  }

  async function copyLink() {
    const url = window.location.href;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        fallbackCopy(url);
      }
      showFeedback("Link copiado.");
    } catch {
      fallbackCopy(url);
      showFeedback("Link copiado.");
    }
  }

  async function shareStudy() {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: `Estudo bíblico: ${title}`,
          url,
        });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    await copyLink();
  }

  function handlePrint() {
    window.print();
  }

  function changeFont(delta: number) {
    const nextIndex = Math.max(
      0,
      Math.min(FONT_SIZES.length - 1, fontIndex + delta),
    );

    setFontIndex(nextIndex);

    const content = document.querySelector<HTMLElement>(".study-content");
    if (content) {
      content.style.fontSize = `${FONT_SIZES[nextIndex]}rem`;
    }

    showFeedback(
      nextIndex === 1
        ? "Tamanho padrão."
        : nextIndex > fontIndex
          ? "Texto aumentado."
          : "Texto reduzido.",
    );
  }

  const buttonClass =
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700 shadow-sm transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50/80 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={shareStudy} className={buttonClass}>
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-4 w-4"
          >
            <circle cx="18" cy="5" r="2.5" />
            <circle cx="6" cy="12" r="2.5" />
            <circle cx="18" cy="19" r="2.5" />
            <path d="m8.2 10.8 7.6-4.5M8.2 13.2l7.6 4.5" />
          </svg>
          Compartilhar
        </button>

        <button type="button" onClick={copyLink} className={buttonClass}>
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-4 w-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 15 15 9M8.2 16.8l-1.4 1.4a3.54 3.54 0 0 1-5-5l3-3a3.54 3.54 0 0 1 5 0M15.8 7.2l1.4-1.4a3.54 3.54 0 0 1 5 5l-3 3a3.54 3.54 0 0 1-5 0"
            />
          </svg>
          Copiar link
        </button>

        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-amber-700 bg-amber-700 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2"
          title="Abre a impressão do navegador; nela você pode imprimir ou salvar em PDF."
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-4 w-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v7H6z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 12h.01" />
          </svg>
          Imprimir / PDF
        </button>

        <div
          className="ml-0 flex items-center overflow-hidden rounded-md border border-stone-300 bg-white sm:ml-auto"
          aria-label="Tamanho do texto"
        >
          <button
            type="button"
            onClick={() => changeFont(-1)}
            disabled={fontIndex === 0}
            className="min-h-10 px-3 text-sm font-semibold text-stone-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-35"
            aria-label="Diminuir tamanho do texto"
            title="Diminuir texto"
          >
            A−
          </button>
          <span className="border-x border-stone-200 px-3 text-xs font-medium text-stone-500">
            Leitura
          </span>
          <button
            type="button"
            onClick={() => changeFont(1)}
            disabled={fontIndex === FONT_SIZES.length - 1}
            className="min-h-10 px-3 text-sm font-semibold text-stone-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-35"
            aria-label="Aumentar tamanho do texto"
            title="Aumentar texto"
          >
            A+
          </button>
        </div>
      </div>

      <p
        className="mt-2 min-h-4 text-xs text-stone-500"
        role="status"
        aria-live="polite"
      >
        {feedback}
      </p>
    </div>
  );
}
