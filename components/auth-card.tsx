'use client';

import Link from 'next/link';
import { useRef, useState, useTransition, type FormEvent } from 'react';
import { AlertCircle, ArrowRight, LoaderCircle, LogIn } from 'lucide-react';
import { loginAction } from '@/app/actions';
import { LOGIN_NOTIFICATION_PROMPT_KEY } from '@/components/pwa-notification-prompt';
import { PasswordInput } from '@/components/ui/password-input';

export function AuthCard() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();
  const submitting = useRef(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting.current) return;
    setMessage('');
    if (!username.trim() || !password) { setMessage('아이디와 비밀번호를 입력해 주세요.'); return; }
    submitting.current = true;
    startTransition(async () => {
      try {
        const result = await loginAction(username.trim(), password, rememberMe);
        if (!result.ok) { setMessage(result.message ?? '로그인에 실패했습니다.'); return; }
        try { window.localStorage.setItem(LOGIN_NOTIFICATION_PROMPT_KEY, 'true'); }
        catch { /* Login must also work when browser storage is unavailable. */ }
        window.location.assign('/dashboard');
      } catch { setMessage('서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.'); }
      finally { submitting.current = false; }
    });
  };

  return <section aria-label="로그인">
    <div className="mb-8"><p className="mb-2 text-sm font-medium text-emerald-700">패트리어트 플로어볼 클럽</p><h1 className="text-2xl font-bold">로그인</h1></div>
    <form onSubmit={handleSubmit} aria-busy={pending}>
      <fieldset disabled={pending} className="min-w-0 space-y-5">
        <div><label htmlFor="login-username" className="auth-label">아이디</label><input id="login-username" name="username" value={username} onChange={event => setUsername(event.target.value)} type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={255} placeholder="아이디" className="auth-input" /></div>
        <div><label htmlFor="login-password" className="auth-label">비밀번호</label><PasswordInput id="login-password" name="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" required placeholder="비밀번호" /></div>
        <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm text-slate-600"><input name="rememberMe" type="checkbox" checked={rememberMe} onChange={event => setRememberMe(event.target.checked)} className="h-4 w-4 rounded accent-emerald-700" /><span>자동 로그인</span><span className="ml-auto text-xs text-slate-400">30일 유지</span></label>
        {message ? <p role="alert" className="flex items-start gap-2 rounded-md bg-rose-50 p-3 text-sm leading-6 text-rose-800"><AlertCircle className="mt-1 h-4 w-4 shrink-0" />{message}</p> : null}
        <button type="submit" className="auth-submit">{pending ? <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <LogIn className="h-4 w-4" />}{pending ? '로그인 중...' : '로그인'}</button>
      </fieldset>
    </form>
    <div className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-6 text-sm"><span className="text-slate-500">아직 회원이 아니신가요?</span><Link href="/signup" className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-emerald-700 hover:text-emerald-900">동호회 가입<ArrowRight className="h-4 w-4" /></Link></div>
  </section>;
}
