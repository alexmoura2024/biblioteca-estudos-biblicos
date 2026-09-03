import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase com `service_role` — ignora RLS, só deve existir em
 * código server-only (Fase 3: script de ingestão, `scripts/`). NUNCA
 * importe este módulo de `src/app/**`, `src/components/**` nem de
 * `src/lib/repositories/**` (esses caminhos podem ser alcançados por uma
 * rota pública ou renderizar no cliente) — ver DEC-020 e a política de
 * segurança já registrada antes da Fase 2.
 *
 * Lê `SUPABASE_SERVICE_ROLE_KEY` (sem prefixo `NEXT_PUBLIC_`, de
 * propósito — Next.js só expõe ao browser variáveis `NEXT_PUBLIC_*`,
 * então esta chave nunca é incluída no bundle do cliente por
 * construção, não só por convenção). Reusa `NEXT_PUBLIC_SUPABASE_URL`
 * para a URL do projeto — a URL em si não é segredo.
 */
let cachedServiceClient: SupabaseClient | undefined;

export function isSupabaseServiceConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function getSupabaseServiceClient(): SupabaseClient {
  if (cachedServiceClient) return cachedServiceClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Cliente de serviço do Supabase não está configurado — defina " +
        "NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (server-only, " +
        "ver .env.example) antes de rodar um script de ingestão. Nunca defina " +
        "SUPABASE_SERVICE_ROLE_KEY num contexto que o navegador possa ler.",
    );
  }

  cachedServiceClient = createClient(url, serviceRoleKey, {
    auth: {
      // Script server-only, sem sessão de usuário para persistir.
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return cachedServiceClient;
}
