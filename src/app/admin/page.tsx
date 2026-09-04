import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const metadata: Metadata = {
  title: "Painel Editorial",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Breadcrumbs
        items={[
          { label: "Início", href: "/" },
          { label: "Administração" },
        ]}
      />

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-stone-900">
            Painel Editorial
          </h1>
          <p className="mt-2 text-stone-600">
            Gestão e revisão do acervo da Biblioteca de Estudos Bíblicos.
          </p>
        </div>

        <span className="inline-flex w-fit items-center rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-800">
          Acesso protegido
        </span>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <Link
          href="/admin/estudos"
          className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm transition hover:border-stone-400 hover:shadow-md"
        >
          <h2 className="text-xl font-semibold text-stone-900">
            Estudos em revisão
          </h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Acessar estudos em DRAFT e REVIEW, consultar conteúdo e realizar
            revisão editorial.
          </p>
          <p className="mt-4 text-sm font-medium text-stone-900">
            Abrir área editorial →
          </p>
        </Link>

        <Link
          href="/"
          className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm transition hover:border-stone-400 hover:shadow-md"
        >
          <h2 className="text-xl font-semibold text-stone-900">
            Biblioteca pública
          </h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Visualizar a experiência pública de navegação, pesquisa, Bíblia,
            temas, personagens e séries.
          </p>
          <p className="mt-4 text-sm font-medium text-stone-900">
            Abrir site público →
          </p>
        </Link>
      </div>

      <div className="mt-8 rounded-xl border border-stone-200 bg-stone-50 p-6">
        <h2 className="text-lg font-semibold text-stone-900">
          Estado do ambiente
        </h2>

        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex items-start justify-between gap-4 border-b border-stone-200 pb-3">
            <dt className="font-medium text-stone-700">Segurança administrativa</dt>
            <dd className="text-emerald-700">Ativa</dd>
          </div>

          <div className="flex items-start justify-between gap-4 border-b border-stone-200 pb-3">
            <dt className="font-medium text-stone-700">Deploy público</dt>
            <dd className="text-emerald-700">Ativo no Vercel</dd>
          </div>

          <div className="flex items-start justify-between gap-4">
            <dt className="font-medium text-stone-700">
              Supabase de produção
            </dt>
            <dd className="text-emerald-700">Conectado ao Supabase</dd>
          </div>
        </dl>
      </div>

      <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-5">
        <p className="text-sm leading-6 text-amber-900">
          Banco de produção conectado. Estudos só ficam públicos quando estão
          em PUBLISHED e com visibilidade publico, protegidos pelas políticas RLS.
        </p>
      </div>
    </div>
  );
}
