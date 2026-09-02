import type { Metadata } from "next";
import Link from "next/link";
import { StudyCard } from "@/components/StudyCard";
import { EmptyState } from "@/components/EmptyState";
import { studyRepository, bookRepository, topicRepository, characterRepository, seriesRepository } from "@/lib/repositories";
import { searchStudies } from "@/lib/search/search";

export const metadata: Metadata = {
  title: "Busca",
};

interface BuscaPageProps {
  searchParams: Promise<{
    q?: string;
    livro?: string;
    testamento?: string;
    tema?: string;
    personagem?: string;
    serie?: string;
  }>;
}

export default async function BuscaPage({ searchParams }: BuscaPageProps) {
  const params = await searchParams;
  const q = params.q ?? "";

  const [studies, books, topics, characters, seriesList] = await Promise.all([
    studyRepository.listPublished(),
    bookRepository.listAll(),
    topicRepository.listAll(),
    characterRepository.listAll(),
    seriesRepository.listAll(),
  ]);

  const testamento =
    params.testamento === "AT" || params.testamento === "NT" ? params.testamento : undefined;

  const result = searchStudies(studies, q, {
    livro: params.livro || undefined,
    testamento,
    tema: params.tema || undefined,
    personagem: params.personagem || undefined,
    serie: params.serie || undefined,
  });

  const hasActiveFilters = Boolean(
    params.livro || testamento || params.tema || params.personagem || params.serie,
  );
  const hasQuery = q.trim().length > 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="font-serif text-2xl font-bold text-stone-900">Buscar estudos</h1>
      <p className="mt-1 text-sm text-stone-500">
        Por referência bíblica (ex.: João 3:16), tema, personagem, série ou palavra-chave.
      </p>

      <form
        method="GET"
        action="/busca"
        className="mt-6 grid grid-cols-1 gap-3 rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:grid-cols-6"
      >
        <div className="sm:col-span-6">
          <label htmlFor="q" className="mb-1 block text-xs font-medium text-stone-500">
            Palavra-chave ou referência
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Ex.: João 3:16, oração, Davi..."
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-amber-600"
          />
        </div>

        <FilterSelect name="livro" label="Livro" defaultValue={params.livro} options={books.map((b) => ({ value: b.slug, label: b.nome }))} />
        <FilterSelect
          name="testamento"
          label="Testamento"
          defaultValue={params.testamento}
          options={[
            { value: "AT", label: "Antigo Testamento" },
            { value: "NT", label: "Novo Testamento" },
          ]}
        />
        <FilterSelect name="tema" label="Tema" defaultValue={params.tema} options={topics.map((t) => ({ value: t.slug, label: t.nome }))} />
        <FilterSelect
          name="personagem"
          label="Personagem"
          defaultValue={params.personagem}
          options={characters.map((c) => ({ value: c.slug, label: c.nome }))}
        />
        <FilterSelect name="serie" label="Série" defaultValue={params.serie} options={seriesList.map((s) => ({ value: s.slug, label: s.nome }))} />

        <div className="flex items-end sm:col-span-1">
          <button
            type="submit"
            className="w-full rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800"
          >
            Filtrar
          </button>
        </div>
      </form>

      {(hasQuery || hasActiveFilters) && (
        <>
          {result.ambiguousReference && (
            <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-medium">
                &ldquo;{result.ambiguousReference.matchedText}&rdquo; pode se referir a mais de um livro.
                Você quis dizer:
              </p>
              <ul className="mt-2 flex flex-wrap gap-3">
                {result.ambiguousReference.candidates.map((book) => (
                  <li key={book.id}>
                    <Link
                      href={`/busca?q=${encodeURIComponent(q.replace(result.ambiguousReference!.matchedText, book.nome))}`}
                      className="font-medium underline hover:text-amber-700"
                    >
                      {book.nome}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.recognizedReference && (
            <p className="mt-6 text-sm text-stone-500">
              Referência reconhecida:{" "}
              <span className="font-medium text-stone-700">
                {result.recognizedReference.book.nome}
                {result.recognizedReference.capitulo != null && ` ${result.recognizedReference.capitulo}`}
                {result.recognizedReference.versiculoInicio != null &&
                  `:${result.recognizedReference.versiculoInicio}`}
                {result.recognizedReference.versiculoFim != null &&
                  `-${result.recognizedReference.versiculoFim}`}
              </span>
            </p>
          )}

          <p className="mt-4 text-sm text-stone-500">
            {result.items.length}{" "}
            {result.items.length === 1 ? "estudo encontrado" : "estudos encontrados"}
          </p>

          {result.items.length > 0 ? (
            <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {result.items.map(({ study }) => (
                <StudyCard key={study.id} study={study} />
              ))}
            </div>
          ) : (
            !result.ambiguousReference && (
              <div className="mt-4">
                <EmptyState
                  title="Nenhum estudo encontrado"
                  description="Tente outra palavra-chave, referência bíblica ou remova alguns filtros."
                />
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}

function FilterSelect({
  name,
  label,
  defaultValue,
  options,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="sm:col-span-1">
      <label htmlFor={name} className="mb-1 block text-xs font-medium text-stone-500">
        {label}
      </label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue ?? ""}
        className="w-full rounded-md border border-stone-300 bg-white px-2 py-2 text-sm focus:border-amber-600"
      >
        <option value="">Todos</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
