import type { Metadata } from "next";
import Link from "next/link";
import { StudyCard } from "@/components/StudyCard";
import { EmptyState } from "@/components/EmptyState";
import {
  bookRepository,
  characterRepository,
  searchRepository,
  seriesRepository,
  topicRepository,
} from "@/lib/repositories";
import { parseSearchQuery, INVALID_REFERENCE_MESSAGES } from "@/lib/search/queryParsing";
import type { Book } from "@/lib/types";

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
    page?: string;
  }>;
}

function formatReferenceLabel(ref: { book: Book; capitulo?: number; versiculoInicio?: number; versiculoFim?: number }) {
  let label = ref.book.nome;
  if (ref.capitulo != null) label += ` ${ref.capitulo}`;
  if (ref.versiculoInicio != null) label += `:${ref.versiculoInicio}`;
  if (ref.versiculoFim != null) label += `-${ref.versiculoFim}`;
  return label;
}

export default async function BuscaPage({ searchParams }: BuscaPageProps) {
  const params = await searchParams;
  const q = params.q ?? "";

  const [books, topics, characters, seriesList] = await Promise.all([
    bookRepository.listAll(),
    topicRepository.listAll(),
    characterRepository.listAll(),
    seriesRepository.listAll(),
  ]);

  const testamento =
    params.testamento === "AT" || params.testamento === "NT" ? params.testamento : undefined;
  const page = params.page ? Number(params.page) : undefined;

  // Fase A/B: extrai referência bíblica (se houver) do texto livre. Esta
  // é a única camada que sabe que "Jo" pode ser ambíguo ou que "João
  // 999:999" é impossível — SearchRepository só recebe critérios já
  // validados (ver src/lib/search/queryParsing.ts).
  const parsedQuery = parseSearchQuery(q);

  const canSearch = !parsedQuery.ambiguousReference;
  const outcome = canSearch
    ? await searchRepository.search({
        texto: parsedQuery.texto,
        referencia: parsedQuery.referencia,
        livro: params.livro || undefined,
        testamento,
        tema: params.tema || undefined,
        personagem: params.personagem || undefined,
        serie: params.serie || undefined,
        page,
      })
    : { items: [], total: 0, page: 1, limit: 24 };

  const hasActiveFilters = Boolean(
    params.livro || testamento || params.tema || params.personagem || params.serie,
  );
  const hasQuery = q.trim().length > 0;
  const hasMorePages = outcome.total > outcome.page * outcome.limit;
  const hasPreviousPage = outcome.page > 1;

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
          {parsedQuery.ambiguousReference && (
            <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-medium">
                &ldquo;{parsedQuery.ambiguousReference.matchedText}&rdquo; pode se referir a mais de um livro.
                Você quis dizer:
              </p>
              <ul className="mt-2 flex flex-wrap gap-3">
                {parsedQuery.ambiguousReference.candidates.map((book) => (
                  <li key={book.id}>
                    <Link
                      href={`/busca?q=${encodeURIComponent(q.replace(parsedQuery.ambiguousReference!.matchedText, book.nome))}`}
                      className="font-medium underline hover:text-amber-700"
                    >
                      {book.nome}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {parsedQuery.invalidReference && (
            <div className="mt-6 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900">
              <p className="font-medium">
                &ldquo;{parsedQuery.invalidReference.matchedText}&rdquo; não é uma referência bíblica válida.
              </p>
              <p className="mt-1">
                {INVALID_REFERENCE_MESSAGES[parsedQuery.invalidReference.reason]({
                  bookName: parsedQuery.invalidReference.book.nome,
                  totalCapitulos: parsedQuery.invalidReference.book.totalCapitulos,
                  capitulo: parsedQuery.invalidReference.capitulo,
                  versiculoMaximo: parsedQuery.invalidReference.versiculoMaximo,
                })}
              </p>
            </div>
          )}

          {parsedQuery.recognizedReference && (
            <p className="mt-6 text-sm text-stone-500">
              Referência reconhecida:{" "}
              <span className="font-medium text-stone-700">
                {formatReferenceLabel(parsedQuery.recognizedReference)}
              </span>
            </p>
          )}

          {canSearch && (
            <>
              <p className="mt-4 text-sm text-stone-500">
                {outcome.total} {outcome.total === 1 ? "estudo encontrado" : "estudos encontrados"}
              </p>

              {outcome.items.length > 0 ? (
                <>
                  <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {outcome.items.map(({ study }) => (
                      <StudyCard key={study.id} study={study} />
                    ))}
                  </div>
                  {(hasPreviousPage || hasMorePages) && (
                    <nav aria-label="Paginação de resultados" className="mt-6 flex justify-center gap-3 text-sm">
                      {hasPreviousPage && (
                        <Link
                          href={buildPageHref(params, outcome.page - 1)}
                          className="rounded-md border border-stone-300 px-3 py-1.5 hover:border-amber-600 hover:text-amber-700"
                        >
                          ← Página anterior
                        </Link>
                      )}
                      {hasMorePages && (
                        <Link
                          href={buildPageHref(params, outcome.page + 1)}
                          className="rounded-md border border-stone-300 px-3 py-1.5 hover:border-amber-600 hover:text-amber-700"
                        >
                          Próxima página →
                        </Link>
                      )}
                    </nav>
                  )}
                </>
              ) : (
                !parsedQuery.invalidReference && (
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
        </>
      )}
    </div>
  );
}

function buildPageHref(
  params: Awaited<BuscaPageProps["searchParams"]>,
  page: number,
): string {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.livro) search.set("livro", params.livro);
  if (params.testamento) search.set("testamento", params.testamento);
  if (params.tema) search.set("tema", params.tema);
  if (params.personagem) search.set("personagem", params.personagem);
  if (params.serie) search.set("serie", params.serie);
  search.set("page", String(page));
  return `/busca?${search.toString()}`;
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
