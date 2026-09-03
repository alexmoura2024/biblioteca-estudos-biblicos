import { vi } from "vitest";

/**
 * Duplo de teste do cliente Supabase, usado só pelos testes em
 * `src/lib/repositories/supabase/*.test.ts`.
 *
 * IMPORTANTE — o que isto prova e o que não prova: estes testes
 * verificam que cada repositório monta a consulta certa (tabela,
 * filtros) e traduz a resposta certa (linhas -> `Study`/`StudySummary`/
 * etc.) — a lógica que é NOSSA responsabilidade. Eles NÃO testam RLS,
 * constraints, triggers nem a função SQL `search_studies` de verdade —
 * isso exigiria um Postgres real (bloqueado nesta sessão por falta de
 * Docker; ver docs/WORK_STATUS.md, Fase 2 — Etapa 2/6). Não confundir
 * "testes destes repositórios passam" com "testes de integração contra
 * o banco passam" — são coisas diferentes, ver o relatório da Fase 2.
 */
export interface MockTableResponse {
  data: unknown;
  error: { message: string } | null;
}

export interface MockSupabaseConfig {
  /**
   * Resposta por nome de tabela/view, usada em toda chamada
   * `.from(table)`. Aceita uma resposta única (mesmo resultado sempre)
   * ou um array (uma resposta por chamada, na ordem — útil quando o
   * mesmo método chama `.from("studies")` mais de uma vez com filtros
   * diferentes, ex.: `SupabaseStudyRepository.listRecent`; a última
   * resposta do array é reusada se houver mais chamadas do que itens).
   */
  tables?: Record<string, MockTableResponse | MockTableResponse[]>;
  /** Resposta para `.rpc(...)`, se o teste chamar uma função. */
  rpc?: MockTableResponse;
}

const CHAIN_METHODS = ["select", "eq", "neq", "in", "order", "limit", "gt", "gte", "lt", "lte"] as const;

function buildQueryBuilder(result: MockTableResponse) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const builder: any = {};
  for (const method of CHAIN_METHODS) {
    builder[method] = vi.fn(() => builder);
  }
  builder.maybeSingle = vi.fn(() => Promise.resolve(result));
  builder.single = vi.fn(() => Promise.resolve(result));
  // A resposta do PostgREST é "thenable": pode ser usada com `await`
  // direto na chain, sem precisar de um método terminal.
  builder.then = (onFulfilled: (r: MockTableResponse) => unknown, onRejected?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(onFulfilled, onRejected);
  return builder;
}

const MISSING_TABLE_RESPONSE: MockTableResponse = {
  data: null,
  error: { message: "testUtils: nenhuma resposta mockada configurada para esta tabela" },
};

const MISSING_RPC_RESPONSE: MockTableResponse = {
  data: null,
  error: { message: "testUtils: nenhuma resposta mockada configurada para rpc()" },
};

/** Cria um duplo de `SupabaseClient` cobrindo só `.from(table)...` e `.rpc(...)`, o que os repositórios usam. */
export function createMockSupabaseClient(config: MockSupabaseConfig) {
  const callCountByTable = new Map<string, number>();

  const from = vi.fn((table: string) => {
    const configured = config.tables?.[table] ?? MISSING_TABLE_RESPONSE;
    let response: MockTableResponse;
    if (Array.isArray(configured)) {
      const callIndex = callCountByTable.get(table) ?? 0;
      response = configured[Math.min(callIndex, configured.length - 1)];
      callCountByTable.set(table, callIndex + 1);
    } else {
      response = configured;
    }
    return buildQueryBuilder(response);
  });
  const rpc = vi.fn(() => Promise.resolve(config.rpc ?? MISSING_RPC_RESPONSE));
  return { from, rpc } as unknown as ReturnType<typeof import("@supabase/supabase-js").createClient>;
}
