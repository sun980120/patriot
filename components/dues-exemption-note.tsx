import type { DuesExemption } from '@/lib/dues';

export function DuesExemptionNote({ detail, compact = false }: { detail?: DuesExemption | null; compact?: boolean }) {
  if (!detail) return null;
  return <span title={`${detail.label} · ${detail.reason}`} className="mt-1 block break-words text-[11px] leading-4 text-slate-500">
    {detail.label}{!compact || detail.kind === 'manual' ? ` · ${detail.reason}` : ''}
  </span>;
}
