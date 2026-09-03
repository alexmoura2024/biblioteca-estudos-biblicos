import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase público (papel `anon`), sujeito a RLS — ver
 * docs/DECISIONS.md, DEC-020. Usado por `src/lib/repositories/supabase/*`
 * — nunca importado diretamente por uma página ou componente (mesma
 * regra de sempre: toda leitura de dados passa pelos repositórios,
 * CLAUDE.md §3).
 *
 * O cliente `service_role` (Fase 3 — ingestão) vive em
 * `src/lib/supabase/serviceClient.ts`, um módulo separado deste de
 * propósito: nunca importe `serviceClient.ts` de nada que possa rodar no
 * browser ou ser alcançado por uma rota pública — só de scripts de
 * ingestão/administração (`scripts/`), server-only.
 */
let cachedClient: SupabaseClient | undefined;

/**
 * Verdadeiro quando as duas variáveis públicas necessárias
 * (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) estão
 * definidas. `src/lib/repositories/index.ts` usa isto para decidir
 * entre a implementação mock e a Supabase — sem essas variáveis, a
 * aplicação continua funcionando inteiramente sobre os dados mockados.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/**
 * Devolve o cliente Supabase (papel `anon`), criando-o na primeira
 * chamada. Lança um erro claro se as variáveis de ambiente não
 * estiverem configuradas — chame `isSupabaseConfigured()` antes se o
 * chamador precisar de um fallback em vez de uma exceção (é isso que
 * `src/lib/repositories/index.ts` faz).
 */
export function getSupabaseClient(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase não está configurado — defina NEXT_PUBLIC_SUPABASE_URL e " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY (ver .env.example) antes de usar os " +
        "repositórios Supabase. Sem essas variáveis, use os repositórios mock " +
        "(src/lib/repositories/mock.ts), que é o que src/lib/repositories/index.ts " +
        "faz automaticamente.",
    );
  }

  cachedClient = createClient(url, anonKey, {
    auth: {
      // Este cliente só faz leitura pública anônima nesta fase — não há
      // sessão de usuário para persistir (autenticação pública é fora
      // de escopo, ver docs/WORK_STATUS.md).
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return cachedClient;
}
