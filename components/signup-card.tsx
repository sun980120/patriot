'use client';

import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import DaumPostcodeEmbed from 'react-daum-postcode';
import { signupAction } from '@/app/actions';
import { FloatingToast, type ToastTone } from '@/components/ui/floating-toast';

function formatPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);

  if (digits.length <= 3) {
    return digits;
  }

  if (digits.length <= 7) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }

  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export function SignupCard() {
  const [form, setForm] = useState({
    fullName: '',
    username: '',
    phoneNumber: '',
    address: '',
    birthDate: '',
    password: '',
  });

  const [detailAddress, setDetailAddress] = useState('');
  const [message, setMessage] = useState('');
  const [toastTone, setToastTone] = useState<ToastTone>('info');
  const [pending, setPending] = useState(false);
  const [openPostcode, setOpenPostcode] = useState(false);

  const handleSignup = async () => {
    setPending(true);
    setMessage('');

    const result = await signupAction({
      ...form,
      address: form.address,
      addressDetail: detailAddress,
    });

    setPending(false);

    setToastTone(result.ok ? 'success' : 'error');
    setMessage(result.message ?? '가입 신청에 실패했습니다.');

    if (result.ok) {
      setForm({
        fullName: '',
        username: '',
        phoneNumber: '',
        address: '',
        birthDate: '',
        password: '',
      });

      setDetailAddress('');
    }
  };

  return (
    <>
      <FloatingToast open={Boolean(message)} message={message} tone={toastTone} onClose={() => setMessage('')} />
      <div className="mx-auto max-w-xl rounded-[32px] bg-white/90 p-6 shadow-soft backdrop-blur">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand-700">
              Join
            </p>

            <h2 className="mt-2 text-3xl font-black text-slate-900">
              동호회 가입 신청
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              가입 후 관리자가 승인하면 통합 대시보드에서 회비 현황을 확인할 수 있습니다.
            </p>
          </div>

          <span className="rounded-full bg-brand-100 p-3 text-brand-700">
            <UserPlus className="h-5 w-5" />
          </span>
        </div>

        <div className="mt-6 space-y-3">
          <input
            value={form.fullName}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                fullName: event.target.value,
              }))
            }
            type="text"
            placeholder="이름"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand-400 focus:outline-none"
          />

        <input
          value={form.username}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              username: event.target.value,
            }))
          }
          type="text"
          placeholder="아이디"
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand-400 focus:outline-none"
        />

        <input
          value={form.phoneNumber}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              phoneNumber: formatPhoneNumber(event.target.value),
            }))
          }
          type="tel"
          inputMode="numeric"
          placeholder="전화번호"
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand-400 focus:outline-none"
        />

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setOpenPostcode(true)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            주소 검색
          </button>

          <input
            value={form.address}
            readOnly
            placeholder="주소 검색 버튼을 눌러주세요"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none"
          />

          <input
            value={detailAddress}
            onChange={(event) => setDetailAddress(event.target.value)}
            type="text"
            placeholder="상세 주소"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand-400 focus:outline-none"
          />

          {openPostcode ? (
            <div className="hidden" />
          ) : null}
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500">
            생년월일
          </label>

          <input
            value={form.birthDate}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                birthDate: event.target.value,
              }))
            }
            type="date"
            max={new Date().toISOString().split('T')[0]}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand-400 focus:outline-none"
          />
        </div>

        <input
          value={form.password}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              password: event.target.value,
            }))
          }
          type="password"
          placeholder="비밀번호"
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand-400 focus:outline-none"
        />

          <button
            onClick={handleSignup}
            disabled={pending}
            className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? '신청 중...' : '가입 신청'}
          </button>
        </div>
      </div>
      {openPostcode ? (
        <div className="fixed inset-0 z-[80] bg-black/40 px-4 py-6">
          <div className="mx-auto flex h-full max-w-xl flex-col overflow-hidden rounded-[28px] bg-white shadow-soft">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h3 className="text-base font-black text-slate-900">주소 검색</h3>
              <button
                type="button"
                onClick={() => setOpenPostcode(false)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600"
              >
                닫기
              </button>
            </div>
            <div className="min-h-0 flex-1 bg-white">
              <DaumPostcodeEmbed
                style={{ width: '100%', height: '100%' }}
                onComplete={(data) => {
                  setForm((current) => ({
                    ...current,
                    address: data.address,
                  }));

                  setOpenPostcode(false);
                }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
