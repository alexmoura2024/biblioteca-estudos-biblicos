import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  constantTimeEqual,
  createAdminSessionToken,
} from "@/lib/admin-auth";

function secureHeaders(response: NextResponse) {
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "no-referrer");

  return response;
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const isAdminPage =
    pathname === "/admin" || pathname.startsWith("/admin/");

  const isAdminApi = pathname.startsWith("/api/admin/");

  if (!isAdminPage && !isAdminApi) {
    return NextResponse.next();
  }

  // Página e endpoint de login precisam permanecer acessíveis.
  if (
    pathname === "/admin/login" ||
    pathname === "/api/admin/login"
  ) {
    return NextResponse.next();
  }

  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    if (isAdminApi) {
      return NextResponse.json(
        { error: "Admin authentication is not configured" },
        { status: 503 }
      );
    }

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/admin/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("error", "config");

    return NextResponse.redirect(loginUrl);
  }

  const expectedToken = await createAdminSessionToken(
    username,
    password
  );

  const currentToken =
    request.cookies.get(ADMIN_SESSION_COOKIE)?.value ?? "";

  if (!constantTimeEqual(currentToken, expectedToken)) {
    if (isAdminApi) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/admin/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("next", pathname);

    return NextResponse.redirect(loginUrl);
  }

  return secureHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/api/admin/:path*",
  ],
};