import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CollectionHero } from "@/components/CollectionHero";
import { EmptyState } from "@/components/EmptyState";
import { StudyCard } from "@/components/StudyCard";
import {
  characterRepository,
  searchRepository,
  studyRepository,
} from "@/lib/repositories";
import type {
  NormalizedReference,
  SearchOutcome,
} from "@/lib/repositories/types";
import {
  findMentionedCharacter,
  isFactualLibraryQuestion,
  prepareLibraryQuestion,
  shouldUseAiFallback,
} from "@/lib/search/libraryQuestion";
import { answerLibraryQuestionWithOpenAI } from "@/lib/search/openaiLibraryAnswer";
import { rewriteLibraryQuestionWithOpenAI } from "@/lib/search/openaiLibraryQuestion";
import {
  INVALID_REFERENCE_MESSAGES,
  parseSearchQuery,
} from "@/lib/search/queryParsing";

export const metadata: Metadata = {
  title: "Pergunte à Biblioteca",
  description:
    "Faça uma pergunta em linguagem natural e encontre respostas fundamentadas somente no acervo publicado.",
};

interface PerguntePageProps {
  searchParams: Promise<{ pergunta?: string }>;
}

const EXAMPLES = [
  "O que os estudos dizem sobre o chamado de Moisés?",
  "Quantos anos Davi reinou?",
  "O que diz João 3:16 sobre salvação?",
  "Quais estudos falam sobre Davi?",
] as const;

const EMPTY_OUTCOME: SearchOutcome = {
  items: [],
  total: 0,
  page: 1,
  limit: 8,
};

function formatReferenceLabel(ref: NormalizedReference): string {
  let label = ref.book.nome;
  if (ref.capitulo != null) label += ` ${ref.capitulo}`;
  if (ref.versiculoInicio != null) label += `:${ref.versiculoInicio}`;
  if (ref.versiculoFim != null) label += `-${ref.versiculoFim}`;
  return label;
}

