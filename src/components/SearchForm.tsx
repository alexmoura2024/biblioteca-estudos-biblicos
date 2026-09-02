/**
 * Formulário de busca reutilizável (home e cabeçalho). É um `<form>` GET
 * simples — funciona sem JavaScript, navegando para /busca?q=...; a
 * página de busca é quem lê `searchParams` e executa `searchStudies`.
 */
export function SearchForm({
  defaultValue = "",
  size = "default",
  className = "",
}: {
  defaultValue?: string;
  size?: "default" | "large";
  className?: string;
}) {
  const isLarge = size === "large";
  return (
    <form action="/busca" method="GET" role="search" className={`flex w-full gap-2 ${className}`}>
      <label htmlFor="q" className="sr-only">
        Buscar estudos por referência, tema, personagem ou palavra-chave
      </label>
      <input
        id="q"
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder="Ex.: João 3:16, oração, Davi, perdão..."
        className={`min-w-0 flex-1 rounded-md border border-stone-300 bg-white px-4 text-stone-900 shadow-sm placeholder:text-stone-400 focus:border-amber-600 ${
          isLarge ? "py-3 text-base" : "py-2 text-sm"
        }`}
      />
      <button
        type="submit"
        className={`shrink-0 rounded-md bg-amber-700 font-medium text-white transition-colors hover:bg-amber-800 ${
          isLarge ? "px-6 py-3 text-base" : "px-4 py-2 text-sm"
        }`}
      >
        Buscar
      </button>
    </form>
  );
}
