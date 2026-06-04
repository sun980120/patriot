'use client';

import { useEffect } from 'react';

export function AutoLoginRedirect() {
  useEffect(() => {
    let active = true;

    async function refreshSession() {
      try {
        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          cache: 'no-store',
        });

        if (active && response.ok) {
          window.location.replace('/dashboard');
        }
      } catch {
        // 로그인 화면에서는 자동 로그인 실패를 조용히 무시한다.
      }
    }

    void refreshSession();

    return () => {
      active = false;
    };
  }, []);

  return null;
}
