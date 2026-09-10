/**
 * Formulário de busca reutilizável. É um form GET simples e continua
 * funcionando sem JavaScript, navegando para /busca?q=...
 */
export function SearchForm({
  defaultValue = "",
  size = "default",
  className = "",
  inputId = "q",
  compact = false,
  submitLabel = "Buscar",
}: {
  defaultValue?: string;
  size?: "default" | "large";
  className?: string;
  inputId?: string;
  compact?: boolean;
  submitLabel?: string;
}) {
  const isLarge = size === "large";

  return (
    <form
      action="/busca"
      method="GET"
      role="search"
      className={`flex w-full gap-2 ${className}`}
    >
      <label htmlFor={inputId} className="sr-only">
        Buscar estudos por referência, tema, personagem ou palavra-chave
      </label>

      <div className="relative min-w-0 flex-1">
        {compact && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-stone-400"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <circle cx="11" cy="11" r="6" />
              <path strokeLinecap="round" d="m16 16 4 4" />
            </svg>
          </span>
        )}

        <input
          id={inputId}
          name="q"
          type="search"
          defaultValue={defaultValue}
          placeholder={
            compact
              ? "Buscar no acervo..."
              : "Ex.: João 3:16, oração, Davi, perdão..."
          }
          className={`w-full min-w-0 rounded-md border border-stone-300 bg-white text-stone-900 shadow-sm placeholder:text-stone-400 focus:border-amber-600 ${
            compact ? "pl-9 pr-3" : "px-4"
          } ${isLarge ? "py-3 text-base" : "py-2 text-sm"}`}
        />
      </div>

      <button
        type="submit"
        className={`shrink-0 rounded-md bg-amber-700 font-medium text-white transition-colors hover:bg-amber-800 ${
          isLarge ? "px-6 py-3 text-base" : "px-4 py-2 text-sm"
        }`}
      >
        {submitLabel}
      </button>
    </form>
  );
}
