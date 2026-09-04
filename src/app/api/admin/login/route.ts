import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  constantTimeEqual,
  createAdminSessionToken,
} from "@/lib/admin-auth";

export async function POST(request: NextRequest) {
  const formData = await request.formData();

  const suppliedUsername = String(
    formData.get("username") ?? ""
  );

  const suppliedPassword = String(
    formData.get("password") ?? ""
  );

  const configuredUsername = process.env.ADMIN_USERNAME;
  const configuredPassword = process.env.ADMIN_PASSWORD;

  if (!configuredUsername || !configuredPassword) {
    return NextResponse.redirect(
      new URL("/admin/login?error=config", request.url),
      303
    );
  }

  const validUsername = constantTimeEqual(
    suppliedUsername,
    configuredUsername
  );

  const validPassword = constantTimeEqual(
    suppliedPassword,
    configuredPassword
  );

  if (!validUsername || !validPassword) {
    return NextResponse.redirect(
      new URL("/admin/login?error=credentials", request.url),
      303
    );
  }

  const sessionToken = await createAdminSessionToken(
    configuredUsername,
    configuredPassword
  );

  const requestedNext = String(
    formData.get("next") ?? "/admin"
  );

  const nextPath =
    requestedNext.startsWith("/admin") &&
    !requestedNext.startsWith("//")
      ? requestedNext
      : "/admin";

  const response = NextResponse.redirect(
    new URL(nextPath, request.url),
    303
  );

  response.cookies.set(
    ADMIN_SESSION_COOKIE,
    sessionToken,
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8,
    }
  );

  return response;
}