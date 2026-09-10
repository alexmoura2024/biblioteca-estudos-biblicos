import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CollectionHero } from "@/components/CollectionHero";
import { EmptyState } from "@/components/EmptyState";
import { StudyCard } from "@/components/StudyCard";
import {
  bookRepository,
  characterRepository,
  searchRepository,
  seriesRepository,
  topicRepository,
} from "@/lib/repositories";
import {
  INVALID_REFERENCE_MESSAGES,
  parseSearchQuery,
} from "@/lib/search/queryParsing";
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

function formatReferenceLabel(ref: {
  book: Book;
  capitulo?: number;
  versiculoInicio?: number;
  versiculoFim?: number;
}) {
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
    params.testamento === "AT" || params.testamento === "NT"
      ? params.testamento
      : undefined;
  const page = params.page ? Number(params.page) : undefined;

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
    params.livro ||
      testamento ||
      params.tema ||
      params.personagem ||
      params.serie,
  );
  const hasQuery = q.trim().length > 0;
  const hasMorePages = outcome.total > outcome.page * outcome.limit;
  const hasPreviousPage = outcome.page > 1;

  return (
    <div className="min-h-screen bg-[#fcfbf8]">
      <CollectionHero
        eyebrow="Pesquisa no acervo"
        title="Buscar estudos"
        description="Pesquise por referência bíblica, tema, personagem, série ou palavra-chave e refine os resultados pelos filtros."
        meta={
          hasQuery || hasActiveFilters ? (
            <span className="font-semibold text-amber-800">
              {outcome.total}{" "}
              {outcome.total === 1 ? "estudo encontrado" : "estudos encontrados"}
            </span>
          ) : (
            <span>Use a busca livre ou combine os filtros abaixo.</span>
          )
        }
        breadcrumbs={
          <Breadcrumbs
            items={[{ label: "Início", href: "/" }, { label: "Busca" }]}
          />
        }
      />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <form
          method="GET"
          action="/busca"
          className="grid grid-cols-1 gap-4 rounded-xl border border-stone-200 bg-white p-5 shadow-sm sm:grid-cols-6 sm:p-6"
        >
          <div className="sm:col-span-6">
            <label
              htmlFor="q"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.08em] text-stone-500"
            >
              Palavra-chave ou referência
            </label>

            <input
              id="q"
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Ex.: João 3:16, oração, Davi..."
              className="w-full rounded-md border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 shadow-sm placeholder:text-stone-400 focus:border-amber-600"
            />

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-stone-500">
              <span>Experimente:</span>
              {[
                ["João 3:16", "João 3:16"],
                ["oração", "oração"],
                ["Davi", "Davi"],
                ["salvação", "salvação"],
              ].map(([label, value]) => (
                <Link
                  key={value}
                  href={`/busca?q=${encodeURIComponent(value)}`}
                  className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          <FilterSelect
            name="livro"
            label="Livro"
            defaultValue={params.livro}
            options={books.map((book) => ({
              value: book.slug,
              label: book.nome,
            }))}
          />

          <FilterSelect
            name="testamento"
            label="Testamento"
            defaultValue={params.testamento}
            options={[
              { value: "AT", label: "Antigo Testamento" },
              { value: "NT", label: "Novo Testamento" },
            ]}
          />

          <FilterSelect
            name="tema"
            label="Tema"
            defaultValue={params.tema}
            options={topics.map((topic) => ({
              value: topic.slug,
              label: topic.nome,
            }))}
          />

          <FilterSelect
            name="personagem"
            label="Personagem"
            defaultValue={params.personagem}
            options={characters.map((character) => ({
              value: character.slug,
              label: character.nome,
            }))}
          />

          <FilterSelect
            name="serie"
            label="Série"
            defaultValue={params.serie}
            options={seriesList.map((series) => ({
              value: series.slug,
              label: series.nome,
            }))}
          />

          <div className="flex items-end sm:col-span-1">
            <button
              type="submit"
              className="w-full rounded-md bg-amber-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-900"
            >
              Filtrar
            </button>
          </div>
        </form>

        {(hasQuery || hasActiveFilters) && (
          <section className="mt-10">
            {parsedQuery.ambiguousReference && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950">
                <p className="font-semibold">
                  &ldquo;{parsedQuery.ambiguousReference.matchedText}&rdquo;
                  pode se referir a mais de um livro. Você quis dizer:
                </p>

                <ul className="mt-3 flex flex-wrap gap-3">
                  {parsedQuery.ambiguousReference.candidates.map((book) => (
                    <li key={book.id}>
                      <Link
                        href={`/busca?q=${encodeURIComponent(
                          q.replace(
                            parsedQuery.ambiguousReference!.matchedText,
                            book.nome,
                          ),
                        )}`}
                        className="font-semibold underline hover:text-amber-700"
                      >
                        {book.nome}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {parsedQuery.invalidReference && (
              <div className="rounded-xl border border-red-300 bg-red-50 p-5 text-sm text-red-950">
                <p className="font-semibold">
                  &ldquo;{parsedQuery.invalidReference.matchedText}&rdquo; não é
                  uma referência bíblica válida.
                </p>

                <p className="mt-1">
                  {INVALID_REFERENCE_MESSAGES[
                    parsedQuery.invalidReference.reason
                  ]({
                    bookName: parsedQuery.invalidReference.book.nome,
                    totalCapitulos:
                      parsedQuery.invalidReference.book.totalCapitulos,
                    capitulo: parsedQuery.invalidReference.capitulo,
                    versiculoMaximo:
                      parsedQuery.invalidReference.versiculoMaximo,
                  })}
                </p>
              </div>
            )}

            {parsedQuery.recognizedReference && (
              <p className="mt-4 text-sm text-stone-500">
                Referência reconhecida:{" "}
                <span className="font-semibold text-stone-700">
                  {formatReferenceLabel(parsedQuery.recognizedReference)}
                </span>
              </p>
            )}

            {canSearch && (
              <>
                <div className="mt-6 flex flex-col gap-2 border-b border-stone-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
                      Resultados
                    </p>
                    <h2 className="mt-1 font-serif text-2xl font-semibold text-stone-950">
                      Estudos encontrados
                    </h2>
                  </div>

                  <span className="text-sm text-stone-500">
                    {outcome.total}{" "}
                    {outcome.total === 1 ? "resultado" : "resultados"}
                  </span>
                </div>

                {outcome.items.length > 0 ? (
                  <>
                    <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                      {outcome.items.map(({ study, matchedOn }) => (
                        <div key={study.id}>
                          <StudyCard study={study} />

                          {matchedOn.length > 0 && (
                            <div className="mt-2 flex flex-wrap items-center gap-1.5 px-1 text-[11px] text-stone-500">
                              <span className="font-medium">Encontrado em:</span>
                              {matchedOn.slice(0, 5).map((reason) => (
                                <span
                                  key={reason}
                                  className="rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5"
                                >
                                  {reason}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {(hasPreviousPage || hasMorePages) && (
                      <nav
                        aria-label="Paginação de resultados"
                        className="mt-8 flex justify-center gap-3 text-sm"
                      >
                        {hasPreviousPage && (
                          <Link
                            href={buildPageHref(params, outcome.page - 1)}
                            className="rounded-md border border-stone-300 bg-white px-4 py-2 font-medium text-stone-700 hover:border-amber-500 hover:text-amber-800"
                          >
                            ← Página anterior
                          </Link>
                        )}

                        {hasMorePages && (
                          <Link
                            href={buildPageHref(params, outcome.page + 1)}
                            className="rounded-md border border-stone-300 bg-white px-4 py-2 font-medium text-stone-700 hover:border-amber-500 hover:text-amber-800"
                          >
                            Próxima página →
                          </Link>
                        )}
                      </nav>
                    )}
                  </>
                ) : (
                  !parsedQuery.invalidReference && (
                    <div className="mt-6">
                      <EmptyState
                        title="Nenhum estudo encontrado"
                        description="Tente outra palavra-chave, referência bíblica ou remova alguns filtros."
                      />
                    </div>
                  )
                )}
              </>
            )}
          </section>
        )}
      </div>
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
      <label
        htmlFor={name}
        className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.08em] text-stone-500"
      >
        {label}
      </label>

      <select
        id={name}
        name={name}
        defaultValue={defaultValue ?? ""}
        className="w-full rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-800 focus:border-amber-600"
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
