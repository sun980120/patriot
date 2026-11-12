'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { LoaderCircle } from 'lucide-react';

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
      className="flex min-h-80 items-center justify-center py-8"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="text-center">
        <LoaderCircle className="mx-auto mb-5 h-7 w-7 animate-spin text-emerald-700 motion-reduce:animate-none" aria-hidden="true" />
        <h1 className="text-xl font-semibold text-slate-900">로그인 정보 확인 중</h1>
      </div>
    </section>
  );
}
