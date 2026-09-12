"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type CounterResponse = {
  visitors?: number;
};

function shouldCount(pathname: string | null): boolean {
  if (!pathname) return false;

  return !(
    pathname === "/acesso" ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/")
  );
}

export function VisitorCounter() {
  const pathname = usePathname();
  const [visitors, setVisitors] = useState<number | null>(null);

  useEffect(() => {
    if (!shouldCount(pathname)) {
      setVisitors(null);
      return;
    }

    const controller = new AbortController();

    async function registerVisit() {
      try {
        const response = await fetch("/api/visitas", {
          method: "POST",
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) return;

        const data = (await response.json()) as CounterResponse;

        if (
          typeof data.visitors === "number" &&
          Number.isFinite(data.visitors)
        ) {
          setVisitors(data.visitors);
        }
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        console.error("[VisitorCounter]", error);
      }
    }

    void registerVisit();

    return () => controller.abort();
  }, [pathname]);

  if (visitors === null) return null;

  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap"
      title="Visitantes Ãºnicos por navegador, contados a partir da implantaÃ§Ã£o deste recurso."
    >
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 rounded-full bg-amber-500/80"
      />
      <span className="tabular-nums">
        {visitors.toLocaleString("pt-BR")}
      </span>
      <span>{visitors === 1 ? "visitante" : "visitantes"}</span>
    </span>
  );
}


