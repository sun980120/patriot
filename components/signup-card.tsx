'use client';

import Link from 'next/link';
import { useRef, useState, type FormEvent } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, LoaderCircle, Search, ShieldCheck, UserPlus } from 'lucide-react';
import { useDaumPostcodePopup } from 'react-daum-postcode';
import { signupAction } from '@/app/actions';
import { PasswordInput } from '@/components/ui/password-input';
import { formatPhoneNumber, validateSignup } from '@/lib/auth-forms';

const emptyForm = { fullName: '', username: '', phoneNumber: '', address: '', birthDate: '', password: '', passwordConfirmation: '' };

export function SignupCard() {
  const openPostcodePopup = useDaumPostcodePopup();
  const [form, setForm] = useState(emptyForm);
  const [detailAddress, setDetailAddress] = useState('');
  const [error, setError] = useState<{ field: string; message: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [complete, setComplete] = useState(false);
  const submitting = useRef(false);
  const formElement = useRef<HTMLFormElement>(null);
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

  const update = (field: keyof typeof form, value: string) => {
    setForm(current => ({ ...current, [field]: value }));
    if (error?.field === field) setError(null);
  };
  const invalid = (field: string) => error?.field === field || undefined;
  const description = (field: string) => error?.field === field ? 'signup-error' : undefined;
  const handleSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting.current) return;
    const validation = validateSignup(form, today);
    if (validation) {
      setError(validation);
      formElement.current?.querySelector<HTMLElement>(validation.field === 'address' ? '[data-address-search]' : `[name="${validation.field}"]`)?.focus();
      return;
    }
    submitting.current = true; setPending(true); setError(null);
    try {
      const { passwordConfirmation: _confirmation, ...input } = form;
      const result = await signupAction({ ...input, fullName: input.fullName.trim(), username: input.username.trim(), addressDetail: detailAddress.trim() });
      if (!result.ok) { setError({ field: '', message: result.message ?? '가입 신청에 실패했습니다.' }); return; }
      setForm(emptyForm); setDetailAddress(''); setComplete(true);
    } catch { setError({ field: '', message: '서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.' }); }
    finally { submitting.current = false; setPending(false); }
  };
  const handleAddressSearch = async () => {
    try {
      await openPostcodePopup({
        onComplete: data => update('address', data.address),
        onError: () => setError({ field: 'address', message: '주소 검색을 열지 못했습니다. 다시 시도해 주세요.' }),
      });
    } catch { setError({ field: 'address', message: '주소 검색을 열지 못했습니다. 다시 시도해 주세요.' }); }
  };

  if (complete) return <section aria-label="가입 신청 완료" className="py-8" role="status">
    <CheckCircle2 className="mb-6 h-12 w-12 text-emerald-700" /><p className="mb-2 text-sm font-medium text-emerald-700">패트리어트 플로어볼 클럽</p><h1 className="text-2xl font-bold">가입 신청이 완료되었습니다</h1><p className="mt-4 text-sm leading-6 text-slate-500">관리자 승인을 기다리고 있습니다.</p><Link href="/login" className="auth-submit mt-8">로그인으로 돌아가기<ArrowRight className="h-4 w-4" /></Link>
  </section>;

  return <section aria-label="동호회 가입 신청">
    <header className="mb-8"><p className="mb-2 text-sm font-medium text-emerald-700">패트리어트 플로어볼 클럽</p><h1 className="text-2xl font-bold">동호회 가입</h1><p className="mt-3 inline-flex items-center gap-1.5 text-xs text-slate-500"><ShieldCheck className="h-4 w-4" />가입 승인 필요</p></header>
    <form ref={formElement} onSubmit={handleSignup} aria-busy={pending}>
      <fieldset disabled={pending} className="min-w-0 space-y-7">
        <section aria-labelledby="signup-account-title"><h2 id="signup-account-title" className="mb-4 text-base font-semibold">계정 정보</h2><div className="grid min-w-0 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><label htmlFor="signup-username" className="auth-label">아이디</label><input id="signup-username" name="username" value={form.username} onChange={event => update('username', event.target.value)} type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={255} aria-invalid={invalid('username')} aria-describedby={description('username')} className="auth-input" placeholder="로그인 아이디" /></div>
          <div><label htmlFor="signup-password" className="auth-label">비밀번호</label><PasswordInput id="signup-password" name="password" value={form.password} onChange={event => update('password', event.target.value)} autoComplete="new-password" required aria-invalid={invalid('password')} aria-describedby={description('password')} /></div>
          <div><label htmlFor="signup-confirmation" className="auth-label">비밀번호 확인</label><PasswordInput id="signup-confirmation" name="passwordConfirmation" label="비밀번호 확인" value={form.passwordConfirmation} onChange={event => update('passwordConfirmation', event.target.value)} autoComplete="new-password" required aria-invalid={invalid('passwordConfirmation')} aria-describedby={description('passwordConfirmation')} /></div>
        </div></section>
        <section aria-labelledby="signup-member-title" className="border-t border-slate-200 pt-6"><h2 id="signup-member-title" className="mb-4 text-base font-semibold">회원 정보</h2><div className="grid min-w-0 gap-4 sm:grid-cols-2">
          <div><label htmlFor="signup-name" className="auth-label">이름</label><input id="signup-name" name="fullName" value={form.fullName} onChange={event => update('fullName', event.target.value)} autoComplete="name" required maxLength={255} aria-invalid={invalid('fullName')} aria-describedby={description('fullName')} className="auth-input" /></div>
          <div><label htmlFor="signup-birth" className="auth-label">생년월일</label><input id="signup-birth" name="birthDate" value={form.birthDate} onChange={event => update('birthDate', event.target.value)} type="date" autoComplete="bday" required max={today} aria-invalid={invalid('birthDate')} aria-describedby={description('birthDate')} className="auth-input" /></div>
          <div className="sm:col-span-2"><label htmlFor="signup-phone" className="auth-label">전화번호</label><input id="signup-phone" name="phoneNumber" value={form.phoneNumber} onChange={event => update('phoneNumber', formatPhoneNumber(event.target.value))} type="tel" autoComplete="tel-national" inputMode="tel" required aria-invalid={invalid('phoneNumber')} aria-describedby={description('phoneNumber')} placeholder="010-0000-0000" className="auth-input" /></div>
          <div className="sm:col-span-2"><label htmlFor="signup-address" className="auth-label">주소</label><div className="flex min-w-0 items-start gap-2"><input id="signup-address" name="address" value={form.address} readOnly autoComplete="address-line1" aria-invalid={invalid('address')} aria-describedby={description('address')} placeholder="기본 주소" className="auth-input flex-1" /><button type="button" data-address-search onClick={handleAddressSearch} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-1.5 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"><Search className="h-4 w-4" />주소 검색</button></div></div>
          <div className="sm:col-span-2"><label htmlFor="signup-detail" className="auth-label">상세 주소 <span className="font-normal text-slate-400">(선택)</span></label><input id="signup-detail" name="addressDetail" value={detailAddress} onChange={event => setDetailAddress(event.target.value)} autoComplete="address-line2" maxLength={255} className="auth-input" /></div>
        </div></section>
        {error ? <p role="alert" id="signup-error" className="flex items-start gap-2 rounded-md bg-rose-50 p-3 text-sm leading-6 text-rose-800"><AlertCircle className="mt-1 h-4 w-4 shrink-0" />{error.message}</p> : null}
        <button type="submit" className="auth-submit">{pending ? <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <UserPlus className="h-4 w-4" />}{pending ? '가입 신청 중...' : '가입 신청'}</button>
      </fieldset>
    </form>
  </section>;
}
