import type { ReactNode } from 'react';

export function PageHeading({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return <header className="workspace-heading mb-6 flex flex-wrap items-center justify-between gap-3">
    <div className="min-w-0"><h1 className="text-2xl font-bold text-slate-900">{title}</h1>{description ? <p className="mt-1 break-words text-xs text-slate-500">{description}</p> : null}</div>
    {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
  </header>;
}
