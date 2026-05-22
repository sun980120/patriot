'use client';

import { useEffect } from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

export type ToastTone = 'success' | 'error' | 'info';

export function FloatingToast({
  open,
  message,
  tone,
  onClose,
}: {
  open: boolean;
  message: string;
  tone: ToastTone;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open || !message) return;

    const timeout = window.setTimeout(() => {
      onClose();
    }, 3200);

    return () => window.clearTimeout(timeout);
  }, [message, onClose, open]);

  if (!open || !message) return null;

  const config = {
    success: {
      Icon: CheckCircle2,
      iconClassName: 'text-emerald-500',
      panelClassName: 'border-emerald-100',
    },
    error: {
      Icon: AlertCircle,
      iconClassName: 'text-rose-500',
      panelClassName: 'border-rose-100',
    },
    info: {
      Icon: Info,
      iconClassName: 'text-brand-700',
      panelClassName: 'border-slate-200',
    },
  }[tone];

  const Icon = config.Icon;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-5 z-[100] flex justify-center px-4">
      <div
        className={`pointer-events-auto flex w-full max-w-xl items-center gap-3 rounded-2xl border bg-white px-4 py-4 shadow-[0_20px_50px_rgba(15,23,42,0.15)] ${config.panelClassName}`}
      >
        <Icon className={`h-6 w-6 shrink-0 ${config.iconClassName}`} />
        <p className="text-sm font-semibold text-slate-800 sm:text-base">{message}</p>
      </div>
    </div>
  );
}
