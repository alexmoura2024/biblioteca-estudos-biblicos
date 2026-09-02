import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-20 text-center sm:px-6">
      <span aria-hidden className="text-4xl">
        🔎
      </span>
      <h1 className="mt-4 font-serif text-2xl font-bold text-stone-900">Página não encontrada</h1>
      <p className="mt-2 text-stone-500">
        O conteúdo que você procura não existe ou ainda não foi publicado.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800"
      >
        Voltar para o início
      </Link>
    </div>
  );
}
