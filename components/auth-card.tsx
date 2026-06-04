'use client';

import Link from 'next/link';
import type { FormEvent } from 'react';
import { useState, useTransition } from 'react';
import { LogIn } from 'lucide-react';
import { loginAction } from '@/app/actions';
import { FloatingToast, type ToastTone } from '@/components/ui/floating-toast';
import { LOGIN_NOTIFICATION_PROMPT_KEY } from '@/components/pwa-notification-prompt';

export function AuthCard() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [message, setMessage] = useState('');
  const [toastTone, setToastTone] = useState<ToastTone>('error');
  const [pending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');

    startTransition(async () => {
      const result = await loginAction(username.trim(), password, rememberMe);
      if (!result.ok) {
        setToastTone('error');
        setMessage(result.message ?? '로그인에 실패했습니다.');
        return;
      }

      window.localStorage.setItem(LOGIN_NOTIFICATION_PROMPT_KEY, 'true');
      window.location.assign('/dashboard');
    });
  };

  return (
    <>
      <FloatingToast open={Boolean(message)} message={message} tone={toastTone} onClose={() => setMessage('')} />
      <div className="rounded-[28px] bg-slate-900 px-5 py-5 text-white shadow-soft">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-white/70">Spring Security 로그인</p>
            <h2 className="mt-2 text-2xl font-black">관리자 / 회원 로그인</h2>
          </div>
          <span className="rounded-full border border-white/10 bg-white/10 p-3">
            <LogIn className="h-5 w-5" />
          </span>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            name="username"
            type="text"
            placeholder="아이디"
            className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-brand-300 focus:outline-none"
          />
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            name="password"
            type="password"
            placeholder="비밀번호"
            className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-brand-300 focus:outline-none"
          />
          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white/85">
            <span>
              자동 로그인
              <span className="ml-2 text-xs font-semibold text-white/45">30일 유지</span>
            </span>
            <input
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              type="checkbox"
              className="h-5 w-5 accent-brand-400"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-2xl bg-brand-400 px-4 py-3 text-sm font-bold text-slate-900 transition hover:bg-brand-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? '로그인 중...' : '로그인'}
          </button>
          <Link
            href="/signup"
            className="block w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-white/10"
          >
            동호회 가입
          </Link>
          <p className="text-xs leading-5 text-white/65">
            회원은 승인 후 조회가 가능하고, 관리자는 세입/지출 추가, 회원 승인, 납부 토글을 수행할 수 있습니다.
          </p>
        </form>
      </div>
    </>
  );
}
