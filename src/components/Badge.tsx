import Link from "next/link";
import type { ReactNode } from "react";

const VARIANT_CLASSES = {
  neutral: "bg-stone-100 text-stone-700",
  tema: "bg-amber-100 text-amber-800",
  personagem: "bg-sky-100 text-sky-800",
  serie: "bg-violet-100 text-violet-800",
  testamento: "bg-emerald-100 text-emerald-800",
} as const;

export function Badge({
  children,
  href,
  variant = "neutral",
}: {
  children: ReactNode;
  href?: string;
  variant?: keyof typeof VARIANT_CLASSES;
}) {
  const className = `inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${VARIANT_CLASSES[variant]}`;

  if (href) {
    return (
      <Link href={href} className={`${className} transition-opacity hover:opacity-80`}>
        {children}
      </Link>
    );
  }
  return <span className={className}>{children}</span>;
}
