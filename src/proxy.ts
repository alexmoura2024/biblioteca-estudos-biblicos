import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const REALM = "Biblioteca Editorial";

function constantTimeEqual(left: string, right: string): boolean {
  const maxLength = Math.max(left.length, right.length);
  let mismatch = left.length ^ right.length;

  for (let i = 0; i < maxLength; i += 1) {
    mismatch |= (left.charCodeAt(i) || 0) ^ (right.charCodeAt(i) || 0);
  }

  return mismatch === 0;
}

function parseBasicAuth(
  header: string | null
): { username: string; password: string } | null {
  if (!header?.startsWith("Basic ")) return null;

  try {
    const decoded = atob(header.slice(6).trim());
    const separator = decoded.indexOf(":");

    if (separator < 0) return null;

    return {
      username: decoded.slice(0, separator),
      password: decoded.slice(separator + 1),
    };
  } catch {
    return null;
  }
}

function protectedResponse(status: 401 | 503, isApi: boolean) {
  const headers = new Headers({
    "Cache-Control": "private, no-store, max-age=0",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
  });

  // O desafio Basic só é enviado para páginas administrativas,
  // nunca para APIs.
  if (status === 401 && !isApi) {
    headers.set(
      "WWW-Authenticate",
      `Basic realm="${REALM}", charset="UTF-8"`
    );
  }

  if (isApi) {
    headers.set("Content-Type", "application/json; charset=utf-8");

    return new NextResponse(
      JSON.stringify({
        error:
          status === 401
            ? "Unauthorized"
            : "Admin authentication is not configured",
      }),
      { status, headers }
    );
  }

  headers.set("Content-Type", "text/plain; charset=utf-8");

  return new NextResponse(
    status === 401
      ? "Autenticação necessária."
      : "Área administrativa temporariamente indisponível.",
    { status, headers }
  );
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isApi = pathname.startsWith("/api/admin");

  // Evita que o Basic Auth seja desafiado exatamente em /admin,
  // o que pode contaminar a navegação do domínio inteiro no navegador.
  if (pathname === "/admin") {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/estudos";
    return NextResponse.redirect(url);
  }

  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    return protectedResponse(503, isApi);
  }

  const credentials = parseBasicAuth(
    request.headers.get("authorization")
  );

  if (
    !credentials ||
    !constantTimeEqual(credentials.username, username) ||
    !constantTimeEqual(credentials.password, password)
  ) {
    return protectedResponse(401, isApi);
  }

  const response = NextResponse.next();

  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set(
    "X-Robots-Tag",
    "noindex, nofollow, noarchive"
  );
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "no-referrer");

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
