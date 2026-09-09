import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Acesso à Biblioteca",
  robots: {
    index: false,
    follow: false,
  },
};

type Props = {
  searchParams: Promise<{
    error?: string;
    next?: string;
  }>;
};

export default async function PublicAccessPage({
  searchParams,
}: Props) {
  const params = await searchParams;

  const requestedNext = params.next ?? "/";

  const nextPath =
    requestedNext.startsWith("/") &&
    !requestedNext.startsWith("//") &&
    !requestedNext.startsWith("/admin") &&
    !requestedNext.startsWith("/api/")
      ? requestedNext
      : "/";

  let errorMessage = "";

  if (params.error === "password") {
    errorMessage = "Senha incorreta.";
  }

  if (params.error === "config") {
    errorMessage =
      "O acesso à biblioteca ainda não está configurado neste ambiente.";
  }

  return (
    <main className="min-h-[72vh] bg-gradient-to-b from-amber-50 to-stone-50 px-4 py-16">
      <div className="mx-auto max-w-md overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-lg">
        <div className="border-b border-stone-200 bg-stone-950 px-8 py-7 text-white">
          <div className="flex items-center gap-3">
            <span className="text-amber-500">
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="h-9 w-9"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5v-16ZM20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5v-16Z"
                />
              </svg>
            </span>

            <div>
              <p className="font-serif text-xl font-semibold">
                Biblioteca Virtual
              </p>
              <p className="text-sm text-stone-400">
                de Estudos Bíblicos
              </p>
            </div>
          </div>
        </div>

        <div className="p-8">
          <h1 className="font-serif text-2xl font-bold text-stone-900">
            Acesso à biblioteca
          </h1>

          <p className="mt-2 text-sm leading-6 text-stone-600">
            Digite a senha de acesso para consultar os estudos publicados.
          </p>

          {errorMessage ? (
            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {errorMessage}
            </div>
          ) : null}

          <form
            action="/api/public/login"
            method="post"
            className="mt-6 space-y-5"
          >
            <input type="hidden" name="next" value={nextPath} />

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-stone-700"
              >
                Senha
              </label>

              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                autoFocus
                required
                className="mt-2 w-full rounded-lg border border-stone-300 px-3 py-3 text-stone-900 outline-none transition focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-amber-700 px-4 py-3 font-semibold text-white transition hover:bg-amber-800"
            >
              Entrar
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-stone-400">
            Acervo particular de Alex Sander de Moura
          </p>
        </div>
      </div>
    </main>
  );
}
