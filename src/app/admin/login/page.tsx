import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Acesso Editorial",
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

export default async function AdminLoginPage({
  searchParams,
}: Props) {
  const params = await searchParams;

  const nextPath =
    params.next?.startsWith("/admin")
      ? params.next
      : "/admin";

  let errorMessage = "";

  if (params.error === "credentials") {
    errorMessage = "Usuário ou senha incorretos.";
  }

  if (params.error === "config") {
    errorMessage =
      "A autenticação administrativa ainda não está configurada neste ambiente.";
  }

  return (
    <main className="min-h-[70vh] bg-stone-50 px-4 py-16">
      <div className="mx-auto max-w-md rounded-xl border border-stone-200 bg-white p-8 shadow-sm">
        <h1 className="font-serif text-2xl font-bold text-stone-900">
          Acesso Editorial
        </h1>

        <p className="mt-2 text-sm leading-6 text-stone-600">
          Área restrita à administração da Biblioteca de Estudos Bíblicos.
        </p>

        {errorMessage ? (
          <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {errorMessage}
          </div>
        ) : null}

        <form
          action="/api/admin/login"
          method="post"
          className="mt-6 space-y-5"
        >
          <input
            type="hidden"
            name="next"
            value={nextPath}
          />

          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-stone-700"
            >
              Usuário
            </label>

            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              className="mt-2 w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-amber-600"
            />
          </div>

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
              required
              className="mt-2 w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-amber-600"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-amber-700 px-4 py-2.5 font-medium text-white transition hover:bg-amber-800"
          >
            Entrar
          </button>
        </form>

        <a
          href="/"
          className="mt-6 block text-center text-sm text-stone-600 hover:text-amber-700"
        >
          Voltar para a biblioteca pública
        </a>
      </div>
    </main>
  );
}