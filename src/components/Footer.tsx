import Link from "next/link";
import { siteConfig } from "@/lib/site";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-stone-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-stone-500 sm:px-6">
        <p>
          {siteConfig.nome} — protótipo com dados fictícios (Marco 1). Nenhum conteúdo aqui provém
          do acervo real.
        </p>
        <p className="mt-2">
          <Link href="/admin" className="underline hover:text-amber-700">
            Área administrativa
          </Link>
        </p>
      </div>
    </footer>
  );
}
