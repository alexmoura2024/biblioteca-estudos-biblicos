import { NextRequest, NextResponse } from "next/server";
import {
  PUBLIC_SESSION_COOKIE,
  constantTimeEqualPublic,
  createPublicSessionToken,
} from "@/lib/public-auth";

export async function POST(request: NextRequest) {
  const formData = await request.formData();

  const suppliedPassword = String(
    formData.get("password") ?? ""
  );

  const configuredPassword =
    process.env.SITE_PASSWORD;

  if (!configuredPassword) {
    return NextResponse.redirect(
      new URL("/acesso?error=config", request.url),
      303
    );
  }

  if (
    !constantTimeEqualPublic(
      suppliedPassword,
      configuredPassword
    )
  ) {
    const requestedNext = String(
      formData.get("next") ?? "/"
    );

    const url = new URL("/acesso", request.url);
    url.searchParams.set("error", "password");

    if (
      requestedNext.startsWith("/") &&
      !requestedNext.startsWith("//") &&
      !requestedNext.startsWith("/admin") &&
      !requestedNext.startsWith("/api/")
    ) {
      url.searchParams.set("next", requestedNext);
    }

    return NextResponse.redirect(url, 303);
  }

  const sessionToken =
    await createPublicSessionToken(
      configuredPassword
    );

  const requestedNext = String(
    formData.get("next") ?? "/"
  );

  const nextPath =
    requestedNext.startsWith("/") &&
    !requestedNext.startsWith("//") &&
    !requestedNext.startsWith("/admin") &&
    !requestedNext.startsWith("/api/")
      ? requestedNext
      : "/";

  const response = NextResponse.redirect(
    new URL(nextPath, request.url),
    303
  );

  response.cookies.set(
    PUBLIC_SESSION_COOKIE,
    sessionToken,
    {
      httpOnly: true,
      secure:
        process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    }
  );

  return response;
}
