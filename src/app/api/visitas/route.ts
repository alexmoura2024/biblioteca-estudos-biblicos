import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const VISITOR_COOKIE = "bve_visitor_id";
const TWO_YEARS_IN_SECONDS = 60 * 60 * 24 * 365 * 2;

function createAdminClient() {
  const url =
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function isUuid(value: string | undefined): value is string {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
      ),
  );
}

function sameSiteRequest(request: NextRequest): boolean {
  const secFetchSite = request.headers.get("sec-fetch-site");

  if (
    secFetchSite &&
    !["same-origin", "same-site", "none"].includes(secFetchSite)
  ) {
    return false;
  }

  const origin = request.headers.get("origin");
  if (!origin) return true;

  return origin === request.nextUrl.origin;
}

function noStoreJson(
  body: Record<string, unknown>,
  init?: ResponseInit,
) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  return response;
}

async function getVisitorCount(
  supabase: ReturnType<typeof createAdminClient>,
) {
  if (!supabase) {
    throw new Error("Supabase administrativo não configurado.");
  }

  const { count, error } = await supabase
    .from("site_visitors")
    .select("visitor_id", { count: "exact", head: true });

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

export async function GET() {
  const supabase = createAdminClient();

  if (!supabase) {
    return noStoreJson(
      { error: "Contador indisponível." },
      { status: 503 },
    );
  }

  try {
    const visitors = await getVisitorCount(supabase);
    return noStoreJson({ visitors });
  } catch (error) {
    console.error(
      "[visitas:get]",
      error instanceof Error ? error.message : error,
    );

    return noStoreJson(
      { error: "Não foi possível consultar o contador." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  if (!sameSiteRequest(request)) {
    return noStoreJson({ error: "Origem não permitida." }, { status: 403 });
  }

  const supabase = createAdminClient();

  if (!supabase) {
    return noStoreJson(
      { error: "Contador indisponível." },
      { status: 503 },
    );
  }

  const currentCookie = request.cookies.get(VISITOR_COOKIE)?.value;
  const visitorId = isUuid(currentCookie)
    ? currentCookie
    : crypto.randomUUID();

  try {
    const { error: upsertError } = await supabase
      .from("site_visitors")
      .upsert(
        {
          visitor_id: visitorId,
          last_seen: new Date().toISOString(),
        },
        {
          onConflict: "visitor_id",
        },
      );

    if (upsertError) {
      throw new Error(upsertError.message);
    }

    const visitors = await getVisitorCount(supabase);
    const response = noStoreJson({ visitors });

    response.cookies.set({
      name: VISITOR_COOKIE,
      value: visitorId,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: TWO_YEARS_IN_SECONDS,
    });

    return response;
  } catch (error) {
    console.error(
      "[visitas:post]",
      error instanceof Error ? error.message : error,
    );

    return noStoreJson(
      { error: "Não foi possível registrar a visita." },
      { status: 500 },
    );
  }
}
