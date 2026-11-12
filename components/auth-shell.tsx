import Link from 'next/link';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';

export function AuthShell({ mode, children }: { mode: 'login' | 'signup'; children: ReactNode }) {
  return <div className="auth-shell flex min-h-dvh flex-col bg-white text-slate-900">
    <header className="border-b border-slate-200">
      <div className="mx-auto flex min-h-[76px] max-w-6xl items-center justify-between gap-3 px-5 sm:px-8">
        <Link href="/" aria-label="패트리어트 홈" className="flex min-w-0 items-center gap-3"><img src="/icon-192.png" alt="패트리어트 로고" className="h-11 w-11 shrink-0 object-contain" /><span><strong className="block text-base font-bold">PATRIOT</strong><span className="block text-xs text-slate-500">Floorball Club</span></span></Link>
        <Link href={mode === 'login' ? '/signup' : '/login'} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-emerald-800">{mode === 'login' ? '동호회 가입' : '로그인'}<ArrowUpRight className="h-4 w-4" /></Link>
      </div>
    </header>
    <main className={`mx-auto w-full flex-1 px-5 py-10 sm:px-6 sm:py-14 ${mode === 'login' ? 'max-w-[440px]' : 'max-w-[680px]'}`}>
      {mode === 'signup' ? <Link href="/login" className="mb-6 inline-flex min-h-9 items-center gap-1 text-xs text-slate-500 hover:text-emerald-700"><ArrowLeft className="h-3.5 w-3.5" />로그인으로 돌아가기</Link> : null}
      {children}
    </main>
    <footer className="px-5 py-6 text-center text-xs text-slate-400">PATRIOT Floorball Club</footer>
  </div>;
}
