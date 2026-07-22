'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';

type AutoLoginRedirectProps = {
  enabled: boolean;
  children: ReactNode;
};

let sessionRefreshPromise: Promise<boolean> | null = null;

function refreshStoredSession() {
  if (sessionRefreshPromise) {
    return sessionRefreshPromise;
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 8_000);

  sessionRefreshPromise = fetch('/api/auth/refresh', {
    method: 'POST',
    cache: 'no-store',
    signal: controller.signal,
  })
    .then((response) => response.ok)
    .catch(() => false)
    .finally(() => window.clearTimeout(timeoutId));

  return sessionRefreshPromise;
}

export function AutoLoginRedirect({ enabled, children }: AutoLoginRedirectProps) {
  const [checking, setChecking] = useState(enabled);

  useEffect(() => {
    if (!enabled) return;

    let active = true;

    async function refreshSession() {
      const refreshed = await refreshStoredSession();
      if (!active) return;

      if (refreshed) {
        window.location.replace('/dashboard');
        return;
      }

      setChecking(false);
    }

    void refreshSession();

    return () => {
      active = false;
    };
  }, [enabled]);

  if (!checking) {
    return children;
  }

  return (
    <section
      className="flex min-h-[calc(100vh-4rem)] items-center justify-center py-8"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="glass-panel w-full max-w-md rounded-[36px] border border-white/80 p-8 text-center shadow-soft sm:p-10">
        <span className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-brand-800">
          <ShieldCheck className="h-8 w-8" aria-hidden="true" />
        </span>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.28em] text-brand-700">
          Patriot Club Finance
        </p>
        <h1 className="mt-3 text-2xl font-black text-slate-900">로그인 정보 확인 중</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          저장된 로그인 정보를 안전하게 확인하고 있습니다.
        </p>
        <div className="mt-7 h-2 overflow-hidden rounded-full bg-slate-100">
          <span className="block h-full w-1/2 animate-pulse rounded-full bg-brand-600" />
        </div>
      </div>
    </section>
  );
}
