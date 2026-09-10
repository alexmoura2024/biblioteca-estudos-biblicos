import type { ReactNode } from "react";

interface CollectionHeroProps {
  eyebrow: string;
  title: string;
  description?: string;
  meta?: ReactNode;
  breadcrumbs: ReactNode;
  actions?: ReactNode;
}

export function CollectionHero({
  eyebrow,
  title,
  description,
  meta,
  breadcrumbs,
  actions,
}: CollectionHeroProps) {
  return (
    <section className="border-b border-stone-200 bg-[#f7f2e9]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div>{breadcrumbs}</div>

        <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-4xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
              {eyebrow}
            </p>

            <h1 className="mt-3 font-serif text-3xl font-semibold leading-tight tracking-tight text-stone-950 sm:text-4xl">
              {title}
            </h1>

            {description && (
              <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-600 sm:text-base">
                {description}
              </p>
            )}

            {meta && (
              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-stone-500">
                {meta}
              </div>
            )}
          </div>

          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      </div>
    </section>
  );
}
