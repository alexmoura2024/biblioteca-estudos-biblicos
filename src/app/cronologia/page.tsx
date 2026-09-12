import type { Metadata } from "next";

const CRONOLOGIA_URL = "https://biblia-time-flow.base44.app";

export const metadata: Metadata = {
  title: "Cronologia Bíblica",
  description:
    "Explore uma linha do tempo interativa com acontecimentos da cronologia bíblica.",
};

export default function CronologiaPage() {
  return (
    <div className="min-h-screen bg-stone-50">
      <section className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">
              Recurso interativo
            </p>
            <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight text-stone-950">
              Cronologia Bíblica
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              Explore os acontecimentos bíblicos ao longo do tempo em uma
              experiência visual e interativa.
            </p>
          </div>

          <a
            href={CRONOLOGIA_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-2 rounded-md border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 transition hover:border-amber-400 hover:bg-amber-50 hover:text-amber-900"
          >
            Abrir em tela cheia
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      </section>

      <section
        className="mx-auto max-w-[1600px] px-0 py-0 sm:px-4 sm:py-4 lg:px-6"
        aria-label="Aplicativo de cronologia bíblica"
      >
        <div className="overflow-hidden border-y border-stone-200 bg-white shadow-sm sm:rounded-xl sm:border">
          <iframe
            src={CRONOLOGIA_URL}
            width="100%"
            className="h-[80vh] min-h-[600px] border-0"
            scrolling="auto"
            loading="lazy"
            allow="fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            title="Cronologia Bíblica"
          />
        </div>

        <p className="px-4 py-3 text-center text-xs leading-5 text-stone-500 sm:px-0">
          Se a visualização incorporada não carregar no seu navegador, use o
          botão “Abrir em tela cheia”.
        </p>
      </section>
    </div>
  );
}
