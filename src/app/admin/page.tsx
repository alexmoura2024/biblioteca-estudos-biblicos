import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const metadata: Metadata = {
  title: "Administração",
};

/**
 * Placeholder da área administrativa/editorial.
 *
 * Autenticação pública, revisão editorial (DRAFT → REVIEW → PUBLISHED) e
 * ingestão do acervo real são trabalho das Fases 2–3+ do roadmap — ver
 * docs/ROADMAP.md e docs/INGESTION_SPEC.md. Esta página só existe para
 * satisfazer a rota /admin prevista no Marco 1; não há formulários,
 * login ou qualquer ação real aqui.
 */
export default function AdminPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Administração" }]} />
      <h1 className="mt-2 font-serif text-2xl font-bold text-stone-900">Área administrativa</h1>
      <div className="mt-4 rounded-lg border border-dashed border-stone-300 bg-stone-50 p-6 text-stone-600">
        <p>
          Esta área é reservada para a revisão editorial do acervo (fluxo DRAFT → REVIEW →
          PUBLISHED) e para a futura integração com o pipeline de ingestão do Google Drive.
        </p>
        <p className="mt-3">
          Ela ainda não existe nesta fase do projeto (Marco 1 — protótipo visual com dados
          mockados). Autenticação, formulários de edição e publicação chegam nas próximas fases,
          conforme <span className="font-medium">docs/ROADMAP.md</span>.
        </p>
      </div>
    </div>
  );
}
