/**
 * Stub de preparação para o cliente Supabase (Fase 2 — docs/ROADMAP.md).
 *
 * Este arquivo NÃO é importado por nenhum código ativo do Marco 1. Ele
 * existe apenas para documentar, desde já, o ponto de entrada que a
 * Fase 2 vai preencher: quando o banco relacional entrar (DEC-002 em
 * docs/DECISIONS.md), uma `SupabaseStudyRepository` (implementando as
 * interfaces de `src/lib/repositories/types.ts`) vai chamar este cliente
 * em vez de ler os arrays de `src/lib/data/*`.
 *
 * Para ativar na Fase 2:
 *   1. `npm install @supabase/supabase-js`
 *   2. Preencher `.env.local` a partir de `.env.example`
 *   3. Substituir o corpo de `getSupabaseClient` pela chamada real a
 *      `createClient(supabaseUrl, supabaseAnonKey)`
 *   4. Implementar `Supabase*Repository` em `src/lib/repositories/` e
 *      trocar as instâncias exportadas por `src/lib/repositories/index.ts`
 *
 * Até lá, chamar esta função é um erro de programação (não deveria
 * acontecer em nenhum fluxo do Marco 1) — por isso ela lança em vez de
 * retornar `null` silenciosamente.
 */
export function getSupabaseClient(): never {
  throw new Error(
    "Supabase ainda não está configurado — Marco 1 usa apenas dados mockados em memória " +
      "(src/lib/data). Ver src/lib/supabase/client.ts e docs/ROADMAP.md (Fase 2).",
  );
}