export default async function PerguntePage({
  searchParams,
}: PerguntePageProps) {
  const params = await searchParams;
  const question = params.pergunta?.trim() ?? "";
  const parsed = parseSearchQuery(question);
  const preparedText = prepareLibraryQuestion(parsed.texto);

  const characters = question ? await characterRepository.listAll() : [];
  const mentionedCharacter = question
    ? findMentionedCharacter(question, characters)
    : undefined;

  const hasCriteria = Boolean(
    parsed.referencia || preparedText || mentionedCharacter,
  );
  const canSearch = Boolean(
    question &&
      hasCriteria &&
      !parsed.ambiguousReference &&
      !parsed.invalidReference,
  );

  const factualQuestion = canSearch && isFactualLibraryQuestion(question);

  const runSearch = async (
    text: string,
    limit = factualQuestion ? 12 : 8,
  ): Promise<SearchOutcome> =>
    searchRepository.search({
      texto: text || undefined,
      referencia: parsed.referencia,
      personagem: mentionedCharacter?.slug,
      mode: "strict",
      page: 1,
      limit,
    });

  let outcome = canSearch ? await runSearch(preparedText) : EMPTY_OUTCOME;
  let effectiveText = preparedText;
  let queryAiUsed = false;

  // Perguntas factuais preservam os termos naturais reduzidos e usam a IA
  // somente depois da recuperação, para não acrescentar termos desconhecidos
  // como "duração" e tornar a busca estrita artificialmente restritiva.
  if (
    canSearch &&
    !factualQuestion &&
    shouldUseAiFallback(outcome.items)
  ) {
    const rewritten = await rewriteLibraryQuestionWithOpenAI(question);

    if (rewritten && rewritten !== preparedText) {
      const expandedOutcome = await runSearch(rewritten, 8);

      if (expandedOutcome.items.length > 0) {
        outcome = expandedOutcome;
        effectiveText = rewritten;
        queryAiUsed = true;
      }
    }
  }

  let groundedAnswer:
    | Awaited<ReturnType<typeof answerLibraryQuestionWithOpenAI>>
    | undefined;

  if (canSearch && factualQuestion && outcome.items.length > 0) {
    const fullStudies = (
      await Promise.all(
        outcome.items
          .slice(0, 8)
          .map(({ study }) => studyRepository.getPublishedBySlug(study.slug)),
      )
    ).filter((study): study is NonNullable<typeof study> => Boolean(study));

    groundedAnswer = await answerLibraryQuestionWithOpenAI(
      question,
      fullStudies,
    );
  }

  const citedSlugs = new Set(
    groundedAnswer?.sources.map((source) => source.slug) ?? [],
  );

  const displayItems =
    citedSlugs.size > 0
      ? [...outcome.items].sort((a, b) => {
          const aCited = citedSlugs.has(a.study.slug) ? 1 : 0;
          const bCited = citedSlugs.has(b.study.slug) ? 1 : 0;
          return bCited - aCited;
        })
      : outcome.items;

  const primaryItems = displayItems.slice(0, 3);
  const additionalItems = displayItems.slice(3, 8);
  const hasAnswer = canSearch && displayItems.length > 0;

  return (
    <div className="min-h-screen bg-[#fcfbf8]">
      <CollectionHero
        eyebrow="Consulta fundamentada"
        title="Pergunte à Biblioteca"
        description="Escreva uma pergunta comum. A Biblioteca pesquisa primeiro nos estudos publicados. Quando necessário, a IA pode ajudar a localizar ou sintetizar uma resposta, sempre limitada às fontes do próprio acervo."
        meta={
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full bg-emerald-600"
              />
              Fundamentada no acervo
            </span>
            <span>Sem resposta externa às fontes recuperadas.</span>
          </>
        }
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: "Início", href: "/" },
              { label: "Pergunte à Biblioteca" },
            ]}
          />
        }
      />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-4xl">
          <form
            action="/pergunte"
            method="GET"
            className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7"
          >
            <label
              htmlFor="pergunta"
              className="block font-serif text-xl font-semibold text-stone-950"
            >
              O que você gostaria de saber?
            </label>
            <p className="mt-1 text-sm leading-6 text-stone-500">
              Pergunte por uma passagem, tema, personagem, fato ou assunto.
            </p>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <input
                id="pergunta"
                name="pergunta"
                type="search"
                defaultValue={question}
                placeholder="Ex.: Quantos anos Davi reinou?"
                className="min-w-0 flex-1 rounded-lg border border-stone-300 bg-white px-4 py-3 text-base text-stone-900 shadow-sm placeholder:text-stone-400 focus:border-amber-600"
              />
              <button
                type="submit"
                className="shrink-0 rounded-lg bg-amber-800 px-6 py-3 text-sm font-semibold text-white transition hover:bg-amber-900"
              >
                Consultar acervo
              </button>
            </div>

            <div className="mt-5 border-t border-stone-100 pt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-400">
                Exemplos
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {EXAMPLES.map((example) => (
                  <Link
                    key={example}
                    href={`/pergunte?pergunta=${encodeURIComponent(example)}`}
                    className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs leading-5 text-stone-600 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-900"
                  >
                    {example}
                  </Link>
                ))}
              </div>
            </div>
          </form>
        </section>

        {question && (
          <section className="mx-auto mt-10 max-w-5xl">
            <div className="rounded-xl border border-stone-200 bg-white px-5 py-4 sm:px-6">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
                Sua pergunta
              </p>
              <p className="mt-2 font-serif text-xl leading-8 text-stone-800">
                “{question}”
              </p>

              {(effectiveText ||
                parsed.recognizedReference ||
                mentionedCharacter) && (
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-stone-500">
                  {effectiveText && (
                    <>
                      <span className="font-semibold text-stone-600">
                        {queryAiUsed
                          ? "Consulta ampliada:"
                          : "Termos consultados:"}
                      </span>
                      {effectiveText.split(" ").map((term, index) => (
                        <span
                          key={`${term}-${index}`}
                          className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1"
                        >
                          {term}
                        </span>
                      ))}
                    </>
                  )}

                  {mentionedCharacter && (
                    <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 font-semibold text-violet-800">
                      Personagem: {mentionedCharacter.nome}
                    </span>
                  )}

                  {parsed.recognizedReference && (
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 font-semibold text-amber-800">
                      {formatReferenceLabel(parsed.recognizedReference)}
                    </span>
                  )}
                </div>
              )}
            </div>

            {parsed.ambiguousReference && (
              <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950">
                <p className="font-semibold">
                  A referência “{parsed.ambiguousReference.matchedText}” pode
                  indicar mais de um livro.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {parsed.ambiguousReference.candidates.map((book) => (
                    <Link
                      key={book.id}
                      href={`/pergunte?pergunta=${encodeURIComponent(
                        question.replace(
                          parsed.ambiguousReference!.matchedText,
                          book.nome,
                        ),
                      )}`}
                      className="rounded-md border border-amber-300 bg-white px-3 py-1.5 font-semibold hover:bg-amber-100"
                    >
                      {book.nome}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {parsed.invalidReference && (
              <div className="mt-5 rounded-xl border border-red-300 bg-red-50 p-5 text-sm text-red-950">
                <p className="font-semibold">
                  “{parsed.invalidReference.matchedText}” não é uma referência
                  bíblica válida.
                </p>
                <p className="mt-1">
                  {INVALID_REFERENCE_MESSAGES[
                    parsed.invalidReference.reason
                  ]({
                    bookName: parsed.invalidReference.book.nome,
                    totalCapitulos:
                      parsed.invalidReference.book.totalCapitulos,
                    capitulo: parsed.invalidReference.capitulo,
                    versiculoMaximo:
                      parsed.invalidReference.versiculoMaximo,
                  })}
                </p>
              </div>
            )}

            {!parsed.ambiguousReference &&
              !parsed.invalidReference &&
              !hasCriteria && (
                <div className="mt-5 rounded-xl border border-stone-200 bg-stone-50 p-5 text-sm leading-6 text-stone-600">
                  Sua pergunta ficou genérica demais para uma consulta segura.
                  Acrescente um tema, personagem, passagem ou palavra-chave.
                </div>
              )}

            {groundedAnswer && (
              <article className="mt-7 rounded-2xl border border-sky-200 bg-sky-50/60 p-5 shadow-sm sm:p-7">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-800">
                  Resposta assistida por IA
                </p>
                <p className="mt-3 font-serif text-2xl leading-9 text-stone-950">
                  {groundedAnswer.answer}
                </p>

                {groundedAnswer.biblicalReferences.length > 0 && (
                  <div className="mt-5 rounded-xl border border-sky-200 bg-white/70 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-800">
                      Referências bíblicas nas fontes
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {groundedAnswer.biblicalReferences.map(
                        (reference, index) => (
                          <Link
                            key={`${reference.sourceSlug}-${reference.reference}-${index}`}
                            href={`/estudo/${reference.sourceSlug}`}
                            title={`Fonte: ${reference.sourceTitle}`}
                            className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-sm font-semibold text-sky-950 hover:bg-sky-100"
                          >
                            {reference.reference}
                          </Link>
                        ),
                      )}
                    </div>
                    <p className="mt-2 text-xs leading-5 text-sky-800">
                      Só são exibidas referências que constam literalmente
                      nos estudos utilizados pela resposta.
                    </p>
                  </div>
                )}

                <div className="mt-5 border-t border-sky-200 pt-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-800">
                    Fontes do acervo utilizadas
                  </p>
                  <div className="mt-2 flex flex-col gap-2">
                    {groundedAnswer.sources.map((source) => (
                      <Link
                        key={source.slug}
                        href={`/estudo/${source.slug}`}
                        className="text-sm font-semibold text-sky-950 hover:underline"
                      >
                        {source.titulo} →
                      </Link>
                    ))}
                  </div>
                  <p className="mt-3 text-xs leading-5 text-sky-800">
                    A IA recebeu somente os estudos recuperados acima e foi
                    instruída a não completar lacunas com conhecimento externo.
                  </p>
                </div>
              </article>
            )}

            {factualQuestion &&
              canSearch &&
              outcome.items.length > 0 &&
              !groundedAnswer && (
                <div className="mt-7 rounded-xl border border-stone-200 bg-stone-50 p-5 text-sm leading-6 text-stone-600">
                  Os estudos relacionados foram encontrados, mas não houve
                  evidência textual suficiente para uma resposta direta. A
                  Biblioteca preferiu não completar a informação.
                </div>
              )}

            {hasAnswer && (
              <>
                <div className="mt-8 border-b border-stone-200 pb-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
                        Evidência documental
                      </p>
                      <h2 className="mt-1 font-serif text-2xl font-semibold text-stone-950">
                        Estudos relacionados
                      </h2>
                    </div>
                    <p className="text-sm text-stone-500">
                      {outcome.total}{" "}
                      {outcome.total === 1
                        ? "estudo relacionado"
                        : "estudos relacionados"}
                    </p>
                  </div>

                  <div
                    className={`mt-4 rounded-lg border px-4 py-3 text-sm leading-6 ${
                      groundedAnswer || queryAiUsed
                        ? "border-sky-200 bg-sky-50/70 text-sky-950"
                        : "border-emerald-200 bg-emerald-50/70 text-emerald-950"
                    }`}
                  >
                    {groundedAnswer ? (
                      <>
                        <strong>IA com fontes:</strong> a resposta curta acima
                        foi sintetizada somente a partir dos estudos
                        recuperados. Abaixo você pode conferir os documentos.
                      </>
                    ) : queryAiUsed ? (
                      <>
                        <strong>IA usada somente na localização:</strong> a
                        consulta original teve baixa confiança e foi
                        reformulada. Os textos abaixo continuam sendo
                        exclusivamente resumos cadastrados no acervo.
                      </>
                    ) : (
                      <>
                        <strong>Busca documental:</strong> a consulta foi
                        resolvida diretamente pelo acervo; a IA não foi
                        necessária. Os textos abaixo são resumos cadastrados.
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  {primaryItems.map(({ study, matchedOn }, index) => (
                    <article
                      key={study.id}
                      className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6"
                    >
                      <div className="flex items-start gap-4">
                        <span
                          aria-hidden="true"
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-50 font-serif text-sm font-semibold text-amber-800"
                        >
                          {index + 1}
                        </span>

                        <div className="min-w-0 flex-1">
                          {study.referenciaPrincipal && (
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-800">
                              {
                                study.referenciaPrincipal
                                  .referenciaNormalizada
                              }
                            </p>
                          )}
                          <h3 className="mt-1 font-serif text-xl font-semibold leading-7 text-stone-950">
                            <Link
                              href={`/estudo/${study.slug}`}
                              className="hover:text-amber-800"
                            >
                              {study.titulo}
                            </Link>
                          </h3>

                          <div className="mt-4 border-l-2 border-stone-200 pl-4">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-400">
                              Resumo cadastrado
                            </p>
                            <p className="mt-1 text-sm leading-7 text-stone-700">
                              {study.resumo}
                            </p>
                          </div>

                          {matchedOn.length > 0 && (
                            <div className="mt-4 flex flex-wrap items-center gap-1.5 text-[11px] text-stone-500">
                              <span className="font-medium">
                                Relacionado por:
                              </span>
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

                          <Link
                            href={`/estudo/${study.slug}`}
                            className="mt-4 inline-flex text-sm font-semibold text-amber-800 hover:underline"
                          >
                            Abrir fonte completa →
                          </Link>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                {additionalItems.length > 0 && (
                  <div className="mt-10">
                    <div className="border-b border-stone-200 pb-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
                        Continue a pesquisa
                      </p>
                      <h2 className="mt-1 font-serif text-2xl font-semibold text-stone-950">
                        Outros estudos relacionados
                      </h2>
                    </div>
                    <div className="mt-5 grid gap-5 md:grid-cols-2">
                      {additionalItems.map(({ study }) => (
                        <StudyCard key={study.id} study={study} />
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-8 text-center">
                  <Link
                    href={`/busca?q=${encodeURIComponent(
                      effectiveText || question,
                    )}`}
                    className="text-sm font-semibold text-amber-800 hover:underline"
                  >
                    Abrir busca completa no acervo →
                  </Link>
                </div>
              </>
            )}

            {canSearch && !hasAnswer && (
              <div className="mt-6">
                <EmptyState
                  title="O acervo não encontrou material suficiente"
                  description="A Biblioteca preferiu não mostrar uma resposta de baixa confiança. Tente uma passagem, personagem, tema ou palavra-chave mais específica."
                />
              </div>
            )}
          </section>
        )}

        {!question && (
          <section className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-3">
            <InfoCard
              number="01"
              title="Você pergunta"
              text="Escreva em linguagem comum, inclusive perguntas factuais."
            />
            <InfoCard
              number="02"
              title="O acervo é pesquisado"
              text="A busca estrita respeita termos relevantes, personagens e referências bíblicas."
            />
            <InfoCard
              number="03"
              title="A IA fica presa às fontes"
              text="Quando uma síntese é necessária, a resposta só é exibida se os estudos recuperados sustentarem a informação."
            />
          </section>
        )}
      </div>
    </div>
  );
}

function InfoCard({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <article className="rounded-xl border border-stone-200 bg-white p-5">
      <p className="font-serif text-sm font-semibold text-amber-800">{number}</p>
      <h2 className="mt-3 font-serif text-lg font-semibold text-stone-950">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-6 text-stone-500">{text}</p>
    </article>
  );
}
